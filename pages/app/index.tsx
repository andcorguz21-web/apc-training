import { useEffect, useMemo, useState, useCallback } from "react";
import ClientLayout, { useClient } from "@/components/ClientLayout";
import { supabase } from "@/lib/supabase";

type Cls = { id: string; date: string; start_time: string; end_time: string; capacity: number; booked_count: number };
type Bk = { id: string; class_session_id: string; status: string };
type Mem = { id: string; start_date: string; end_date: string };

const hhmm = (t: string) => String(t).slice(0, 5);
const localISO = (n = 0) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const noon = (d: string) => new Date(d + "T12:00:00");
const dayFull = (d: string) => noon(d).toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "long" });

// Horas que NO se muestran en el calendario del cliente (11am, 12pm, 1pm, 2pm)
const HIDDEN_HOURS = ["11", "12", "13", "14"];

function mapError(msg: string) {
  const m = msg.toUpperCase();
  if (m.includes("CLASS_FULL")) return "Esa clase ya se llenó.";
  if (m.includes("NO_ACTIVE_MEMBERSHIP")) return "Tu mensualidad no cubre esa fecha.";
  if (m.includes("DUPLICATE")) return "Ya estás anotado en esa clase.";
  return "No se pudo reservar. Intentá de nuevo.";
}

export default function ReservarPage() {
  return <ClientLayout><Reservar /></ClientLayout>;
}

