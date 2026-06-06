import { useEffect, useState, useCallback } from "react";
import ClientLayout, { useClient } from "@/components/ClientLayout";
import { supabase } from "@/lib/supabase";

const hhmm = (t: string) => String(t).slice(0, 5);
const noon = (d: string) => new Date(d + "T12:00:00");
const colones = (n: number) => "₡" + (n || 0).toLocaleString("es-CR");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const diasRest = (end: string) => Math.max(0, Math.ceil((noon(end).getTime() - noon(today()).getTime()) / 86400000));
const sanitize = (n: string) => n.replace(/[^\w.\-]/g, "_");
function mapErr(msg: string) {
  const m = (msg || "").toUpperCase();
  if (m.includes("ALREADY_PENDING")) return "Ya tenés una mensualidad en revisión. Esperá a que el coach la verifique.";
  if (m.includes("PLAN_INACTIVE")) return "Ese plan ya no está disponible.";
  return "No se pudo registrar. Intentá de nuevo.";
}
function mapPartnerErr(msg: string) {
  const m = (msg || "").toUpperCase();
  if (m.includes("USER_NOT_FOUND")) return "No existe una cuenta con ese correo. Tu pareja debe registrarse primero en la app.";
  if (m.includes("NOT_APPROVED_CLIENT")) return "Esa persona aún no fue aprobada por el coach.";
  if (m.includes("MEMBERSHIP_FULL")) return "La mensualidad pareja ya tiene sus 2 personas.";
  if (m.includes("ALREADY_MEMBER")) return "Esa persona ya está en la mensualidad.";
  if (m.includes("NOT_SHARED_PLAN")) return "Este plan es individual.";
  return "No se pudo agregar. Intentá de nuevo.";
}

export default function PagosPage() { return <ClientLayout><Pagos /></ClientLayout>; }

