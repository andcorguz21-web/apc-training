import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";

const colones = (n: number) => "₡" + (n || 0).toLocaleString("es-CR");
const fecha = (d: string) => new Date(d).toLocaleDateString("es-CR", { day: "numeric", month: "short", year: "numeric" });
const csvCell = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const metodo = (m: string) => m === "sinpe" ? "SINPE" : m === "cash" ? "Efectivo" : m === "card" ? "Tarjeta" : m || "—";
const concepto = (p: any) => p.plans?.name ? p.plans.name : p.booking_id ? "Sesión suelta" : "Pago";

export default function Pagos() {
  const [tab, setTab] = useState<"verificar" | "ingresos">("verificar");

  // --- por verificar ---
  const [pend, setPend] = useState<any[]>([]);
  const [busy, setBusy] = useState("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const loadPend = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("payments")
      .select("id, amount_crc, method, sinpe_ref_last4, proof_url, created_at, booking_id, plan_id, profiles!payments_profile_id_fkey ( full_name, phone ), plans ( name )")
      .eq("status", "pending").order("created_at", { ascending: true });
    setPend(data ?? []);
  }, []);
  useEffect(() => { loadPend(); }, [loadPend]);

  async function verVoucher(path: string) {
    if (!supabase || !path) return;
    const { data } = await supabase.storage.from("payment-proofs").createSignedUrl(path, 120);
    if (data?.signedUrl) setLightbox(data.signedUrl);
  }
  async function aprobar(id: string) {
    if (!supabase) return; setBusy(id);
    const { error } = await supabase.rpc("verify_payment", { p_payment_id: id });
    setBusy("");
    if (error) { alert("Error: " + error.message); return; }
    await loadPend();
  }
  async function rechazar(id: string) {
    if (!supabase || !confirm("¿Rechazar este pago?")) return; setBusy(id);
    await supabase.from("payments").update({ status: "rejected" }).eq("id", id);
    setBusy(""); await loadPend();
  }

  // --- ingresos por mes ---
  const now = new Date();
  const [month, setMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [inc, setInc] = useState<any[]>([]);
  const isCurrent = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth();

  const loadInc = useCallback(async (m: Date) => {
    if (!supabase) return;
    const start = new Date(m.getFullYear(), m.getMonth(), 1);
    const end = new Date(m.getFullYear(), m.getMonth() + 1, 1);
    const { data } = await supabase.from("payments")
      .select("id, amount_crc, method, verified_at, booking_id, plan_id, profiles!payments_profile_id_fkey ( full_name ), plans ( name )")
      .eq("status", "verified").gte("verified_at", start.toISOString()).lt("verified_at", end.toISOString())
      .order("verified_at", { ascending: false });
    setInc(data ?? []);
  }, []);
  useEffect(() => { if (tab === "ingresos") loadInc(month); }, [tab, month, loadInc]);

  const total = inc.reduce((s, p) => s + (p.amount_crc || 0), 0);
  const totMens = inc.filter((p) => p.plan_id).reduce((s, p) => s + p.amount_crc, 0);
  const totSes = inc.filter((p) => !p.plan_id && p.booking_id).reduce((s, p) => s + p.amount_crc, 0);
  const monthLabel = month.toLocaleDateString("es-CR", { month: "long", year: "numeric" });

  function exportInc() {
    const header = ["Fecha", "Cliente", "Concepto", "Método", "Monto (CRC)"];
    const rows = inc.map((p) => [fecha(p.verified_at), p.profiles?.full_name || "—", concepto(p), metodo(p.method), p.amount_crc]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `ingresos-apc-${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  return (
    <AdminLayout title="Pagos">
      <div className="tabs">
        <button className={`tab ${tab === "verificar" ? "on" : ""}`} onClick={() => setTab("verificar")}>
          Por verificar {pend.length > 0 && <span className="badge">{pend.length}</span>}
        </button>
        <button className={`tab ${tab === "ingresos" ? "on" : ""}`} onClick={() => setTab("ingresos")}>Ingresos</button>
      </div>

      {tab === "verificar" && (
        <>
          {pend.length === 0 && <p className="empty">No hay pagos pendientes de verificar. ✓</p>}
          <div className="list">
            {pend.map((p) => (
              <div className="pay" key={p.id}>
                <div className="pinfo">
                  <span className="pname">{p.profiles?.full_name || "Sin nombre"}</span>
                  <span className="pmeta">{concepto(p)} · {colones(p.amount_crc)}</span>
                  <span className="psub">{metodo(p.method)}{p.sinpe_ref_last4 ? ` ····${p.sinpe_ref_last4}` : ""} · {fecha(p.created_at)}</span>
                </div>
                <div className="pacts">
                  {p.proof_url && <button className="btn btn-ghost btn-sm" onClick={() => verVoucher(p.proof_url)}>Ver voucher</button>}
                  <button className="btn btn-primary btn-sm" disabled={busy === p.id} onClick={() => aprobar(p.id)}>Verificar</button>
                  <button className="btn btn-ghost btn-sm danger" disabled={busy === p.id} onClick={() => rechazar(p.id)}>Rechazar</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {tab === "ingresos" && (
        <>
          <div className="nav">
            <button className="navbtn" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
            <span className="navlabel">{monthLabel}</span>
            <button className="navbtn" disabled={isCurrent} onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
          </div>

          <div className="kpis">
            <div className="kpi big"><span className="kv">{colones(total)}</span><span className="kl">Total verificado</span></div>
            <div className="kpi"><span className="kv">{colones(totMens)}</span><span className="kl">Mensualidades</span></div>
            <div className="kpi"><span className="kv">{colones(totSes)}</span><span className="kl">Sesiones sueltas</span></div>
          </div>

          <div className="topbar">
            <span className="count">{inc.length} pago{inc.length !== 1 ? "s" : ""}</span>
            <button className="btn btn-ghost btn-sm" onClick={exportInc} disabled={!inc.length}>Exportar a Excel</button>
          </div>

          {inc.length === 0 ? <p className="empty">Sin ingresos verificados en {monthLabel}.</p> : (
            <div className="list">
              {inc.map((p) => (
                <div className="irow" key={p.id}>
                  <div className="iinfo">
                    <span className="pname">{p.profiles?.full_name || "—"}</span>
                    <span className="psub">{concepto(p)} · {metodo(p.method)} · {fecha(p.verified_at)}</span>
                  </div>
                  <span className="iamt">{colones(p.amount_crc)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {lightbox && (
        <div className="ov" onClick={() => setLightbox(null)}>
          <div className="lb" onClick={(e) => e.stopPropagation()}>
            <button className="x" onClick={() => setLightbox(null)}>✕</button>
            <img src={lightbox} alt="Comprobante" />
          </div>
        </div>
      )}

      <style>{`
        .tabs{display:flex;gap:8px;margin-bottom:18px;border-bottom:1px solid var(--line)}
        .tab{background:none;border:none;color:var(--muted);font:inherit;font-weight:700;font-size:14px;padding:10px 4px;margin-right:14px;cursor:pointer;border-bottom:2px solid transparent;display:flex;align-items:center;gap:7px}
        .tab.on{color:var(--ink);border-bottom-color:var(--primary)}
        .badge{background:var(--amber);color:#06140c;border-radius:999px;font-size:11px;font-weight:800;padding:1px 7px}
        .empty{color:var(--muted);font-size:14px}
        .list{display:flex;flex-direction:column;gap:8px}
        .pay{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px}
        .pinfo{display:flex;flex-direction:column;gap:3px}
        .pname{font-weight:700;font-size:15px}
        .pmeta{font-size:14px;color:var(--ink)}
        .psub{font-size:12.5px;color:var(--muted)}
        .pacts{display:flex;gap:8px;flex-wrap:wrap}
        .danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 40%,transparent)}
        .nav{display:flex;align-items:center;justify-content:center;gap:18px;margin-bottom:18px}
        .navbtn{background:var(--surface);border:1px solid var(--line-2);color:var(--ink);border-radius:var(--r-sm);width:40px;height:40px;font-size:20px;cursor:pointer}
        .navbtn:disabled{opacity:.35;cursor:not-allowed}
        .navlabel{font-family:var(--fd);font-weight:900;font-size:19px;letter-spacing:-.01em;text-transform:capitalize;min-width:180px;text-align:center}
        .kpis{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:18px}
        .kpi{flex:1;min-width:130px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:16px}
        .kpi.big{border-color:color-mix(in srgb,var(--primary) 45%,var(--line))}
        .kv{display:block;font-family:var(--fd);font-weight:900;font-size:22px;color:var(--primary)}
        .kpi:not(.big) .kv{font-size:18px;color:var(--ink)}
        .kl{font-size:12px;color:var(--muted)}
        .topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}
        .count{color:var(--muted);font-size:14px}
        .irow{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:13px 16px}
        .iinfo{display:flex;flex-direction:column;gap:3px}
        .iamt{font-family:var(--fd);font-weight:800;font-size:16px;color:var(--primary);white-space:nowrap}
        .ov{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.8);display:flex;align-items:center;justify-content:center;padding:20px}
        .lb{position:relative;max-width:90vw;max-height:90vh}
        .lb img{max-width:90vw;max-height:90vh;border-radius:var(--r);display:block}
        .x{position:absolute;top:-14px;right:-14px;background:var(--surface);border:1px solid var(--line-2);color:var(--ink);border-radius:50%;width:36px;height:36px;font-size:15px;cursor:pointer}
      `}</style>
    </AdminLayout>
  );
}