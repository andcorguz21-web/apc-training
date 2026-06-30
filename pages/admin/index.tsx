import { useEffect, useState } from "react";
import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";

const colones = (n: number) => "₡" + (n || 0).toLocaleString("es-CR");
const hhmm = (t: string) => String(t).slice(0, 5);
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const monthStartISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; };

export default function Resumen() {
  const [s, setS] = useState({ pendAppr: 0, active: 0, pendPayCount: 0, pendPaySum: 0, revenue: 0 });
  const [today, setToday] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) return;
    (async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (session) { const { data: p } = await supabase!.from("profiles").select("full_name").eq("id", session.user.id).single(); setName((p?.full_name || "").split(" ")[0]); }
      const cnt = (q: any) => q.then((r: any) => r.count ?? 0);
      const cl = () => supabase!.from("profiles").select("id", { count: "exact", head: true }).eq("role", "client");
      const [pendAppr, active, pendPays, revPays, tc] = await Promise.all([
        cnt(cl().eq("approval_status", "pending")),
        cnt(cl().eq("approval_status", "approved")),
        supabase!.from("payments").select("amount_crc").eq("status", "pending"),
        supabase!.from("payments").select("amount_crc").eq("status", "verified").gte("verified_at", monthStartISO()),
        supabase!.from("class_sessions").select("start_time,end_time,booked_count,capacity").eq("status", "scheduled").eq("date", todayISO()).order("start_time"),
      ]);
      const pendPaySum = (pendPays.data ?? []).reduce((a: number, p: any) => a + p.amount_crc, 0);
      const revenue = (revPays.data ?? []).reduce((a: number, p: any) => a + p.amount_crc, 0);
      setS({ pendAppr, active, pendPayCount: (pendPays.data ?? []).length, pendPaySum, revenue });
      setToday(tc.data ?? []); setLoading(false);
    })();
  }, []);

  const tBooked = today.reduce((a, c) => a + c.booked_count, 0);
  const tCap = today.reduce((a, c) => a + c.capacity, 0);
  const hour = new Date().getHours();
  const saludo = hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const fecha = new Date().toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" });
  const mesActual = new Date().toLocaleDateString("es-CR", { month: "long" }).toUpperCase();

  return (
    <AdminLayout title="Resumen">
      {loading ? <p className="dim">Cargando…</p> : (
        <div className="dash">
          <p className="dash-hi">{saludo}{name ? `, ${name}` : ""} · {fecha}</p>

          {(s.pendAppr > 0 || s.pendPayCount > 0) && (
            <div className="dash-alert">
              <span><i className="dot" /> Tenés {s.pendAppr > 0 && <b>{s.pendAppr} cliente{s.pendAppr !== 1 ? "s" : ""} por aprobar</b>}{s.pendAppr > 0 && s.pendPayCount > 0 && " y "}{s.pendPayCount > 0 && <b>{s.pendPayCount} pago{s.pendPayCount !== 1 ? "s" : ""} por verificar</b>}.</span>
              <div className="dash-alert-a">
                {s.pendAppr > 0 && <Link href="/admin/clientes" className="btn btn-primary btn-sm">Aprobar</Link>}
                {s.pendPayCount > 0 && <Link href="/admin/pagos" className="btn btn-ghost btn-sm">Ver pagos</Link>}
              </div>
            </div>
          )}

          <section className="dash-grid">
            <div className="dash-hero">
              <span className="mono dim">INGRESOS · {mesActual}</span>
              <span className="dash-hero-n">{colones(s.revenue)}</span>
              <span className="dash-hero-s">verificado este mes</span>
              <Link href="/admin/pagos" className="dash-hero-link">Ver ingresos <span className="arr">→</span></Link>
              <i className="dash-hero-glow" aria-hidden />
            </div>

            <Link href="/admin/clientes" className={"dash-kpi" + (s.pendAppr > 0 ? " hot" : "")}>
              <span className="dash-kpi-n">{s.pendAppr}</span><span className="dash-kpi-l">Por aprobar</span>
            </Link>
            <Link href="/admin/pagos" className={"dash-kpi" + (s.pendPayCount > 0 ? " hot" : "")}>
              <span className="dash-kpi-n">{s.pendPayCount}</span><span className="dash-kpi-l">Pagos por verificar</span>
              {s.pendPaySum > 0 && <span className="dash-kpi-sub">{colones(s.pendPaySum)} en espera</span>}
            </Link>
            <div className="dash-kpi">
              <span className="dash-kpi-n">{s.active}</span><span className="dash-kpi-l">Clientes activos</span>
            </div>
          </section>

          <section className="dash-today">
            <div className="dash-today-h"><h2>Hoy</h2><Link href="/admin/agenda" className="dash-lnk">Ver agenda →</Link></div>
            {today.length === 0 ? <p className="dim">No hay clases programadas hoy.</p> : (
              <>
                <p className="dash-occ"><b>{tBooked}</b> de {tCap} cupos reservados</p>
                <div className="dash-classes">
                  {today.map((c, i) => {
                    const r = c.capacity ? c.booked_count / c.capacity : 0;
                    const col = r >= 1 ? "var(--danger)" : r >= 0.6 ? "var(--amber)" : "var(--primary)";
                    return (
                      <div className="dash-cls" key={i}>
                        <span className="dash-cls-t">{hhmm(c.start_time)}–{hhmm(c.end_time)}</span>
                        <div className="dash-cls-bar"><i style={{ width: `${Math.min(100, r * 100)}%`, background: col }} /></div>
                        <span className="dash-cls-n" style={{ color: col }}>{c.booked_count}/{c.capacity}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </section>

          <section className="dash-quick">
            {[["/admin/reservar", "Crear reserva"], ["/admin/agenda", "Agenda"], ["/admin/clientes", "Clientes"], ["/admin/horarios", "Horarios"], ["/admin/pagos", "Pagos"]].map(([h, l]) => (
              <Link key={h} href={h} className="dash-q">{l} <span className="arr">→</span></Link>
            ))}
          </section>

          <style>{CSS}</style>
        </div>
      )}
    </AdminLayout>
  );
}

const CSS = `
.dim{color:var(--muted)}.arr{display:inline-block;transition:transform .25s}
.mono{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.16em;text-transform:uppercase;font-size:11px}
.dash{display:flex;flex-direction:column;gap:18px;margin-top:-10px}
.dash-hi{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:11px;letter-spacing:.06em;color:var(--muted);text-transform:capitalize}
.dash-alert{display:flex;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;background:rgba(212,160,23,.1);border:1px solid rgba(212,160,23,.4);border-radius:var(--r-lg);padding:14px 18px;font-size:14px}
.dash-alert .dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--amber);margin-right:8px;vertical-align:middle}
.dash-alert b{color:var(--ink)}
.dash-alert-a{display:flex;gap:8px}
.dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.dash-hero{position:relative;overflow:hidden;grid-column:1/-1;display:flex;flex-direction:column;gap:5px;background:var(--surface);border:1px solid color-mix(in srgb,var(--primary) 35%,var(--line));border-radius:var(--r-lg);padding:24px}
.dash-hero-n{font-family:var(--fd,'Archivo');font-weight:900;font-size:clamp(40px,8vw,60px);line-height:1;letter-spacing:-.02em;color:var(--primary);margin-top:4px}
.dash-hero-s{font-size:13px;color:var(--muted)}
.dash-hero-link{display:inline-flex;align-items:center;gap:7px;color:var(--ink);font-weight:600;font-size:13.5px;margin-top:10px;text-decoration:none;align-self:flex-start}
.dash-hero-link:hover .arr{transform:translateX(4px)}
.dash-hero-glow{position:absolute;top:-40%;right:-10%;width:50%;height:180%;background:radial-gradient(circle,var(--primary) 0%,transparent 65%);opacity:.13;pointer-events:none}
.dash-kpi{display:flex;flex-direction:column;gap:5px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:18px;text-decoration:none;transition:border-color .2s,transform .15s}
a.dash-kpi:hover{border-color:var(--line-2);transform:translateY(-2px)}
.dash-kpi.hot{border-color:var(--primary)}
.dash-kpi-n{font-family:var(--fd,'Archivo');font-weight:900;font-size:34px;line-height:1;letter-spacing:-.02em;color:var(--ink)}
.dash-kpi-l{font-size:13px;color:var(--muted)}
.dash-kpi-sub{font-size:11.5px;color:var(--amber);font-weight:600}
.dash-today{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:22px}
.dash-today-h{display:flex;align-items:center;justify-content:space-between;margin-bottom:6px}
.dash-today-h h2{font-family:var(--fd,'Archivo');font-weight:900;font-size:20px}
.dash-lnk{color:var(--primary);font-size:13px;font-weight:600;text-decoration:none}
.dash-occ{color:var(--muted);font-size:14px;margin-bottom:16px}.dash-occ b{color:var(--ink);font-weight:700}
.dash-classes{display:flex;flex-direction:column;gap:10px}
.dash-cls{display:flex;align-items:center;gap:14px}
.dash-cls-t{font-family:var(--fd,'Archivo');font-weight:700;font-size:14px;min-width:108px}
.dash-cls-bar{flex:1;height:8px;border-radius:4px;background:rgba(236,234,227,.1);overflow:hidden}
.dash-cls-bar i{display:block;height:100%;border-radius:4px;transition:width .5s}
.dash-cls-n{font-weight:700;font-size:13px;min-width:42px;text-align:right}
.dash-quick{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.dash-q{display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;font-weight:600;font-size:14px;text-decoration:none;color:var(--ink);transition:border-color .2s,color .2s}
.dash-q:hover{border-color:var(--primary);color:var(--primary)}
.dash-q .arr{color:var(--primary)}
@media(min-width:760px){.dash-grid{grid-template-columns:repeat(3,1fr)}.dash-hero{grid-column:1/-1}.dash-quick{grid-template-columns:repeat(4,1fr)}}
`;