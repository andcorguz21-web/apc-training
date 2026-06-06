import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";

export default function Precios() {
  const [plans, setPlans] = useState<any[]>([]);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("plans").select("id,name,type,price_crc,max_members,duration_days,active").order("type").order("price_crc");
    setPlans(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const edit = (id: string, k: string, v: any) => setPlans((ps) => ps.map((p) => (p.id === id ? { ...p, [k]: v } : p)));

  async function guardar(p: any) {
    if (!supabase) return; setBusy(p.id); setMsg("");
    const { error } = await supabase.from("plans").update({ name: p.name, price_crc: Number(p.price_crc) || 0, active: p.active }).eq("id", p.id);
    setBusy(""); setMsg(error ? "Error: " + error.message : `Guardado ✓ — ${p.name}`);
    if (!error) load();
  }

  return (
    <AdminLayout title="Precios">
      <p className="hint">Editá los precios de tus planes. Aplican a las nuevas membresías y reservas.</p>
      {msg && <p className="okmsg" style={{ color: msg.startsWith("Error") ? "var(--danger)" : "var(--primary)" }}>{msg}</p>}
      <div className="plist">
        {plans.map((p) => (
          <div className="pcard" key={p.id}>
            <div className="ptype">{p.type === "membership" ? (p.max_members > 1 ? "Mensualidad · pareja" : "Mensualidad") : "Sesión suelta"}</div>
            <div className="prow">
              <div className="fld"><label>Nombre</label><input className="input" value={p.name} onChange={(e) => edit(p.id, "name", e.target.value)} /></div>
              <div className="fld pmin"><label>Precio (₡)</label><input className="input" type="number" value={p.price_crc} onChange={(e) => edit(p.id, "price_crc", e.target.value)} /></div>
            </div>
            <div className="pfoot">
              <label className="tg"><input type="checkbox" checked={p.active} onChange={(e) => edit(p.id, "active", e.target.checked)} /> Activo</label>
              <button className="btn btn-primary btn-sm" disabled={busy === p.id} onClick={() => guardar(p)}>{busy === p.id ? "…" : "Guardar"}</button>
            </div>
          </div>
        ))}
      </div>
      <style>{`
        .hint{color:var(--muted);font-size:14px;margin-bottom:16px;max-width:520px}
        .okmsg{font-size:14px;font-weight:600;margin-bottom:12px}
        .plist{display:grid;grid-template-columns:1fr;gap:12px}
        @media(min-width:760px){.plist{grid-template-columns:1fr 1fr}}
        .pcard{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:18px}
        .ptype{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:var(--primary);font-weight:700;margin-bottom:14px}
        .prow{display:flex;gap:12px;flex-wrap:wrap}
        .fld{flex:1;min-width:140px;margin-bottom:14px}
        .fld label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px}
        .pmin{flex:0 0 130px}
        .pfoot{display:flex;align-items:center;justify-content:space-between;gap:12px}
        .tg{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--muted);cursor:pointer}
        .tg input{width:16px;height:16px;accent-color:var(--primary)}
      `}</style>
    </AdminLayout>
  );
}