function Reservar() {
  const { profile, tenantId } = useClient();
  const [classes, setClasses] = useState<Cls[]>([]);
  const [myBk, setMyBk] = useState<Record<string, Bk>>({});
  const [mems, setMems] = useState<Mem[]>([]);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const days = useMemo(() => Array.from({ length: 8 }, (_, i) => localISO(i)), []);
  const byDay = useMemo(() => { const m: Record<string, Cls[]> = {}; classes.forEach((c) => (m[c.date] ||= []).push(c)); return m; }, [classes]);

  const loadAll = useCallback(async (tid: string) => {
    if (!supabase || !tid) return;
    const { data: { user } } = await supabase.auth.getUser();
    const uid = user?.id;
    const [cls, bk, mm] = await Promise.all([
      supabase.from("class_sessions").select("id, date, start_time, end_time, capacity, booked_count")
        .eq("tenant_id", tid).eq("status", "scheduled").gte("date", localISO(0)).lte("date", localISO(7)).order("date").order("start_time"),
      supabase.from("bookings").select("id, class_session_id, status")
        .eq("profile_id", uid).in("status", ["pending", "confirmed", "attended"]),
      supabase.from("memberships").select("id, start_date, end_date").eq("status", "active"),
    ]);
    const visible = ((cls.data as Cls[]) ?? []).filter((c) => !HIDDEN_HOURS.includes(String(c.start_time).slice(0, 2)));
    setClasses(visible);
    const map: Record<string, Bk> = {}; ((bk.data as Bk[]) ?? []).forEach((b) => (map[b.class_session_id] = b)); setMyBk(map);
    setMems((mm.data as Mem[]) ?? []);
  }, []);

  useEffect(() => { loadAll(tenantId); }, [tenantId, loadAll]);
  useEffect(() => { if (!selected && classes.length) setSelected(days.find((d) => byDay[d]?.length) || days[0]); }, [classes, byDay, days, selected]);

  async function reservar(c: Cls) {
    if (!supabase) return; setMsg(""); setBusy(c.id);
    const mem = mems.find((m) => m.start_date <= c.date && c.date <= m.end_date);
    const args = mem ? { p_class_session_id: c.id, p_payment_kind: "membership", p_membership_id: mem.id } : { p_class_session_id: c.id, p_payment_kind: "drop_in", p_membership_id: null };
    const { error } = await supabase.rpc("create_booking", args); setBusy("");
    if (error) { setMsg(mapError(error.message)); return; } await loadAll(tenantId);
  }
  async function cancelar(id: string) {
    if (!supabase) return; setBusy(id);
    const { error } = await supabase.rpc("cancel_my_booking", { p_booking_id: id });
    setBusy("");
    if (error) { setMsg("No se pudo cancelar. Reintentá."); return; }
    await loadAll(tenantId);
  }

  const list = byDay[selected] || [];
  return (
    <div className="container">
      <div className="hero">
        <p className="eyebrow">Hola, {profile?.full_name?.split(" ")[0] || "atleta"}</p>
        <h1 className="hero-h">Reservá<br />tu clase</h1>
        <p className="hero-sub">Mensualidad activa = confirmás al instante. Sesión suelta (₡5.000) = pendiente hasta verificar el pago.</p>
      </div>
      <div className="daystrip">
        {days.map((d) => (
          <button key={d} className={"daychip" + (byDay[d]?.length ? " has" : "") + (d === selected ? " sel" : "")} onClick={() => setSelected(d)}>
            <span className="dw">{d === localISO(0) ? "Hoy" : noon(d).toLocaleDateString("es-CR", { weekday: "short" }).replace(".", "")}</span>
            <span className="dn">{noon(d).getDate()}</span><span className="dot2" />
          </button>
        ))}
      </div>
      {msg && <div className="banner">{msg}</div>}
      <h2 className="daytitle">{selected ? dayFull(selected) : ""}</h2>
      {list.length === 0 ? <p className="empty">No hay clases programadas este día.</p> : (
        <div className="grid">
          {list.map((c, i) => {
            const mine = myBk[c.id]; const left = c.capacity - c.booked_count; const full = left <= 0;
            return (
              <article key={c.id} className={"cls" + (mine ? " is-mine" : full ? " is-full" : "")} style={{ animationDelay: `${i * 0.03}s` }}>
                <div className="cls-time"><span className="cls-h">{hhmm(c.start_time)}</span><span className="cls-range">a {hhmm(c.end_time)}</span></div>
                <div className="cls-mid">
                  <div className="segs">{Array.from({ length: c.capacity }, (_, k) => <span key={k} className={"seg" + (k < c.booked_count ? " on" : "")} />)}</div>
                  <span className="cls-left">{mine ? "Estás dentro" : full ? "Clase llena" : `${left} de ${c.capacity} libres`}</span>
                </div>
                <div className="cls-act">
                  {mine ? (<><span className="st" style={{ color: mine.status === "confirmed" ? "var(--primary)" : "var(--amber)" }}>{mine.status === "confirmed" ? "Confirmada" : "Pendiente"}</span><button className="btn btn-ghost btn-sm" disabled={busy === mine.id} onClick={() => cancelar(mine.id)}>Cancelar</button></>)
                    : full ? <span className="pill" style={{ color: "var(--danger)", borderColor: "var(--danger)" }}>Lleno</span>
                    : <button className="btn btn-primary" disabled={busy === c.id} onClick={() => reservar(c)}>{busy === c.id ? "…" : "Reservar"}</button>}
                </div>
              </article>
            );
          })}
        </div>
      )}
      <style>{`
        .hero{padding:30px 0 6px}
        .hero-h{font-family:var(--fd);font-weight:900;font-size:clamp(40px,12vw,68px);line-height:.86;letter-spacing:-.035em;margin:12px 0}
        .eyebrow{font-size:12px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--primary)}
        .hero-sub{color:var(--muted);font-size:14.5px;line-height:1.55;max-width:520px}
        .daystrip{display:flex;gap:8px;overflow-x:auto;padding:22px 0 14px;scrollbar-width:none}
        .daystrip::-webkit-scrollbar{display:none}
        .daychip{flex:0 0 auto;min-width:62px;display:flex;flex-direction:column;align-items:center;gap:4px;padding:11px 12px;border:1px solid var(--line);border-radius:14px;background:var(--surface);cursor:pointer;transition:.2s}
        .daychip:hover{border-color:var(--line-2)}
        .daychip .dw{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
        .daychip .dn{font-family:var(--fd);font-weight:900;font-size:20px}
        .daychip .dot2{width:5px;height:5px;border-radius:50%;background:var(--primary);opacity:0}
        .daychip.has .dot2{opacity:1}
        .daychip.sel{background:var(--primary);border-color:var(--primary)}
        .daychip.sel .dw,.daychip.sel .dn{color:var(--primary-ink)}.daychip.sel .dot2{background:var(--primary-ink)}
        .daytitle{font-size:14px;font-weight:700;letter-spacing:.03em;text-transform:capitalize;color:var(--muted);margin:6px 0 14px}
        .banner{background:rgba(212,160,23,.12);border:1px solid rgba(212,160,23,.4);color:#e9cf8f;border-radius:10px;padding:11px 14px;font-size:14px;margin:6px 0 16px}
        .grid{display:grid;grid-template-columns:1fr;gap:10px;padding-bottom:24px}
        @media(min-width:680px){.grid{grid-template-columns:1fr 1fr}}
        .cls{display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:16px 18px;opacity:0;animation:rise .45s forwards}
        .cls.is-mine{border-color:rgba(22,163,74,.5);box-shadow:inset 3px 0 0 var(--primary)}
        .cls.is-full{opacity:.5}
        .cls-time{display:flex;flex-direction:column;min-width:88px}
        .cls-h{font-family:var(--fd);font-weight:900;font-size:24px;letter-spacing:-.02em}
        .cls-range{font-size:12px;color:var(--faint)}
        .cls-mid{display:flex;flex-direction:column;gap:8px;flex:1;min-width:130px}
        .segs{display:flex;gap:4px}.seg{flex:1;height:6px;border-radius:3px;background:rgba(236,234,227,.14)}.seg.on{background:var(--primary)}
        .cls-left{font-size:12.5px;color:var(--muted)}
        .cls-act{display:flex;align-items:center;gap:10px;width:100%}.cls-act .btn{flex:1}
        @media(min-width:680px){.cls-act{width:auto;margin-left:auto}.cls-act .btn{flex:none}}
        .st{font-size:13px;font-weight:700}.empty{text-align:center;color:var(--muted);padding:48px 0}
      `}</style>
    </div>
  );
}