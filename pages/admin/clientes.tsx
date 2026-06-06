import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";

const colones = (n: number) => "₡" + (n || 0).toLocaleString("es-CR");
const hhmm = (t: string) => String(t).slice(0, 5);
const noon = (d: string) => new Date(d + "T12:00:00");
const dISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const estado = (s: string) => s === "approved" ? { t: "Aprobado", c: "var(--primary)" } : s === "rejected" ? { t: "Rechazado", c: "var(--danger)" } : { t: "Pendiente", c: "var(--amber)" };
const bkSt: Record<string, string> = { confirmed: "Confirmada", pending: "Pendiente", cancelled: "Cancelada", attended: "Asistió", no_show: "No asistió" };
const csvCell = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export default function Clientes() {
  const [clients, setClients] = useState<any[]>([]);
  const [spend, setSpend] = useState<Record<string, number>>({});
  const [sel, setSel] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [fb, setFb] = useState<any[]>([]);
  const [fp, setFp] = useState<any[]>([]);
  const [busy, setBusy] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    const [cl, pay] = await Promise.all([
      supabase.from("profiles").select("id, full_name, phone, cedula, approval_status, created_at, notes").eq("role", "client").order("created_at", { ascending: false }),
      supabase.from("payments").select("profile_id, amount_crc").eq("status", "verified"),
    ]);
    setClients(cl.data ?? []);
    const m: Record<string, number> = {};
    (pay.data ?? []).forEach((p: any) => { m[p.profile_id] = (m[p.profile_id] || 0) + p.amount_crc; });
    setSpend(m);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function openFicha(c: any) {
    setSel(c); setForm({ full_name: c.full_name || "", phone: c.phone || "", cedula: c.cedula || "", notes: c.notes || "" }); setFb([]); setFp([]); setMsg("");
    if (!supabase) return;
    const [bk, py] = await Promise.all([
      supabase.from("bookings").select("id, status, booked_at, class_sessions ( date, start_time, end_time )").eq("profile_id", c.id).order("booked_at", { ascending: false }),
      supabase.from("payments").select("id, amount_crc, status, created_at").eq("profile_id", c.id).order("created_at", { ascending: false }),
    ]);
    setFb(bk.data ?? []); setFp(py.data ?? []);
  }

  async function setStatus(id: string, status: string) {
    if (!supabase) return; setBusy(id);
    await supabase.from("profiles").update({ approval_status: status }).eq("id", id);
    setBusy(""); await load();
    if (sel?.id === id) setSel((s: any) => ({ ...s, approval_status: status }));
  }

  async function guardar() {
    if (!supabase || !sel) return; setSaving(true); setMsg("");
    const { error } = await supabase.from("profiles").update(form).eq("id", sel.id);
    setSaving(false);
    if (error) { setMsg("Error: " + error.message); return; }
    setMsg("Guardado ✓"); await load(); setSel((s: any) => ({ ...s, ...form }));
  }

  function exportCSV() {
    const header = ["Nombre", "Teléfono", "Cédula", "Estado", "Registro", "Total pagado (CRC)"];
    const rows = clients.map((c) => [c.full_name, c.phone, c.cedula, estado(c.approval_status).t, new Date(c.created_at).toLocaleDateString("es-CR"), spend[c.id] || 0]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `clientes-apc-${dISO()}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  const activeBk = fb.filter((b) => ["confirmed", "attended"].includes(b.status)).length;
  const totalGast = sel ? spend[sel.id] || 0 : 0;

  return (
    <AdminLayout title="Clientes">
      <div className="topbar">
        <span className="count">{clients.length} cliente{clients.length !== 1 ? "s" : ""}</span>
        <button className="btn btn-ghost btn-sm" onClick={exportCSV} disabled={!clients.length}>Exportar a Excel</button>
      </div>

      {clients.length === 0 && <p className="empty">Aún no hay clientes registrados.</p>}
      <div className="list">
        {clients.map((c) => { const b = estado(c.approval_status); return (
          <button className="item" key={c.id} onClick={() => openFicha(c)}>
            <div className="who">
              <span className="name">{c.full_name || "Sin nombre"}</span>
              <span className="meta">{c.phone || "sin teléfono"} · {colones(spend[c.id] || 0)} pagado</span>
            </div>
            <span className="chip" style={{ borderColor: b.c, color: b.c }}>● {b.t}</span>
          </button>
        ); })}
      </div>

      {sel && (
        <div className="ov" onClick={() => setSel(null)}>
          <aside className="drawer" onClick={(e) => e.stopPropagation()}>
            <div className="dh">
              <div>
                <h2 className="dn">{sel.full_name || "Sin nombre"}</h2>
                <span className="chip" style={{ borderColor: estado(sel.approval_status).c, color: estado(sel.approval_status).c }}>● {estado(sel.approval_status).t}</span>
              </div>
              <button className="x" onClick={() => setSel(null)}>✕</button>
            </div>

            {sel.approval_status !== "approved" && (
              <div className="apr">
                <button className="btn btn-primary btn-sm" disabled={busy === sel.id} onClick={() => setStatus(sel.id, "approved")}>Aprobar</button>
                {sel.approval_status === "pending" && <button className="btn btn-ghost btn-sm" disabled={busy === sel.id} onClick={() => setStatus(sel.id, "rejected")}>Rechazar</button>}
              </div>
            )}

            <div className="stats">
              <div className="stat"><span className="sv">{colones(totalGast)}</span><span className="sl">Total pagado</span></div>
              <div className="stat"><span className="sv">{activeBk}</span><span className="sl">Clases confirmadas</span></div>
              <div className="stat"><span className="sv">{new Date(sel.created_at).toLocaleDateString("es-CR", { month: "short", year: "numeric" })}</span><span className="sl">Cliente desde</span></div>
            </div>

            <h3 className="sec">Datos</h3>
            <div className="fld"><label>Nombre</label><input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
            <div className="fld"><label>Teléfono / WhatsApp</label><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="fld"><label>Cédula</label><input className="input" value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })} /></div>
            <div className="fld"><label>Notas privadas</label><textarea className="input ta" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="savebar">
              <button className="btn btn-primary btn-sm" disabled={saving} onClick={guardar}>{saving ? "Guardando…" : "Guardar datos"}</button>
              {form.phone && <a className="btn btn-ghost btn-sm" href={`https://wa.me/506${form.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">WhatsApp</a>}
              {msg && <span className="saved" style={{ color: msg.startsWith("Error") ? "var(--danger)" : "var(--primary)" }}>{msg}</span>}
            </div>

            <h3 className="sec">Reservas ({fb.length})</h3>
            {fb.length === 0 ? <p className="empty2">Sin reservas.</p> : (
              <div className="hist">
                {fb.slice(0, 20).map((b) => (
                  <div className="hrow" key={b.id}>
                    <span>{b.class_sessions ? noon(b.class_sessions.date).toLocaleDateString("es-CR", { day: "numeric", month: "short" }) : "—"} · {b.class_sessions ? hhmm(b.class_sessions.start_time) : ""}</span>
                    <span className="hs">{bkSt[b.status] || b.status}</span>
                  </div>
                ))}
              </div>
            )}

            <h3 className="sec">Pagos ({fp.length})</h3>
            {fp.length === 0 ? <p className="empty2">Sin pagos.</p> : (
              <div className="hist">
                {fp.slice(0, 20).map((p) => (
                  <div className="hrow" key={p.id}>
                    <span>{colones(p.amount_crc)} · {new Date(p.created_at).toLocaleDateString("es-CR")}</span>
                    <span className="hs" style={{ color: p.status === "verified" ? "var(--primary)" : p.status === "rejected" ? "var(--danger)" : "var(--amber)" }}>{p.status === "verified" ? "Verificado" : p.status === "rejected" ? "Rechazado" : "Pendiente"}</span>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      )}

      <style>{`
        .topbar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px}
        .count{color:var(--muted);font-size:14px}
        .list{display:flex;flex-direction:column;gap:8px}
        .item{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;cursor:pointer;font:inherit;color:inherit;transition:border-color .2s}
        .item:hover{border-color:var(--line-2)}
        .who{display:flex;flex-direction:column;gap:3px}
        .name{font-weight:700;font-size:15px}
        .meta{font-size:13px;color:var(--muted)}
        .chip{border:1px solid;border-radius:999px;padding:5px 11px;font-size:12px;font-weight:700;white-space:nowrap}
        .empty{color:var(--muted);font-size:14px}
        .ov{position:fixed;inset:0;z-index:50;background:rgba(0,0,0,.6);display:flex;justify-content:flex-end}
        .drawer{width:min(480px,100%);height:100%;background:var(--bg);border-left:1px solid var(--line);overflow-y:auto;padding:22px;animation:slidein .25s ease}
        @keyframes slidein{from{transform:translateX(24px);opacity:.5}to{transform:translateX(0);opacity:1}}
        .dh{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;margin-bottom:16px}
        .dn{font-family:var(--fd);font-weight:900;font-size:24px;letter-spacing:-.02em;margin-bottom:8px}
        .x{background:none;border:1px solid var(--line-2);color:var(--ink);border-radius:var(--r-sm);width:34px;height:34px;font-size:15px;cursor:pointer;flex:0 0 auto}
        .apr{display:flex;gap:8px;margin-bottom:18px}
        .stats{display:flex;gap:10px;flex-wrap:wrap}
        .stat{flex:1;min-width:110px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px}
        .sv{display:block;font-family:var(--fd);font-weight:900;font-size:18px;color:var(--primary)}
        .sl{font-size:12px;color:var(--muted)}
        .sec{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--primary);margin:24px 0 12px}
        .fld{margin-bottom:12px}
        .fld label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px}
        .ta{resize:vertical;font-family:inherit;line-height:1.5}
        .savebar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px}
        .saved{font-size:13px;font-weight:600}
        .hist{display:flex;flex-direction:column;gap:6px}
        .hrow{display:flex;align-items:center;justify-content:space-between;border:1px solid var(--line);border-radius:var(--r-sm);padding:10px 13px;font-size:13.5px}
        .hs{font-weight:600;font-size:12.5px;color:var(--muted)}
        .empty2{color:var(--faint);font-size:13px}
      `}</style>
    </AdminLayout>
  );
}