function Pagos() {
  const { tenantId } = useClient();
  const [sinpe, setSinpe] = useState<{ n?: string; name?: string }>({});
  const [dropPlan, setDropPlan] = useState<{ id: string; price: number } | null>(null);
  const [memPlans, setMemPlans] = useState<any[]>([]);
  const [myMems, setMyMems] = useState<any[]>([]);
  const [roster, setRoster] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [refs, setRefs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  // compra de mensualidad
  const [buyOpen, setBuyOpen] = useState("");
  const [buyFile, setBuyFile] = useState<File | null>(null);
  const [buyRef, setBuyRef] = useState("");
  const [buying, setBuying] = useState(false);
  // agregar pareja
  const [addEmail, setAddEmail] = useState("");
  const [addingPartner, setAddingPartner] = useState(false);

  const load = useCallback(async (tid: string) => {
    if (!supabase || !tid) return;
    const [tn, dp, mp, mm, bk, pay] = await Promise.all([
      supabase.from("tenants").select("sinpe_number, sinpe_name").eq("id", tid).single(),
      supabase.from("plans").select("id, price_crc").eq("tenant_id", tid).eq("type", "drop_in").eq("active", true).limit(1),
      supabase.from("plans").select("id, name, price_crc, max_members").eq("tenant_id", tid).eq("type", "membership").eq("active", true).order("price_crc"),
      supabase.from("memberships").select("id, status, start_date, end_date, plans ( name, max_members )").in("status", ["active", "pending"]).order("created_at", { ascending: false }),
      supabase.from("bookings").select("id, status, payment_kind, class_sessions ( date, start_time, end_time ), payments ( id, status )").eq("payment_kind", "drop_in"),
      supabase.from("payments").select("id, amount_crc, status, created_at, membership_id").order("created_at", { ascending: false }),
    ]);
    setSinpe({ n: tn.data?.sinpe_number, name: tn.data?.sinpe_name });
    if (dp.data?.[0]) setDropPlan({ id: dp.data[0].id, price: dp.data[0].price_crc });
    setMemPlans(mp.data ?? []);
    const mems = mm.data ?? [];
    setMyMems(mems);
    setBookings(bk.data ?? []);
    setPayments(pay.data ?? []);
    const shared = mems.find((m: any) => (m.plans?.max_members || 1) > 1);
    if (shared) { const r = await supabase.rpc("membership_roster", { p_membership_id: shared.id }); setRoster(r.data ?? []); }
    else setRoster([]);
  }, []);
  useEffect(() => { load(tenantId); }, [tenantId, load]);

  const activeMem = myMems.find((m) => m.status === "active");
  const pendingMem = myMems.find((m) => m.status === "pending");
  const mem = activeMem || pendingMem;
  const sharedMem = mem && (mem.plans?.max_members || 1) > 1 ? mem : null;

  async function comprar(p: any) {
    if (!supabase) return;
    if (!buyFile) { setMsg("Elegí la imagen del comprobante SINPE."); return; }
    setMsg(""); setBuying(true);
    try {
      const uid = (await supabase.auth.getSession()).data.session?.user.id;
      const path = `${uid}/mem-${Date.now()}-${sanitize(buyFile.name)}`;
      const up = await supabase.storage.from("payment-proofs").upload(path, buyFile);
      if (up.error) { setMsg("No se pudo subir la imagen: " + up.error.message); return; }
      const { error } = await supabase.rpc("request_membership", { p_plan_id: p.id, p_method: "sinpe", p_ref_last4: (buyRef || "").slice(0, 4) || null, p_proof_url: path });
      if (error) { setMsg(mapErr(error.message)); return; }
      setBuyOpen(""); setBuyFile(null); setBuyRef("");
      await load(tenantId);
    } finally { setBuying(false); }
  }

  async function addPartner() {
    if (!supabase || !sharedMem) return;
    if (!addEmail.trim()) { setMsg("Escribí el correo de tu pareja."); return; }
    setMsg(""); setAddingPartner(true);
    try {
      const { data, error } = await supabase.rpc("add_membership_partner", { p_membership_id: sharedMem.id, p_email: addEmail.trim() });
      if (error) { setMsg(mapPartnerErr(error.message)); return; }
      setAddEmail("");
      setMsg(`Listo, agregaste a ${data}.`);
      await load(tenantId);
    } finally { setAddingPartner(false); }
  }

  const t = today();
  const pendientes = bookings.filter((b) => {
    if (b.status !== "pending") return false;
    const hasActive = (b.payments || []).some((p: any) => p.status === "pending" || p.status === "verified");
    return !hasActive && b.class_sessions?.date >= t;
  });

  async function enviar(b: any) {
    if (!supabase || !dropPlan) return;
    const file = files[b.id];
    if (!file) { setMsg("Elegí la imagen del comprobante."); return; }
    setMsg(""); setBusy(b.id);
    try {
      const uid = (await supabase.auth.getSession()).data.session?.user.id;
      const path = `${uid}/${Date.now()}-${sanitize(file.name)}`;
      const up = await supabase.storage.from("payment-proofs").upload(path, file);
      if (up.error) { setMsg("No se pudo subir la imagen: " + up.error.message); return; }
      const ins = await supabase.from("payments").insert({
        tenant_id: tenantId, profile_id: uid, plan_id: dropPlan.id, booking_id: b.id,
        amount_crc: dropPlan.price, sinpe_ref_last4: (refs[b.id] || "").slice(0, 4) || null,
        proof_url: path, status: "pending",
      });
      if (ins.error) { setMsg("Error registrando el pago: " + ins.error.message); return; }
      await load(tenantId);
    } finally { setBusy(""); }
  }

  const inReview = payments.filter((p) => p.status === "pending");
  const history = payments.filter((p) => p.status !== "pending");
  const ok = msg.startsWith("Listo");
  const maxMem = sharedMem?.plans?.max_members || 2;

  return (
    <div className="container" style={{ paddingTop: 30 }}>
      <h1 className="ttl">Pagos</h1>

      {/* Estado de membresía */}
      {mem && (
        <div className={"mem " + (activeMem ? "on" : "pend")}>
          <span className="mem-l">Tu mensualidad</span>
          <span className="mem-plan">{mem.plans?.name || "Mensualidad"}</span>
          <span className="mem-meta">
            {activeMem
              ? `Activa · vence ${noon(mem.end_date).toLocaleDateString("es-CR", { day: "numeric", month: "long" })} · ${diasRest(mem.end_date)} día${diasRest(mem.end_date) !== 1 ? "s" : ""}`
              : "En revisión — el coach la verifica y queda activa."}
          </span>

          {/* Beneficiarios (solo plan pareja) */}
          {sharedMem && (
            <div className="roster">
              <span className="roster-l">Personas ({roster.length}/{maxMem})</span>
              <div className="roster-list">
                {roster.map((r) => <span className="person" key={r.profile_id}>{r.full_name || "—"}</span>)}
              </div>
              {roster.length < maxMem && (
                <div className="addp">
                  <input className="input" type="email" placeholder="Correo de tu pareja" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
                  <button className="btn btn-primary btn-sm" disabled={addingPartner} onClick={addPartner}>{addingPartner ? "…" : "Agregar"}</button>
                </div>
              )}
              {roster.length < maxMem && <span className="addp-h">Tu pareja debe estar registrada y aprobada por el coach.</span>}
            </div>
          )}
        </div>
      )}

      {/* SINPE */}
      <div className="sinpe">
        <span className="sinpe-l">Hacé SINPE Móvil a</span>
        <span className="sinpe-n">{sinpe.n || "número por configurar"}</span>
        {sinpe.name && <span className="sinpe-name">{sinpe.name}</span>}
        <span className="sinpe-h">Luego subí el comprobante de la mensualidad o de cada sesión.</span>
      </div>

      {msg && <div className={"banner" + (ok ? " ok" : "")}>{msg}</div>}

      {/* Comprar mensualidad */}
      {!pendingMem && (
        <>
          <h2 className="sec">{activeMem ? "Renovar mensualidad" : "Comprar mensualidad"}</h2>
          <div className="plans">
            {memPlans.map((p) => (
              <div className={"plan" + (buyOpen === p.id ? " open" : "")} key={p.id}>
                <div className="plan-top">
                  <div className="plan-info">
                    <span className="plan-name">{p.name}</span>
                    <span className="plan-sub">{p.max_members > 1 ? `Hasta ${p.max_members} personas` : "1 persona"} · mensual</span>
                  </div>
                  <span className="plan-price">{colones(p.price_crc)}</span>
                </div>
                {buyOpen === p.id ? (
                  <div className="buy">
                    <p className="buy-h">Hacé el SINPE por {colones(p.price_crc)} y subí el comprobante:</p>
                    <div className="buy-form">
                      <label className="file">
                        <input type="file" accept="image/*" onChange={(e) => setBuyFile(e.target.files?.[0] || null)} />
                        <span>{buyFile ? buyFile.name : "Elegir comprobante"}</span>
                      </label>
                      <input className="input ref" placeholder="Ref (4 díg.)" maxLength={4} value={buyRef} onChange={(e) => setBuyRef(e.target.value.replace(/\D/g, ""))} />
                    </div>
                    <div className="buy-acts">
                      <button className="btn btn-primary" disabled={buying} onClick={() => comprar(p)}>{buying ? "Enviando…" : "Enviar comprobante"}</button>
                      <button className="btn btn-ghost btn-sm" disabled={buying} onClick={() => { setBuyOpen(""); setBuyFile(null); setBuyRef(""); }}>Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button className="btn btn-primary" onClick={() => { setBuyOpen(p.id); setBuyFile(null); setBuyRef(""); setMsg(""); }}>{activeMem ? "Renovar" : "Comprar"}</button>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sesiones sueltas por pagar */}
      <h2 className="sec">Sesiones por pagar</h2>
      {pendientes.length === 0 && <p className="empty">No tenés sesiones pendientes de pago.</p>}
      {pendientes.map((b) => (
        <div className="pcard" key={b.id}>
          <div className="pc-top">
            <span className="pc-d">{b.class_sessions ? noon(b.class_sessions.date).toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "short" }) : "—"} · {b.class_sessions ? hhmm(b.class_sessions.start_time) : ""}</span>
            <span className="pc-amt">{dropPlan ? colones(dropPlan.price) : ""}</span>
          </div>
          <div className="pc-form">
            <label className="file">
              <input type="file" accept="image/*" onChange={(e) => setFiles((f) => ({ ...f, [b.id]: e.target.files?.[0] || null }))} />
              <span>{files[b.id] ? files[b.id]!.name : "Elegir comprobante"}</span>
            </label>
            <input className="input ref" placeholder="Ref (4 díg.)" maxLength={4} value={refs[b.id] || ""} onChange={(e) => setRefs((r) => ({ ...r, [b.id]: e.target.value.replace(/\D/g, "") }))} />
            <button className="btn btn-primary" disabled={busy === b.id} onClick={() => enviar(b)}>{busy === b.id ? "Enviando…" : "Enviar"}</button>
          </div>
        </div>
      ))}

      {/* En revisión */}
      <h2 className="sec">En revisión</h2>
      {inReview.length === 0 && <p className="empty">Nada en revisión.</p>}
      {inReview.map((p) => (
        <div className="rv" key={p.id}>
          <span className="rv-d">{colones(p.amount_crc)}{p.membership_id ? " · Mensualidad" : " · Sesión"}</span>
          <span className="st" style={{ color: "var(--amber)" }}>En revisión</span>
        </div>
      ))}

      {/* Historial */}
      <h2 className="sec">Historial</h2>
      {history.length === 0 && <p className="empty">Sin pagos anteriores.</p>}
      {history.map((p) => (
        <div className="rv" key={p.id}>
          <span className="rv-d">{colones(p.amount_crc)}{p.membership_id ? " · Mensualidad" : " · Sesión"} · {new Date(p.created_at).toLocaleDateString("es-CR")}</span>
          <span className="st" style={{ color: p.status === "verified" ? "var(--primary)" : "var(--danger)" }}>{p.status === "verified" ? "Verificado" : "Rechazado"}</span>
        </div>
      ))}

      <style>{`
        .ttl{font-family:var(--fd);font-weight:900;font-size:clamp(32px,9vw,48px);letter-spacing:-.02em}
        .mem{display:flex;flex-direction:column;gap:3px;border-radius:var(--r-lg);padding:18px;margin-top:18px;border:1px solid var(--line);background:var(--surface)}
        .mem.on{border-color:rgba(22,163,74,.5);box-shadow:inset 3px 0 0 var(--primary)}
        .mem.pend{border-color:rgba(212,160,23,.45);box-shadow:inset 3px 0 0 var(--amber)}
        .mem-l{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
        .mem-plan{font-family:var(--fd);font-weight:900;font-size:22px;letter-spacing:-.01em}
        .mem-meta{font-size:13.5px;color:var(--muted)}
        .roster{display:flex;flex-direction:column;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid var(--line)}
        .roster-l{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
        .roster-list{display:flex;flex-wrap:wrap;gap:8px}
        .person{background:rgba(236,234,227,.06);border:1px solid var(--line);border-radius:999px;padding:6px 13px;font-size:13.5px;font-weight:600}
        .addp{display:flex;gap:8px;align-items:center;margin-top:4px}
        .addp .input{flex:1}
        .addp-h{font-size:12px;color:var(--faint)}
        .sinpe{display:flex;flex-direction:column;gap:3px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:18px;margin-top:14px}
        .sinpe-l{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}
        .sinpe-n{font-family:var(--fd);font-weight:900;font-size:26px;letter-spacing:-.01em;color:var(--primary)}
        .sinpe-name{font-size:14px}
        .sinpe-h{font-size:13px;color:var(--muted);margin-top:6px}
        .banner{background:rgba(212,160,23,.12);border:1px solid rgba(212,160,23,.4);color:#e9cf8f;border-radius:10px;padding:11px 14px;font-size:14px;margin-top:14px}
        .banner.ok{background:rgba(22,163,74,.12);border-color:rgba(22,163,74,.4);color:#86e0a3}
        .sec{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--primary);margin:28px 0 12px}
        .plans{display:grid;grid-template-columns:1fr;gap:10px}
        @media(min-width:680px){.plans{grid-template-columns:1fr 1fr}.plan.open{grid-column:1/-1}}
        .plan{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:16px;display:flex;flex-direction:column;gap:14px}
        .plan-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
        .plan-info{display:flex;flex-direction:column;gap:3px}
        .plan-name{font-weight:800;font-size:16px}
        .plan-sub{font-size:12.5px;color:var(--muted)}
        .plan-price{font-family:var(--fd);font-weight:900;font-size:22px;color:var(--primary);white-space:nowrap}
        .buy{display:flex;flex-direction:column;gap:12px}
        .buy-h{font-size:13.5px;color:var(--muted)}
        .buy-form{display:flex;gap:10px;flex-wrap:wrap}
        .buy-acts{display:flex;gap:10px;align-items:center}
        .pcard{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:16px;margin-bottom:10px}
        .pc-top{display:flex;justify-content:space-between;align-items:baseline;gap:12px;margin-bottom:14px}
        .pc-d{font-weight:700;font-size:15px;text-transform:capitalize}
        .pc-amt{font-family:var(--fd);font-weight:900;font-size:20px;color:var(--primary)}
        .pc-form{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
        .file{flex:1;min-width:160px;position:relative;overflow:hidden;border:1px dashed var(--line-2);border-radius:var(--r-sm);padding:12px 14px;font-size:14px;color:var(--muted);cursor:pointer;white-space:nowrap;text-overflow:ellipsis}
        .file input{position:absolute;inset:0;opacity:0;cursor:pointer}
        .ref{width:118px;flex:0 0 auto}
        .rv{display:flex;align-items:center;justify-content:space-between;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:13px 16px;margin-bottom:8px}
        .rv-d{font-weight:600;font-size:14px}
        .st{font-size:13px;font-weight:700}
        .empty{color:var(--muted);font-size:14px}
      `}</style>
    </div>
  );
}