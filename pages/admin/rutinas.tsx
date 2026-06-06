import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";

const noon = (d: string) => new Date(d + "T12:00:00");
const todayISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

export default function AdminRutinas() {
  const [tid, setTid] = useState("");
  const [uid, setUid] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [f, setF] = useState<any>({ client_profile_id: "", type: "routine", title: "", content: "", file_url: "", assigned_date: todayISO() });

  const loadRoutines = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("routines").select("id, client_profile_id, type, title, status, assigned_date").order("assigned_date", { ascending: false }).limit(60);
    setRows(data ?? []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      setUid(session.user.id);
      const { data: prof } = await supabase!.from("profiles").select("tenant_id").eq("id", session.user.id).single();
      if (prof?.tenant_id) setTid(prof.tenant_id);
      const { data: cl } = await supabase!.from("profiles").select("id, full_name").eq("role", "client").eq("approval_status", "approved").order("full_name");
      setClients(cl ?? []);
      const nm: Record<string, string> = {}; (cl ?? []).forEach((c: any) => (nm[c.id] = c.full_name || "Sin nombre")); setNames(nm);
      loadRoutines();
    });
  }, [loadRoutines]);

  async function asignar() {
    if (!supabase) return;
    if (!f.client_profile_id) { setMsg("Elegí un cliente."); return; }
    if (!f.title.trim()) { setMsg("Ponele un título."); return; }
    setBusy(true); setMsg("");
    const { error } = await supabase.from("routines").insert({
      tenant_id: tid, client_profile_id: f.client_profile_id, created_by: uid,
      type: f.type, title: f.title.trim(), content: f.content.trim() || null,
      file_url: f.file_url.trim() || null, status: "assigned", assigned_date: f.assigned_date,
    });
    setBusy(false);
    if (error) { setMsg("Error: " + error.message); return; }
    setMsg("Asignada ✓");
    setF({ ...f, title: "", content: "", file_url: "" });
    loadRoutines();
  }

  async function eliminar(id: string) {
    if (!supabase || !confirm("¿Eliminar esta rutina?")) return;
    await supabase.from("routines").delete().eq("id", id);
    loadRoutines();
  }

  return (
    <AdminLayout title="Rutinas">
      <section className="box">
        <h2 className="h2">Asignar a un cliente</h2>
        <div className="grid">
          <div className="fld"><label>Cliente</label>
            <select className="input" value={f.client_profile_id} onChange={(e) => setF({ ...f, client_profile_id: e.target.value })}>
              <option value="">Elegir…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name || "Sin nombre"}</option>)}
            </select>
          </div>
          <div className="fld"><label>Tipo</label>
            <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
              <option value="routine">Entreno</option>
              <option value="diet">Dieta</option>
            </select>
          </div>
          <div className="fld"><label>Fecha</label>
            <input className="input" type="date" value={f.assigned_date} onChange={(e) => setF({ ...f, assigned_date: e.target.value })} />
          </div>
        </div>
        <div className="fld"><label>Título</label><input className="input" placeholder="Ej. Semana 1 · Tren inferior" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
        <div className="fld"><label>Contenido</label><textarea className="input ta" rows={6} placeholder="Ejercicios, series, reps, notas…" value={f.content} onChange={(e) => setF({ ...f, content: e.target.value })} /></div>
        <div className="fld"><label>Link de archivo (opcional)</label><input className="input" placeholder="https://… (PDF, Drive, etc.)" value={f.file_url} onChange={(e) => setF({ ...f, file_url: e.target.value })} /></div>
        <div className="savebar">
          <button className="btn btn-primary" disabled={busy} onClick={asignar}>{busy ? "Asignando…" : "Asignar"}</button>
          {msg && <span className="saved" style={{ color: msg.startsWith("Error") ? "var(--danger)" : "var(--primary)" }}>{msg}</span>}
        </div>
      </section>

      <h2 className="sec">Asignadas recientemente</h2>
      {rows.length === 0 && <p className="empty">Todavía no asignaste rutinas.</p>}
      <div className="list">
        {rows.map((r) => (
          <div className="row" key={r.id}>
            <div className="rl">
              <span className="rtitle">{r.title}</span>
              <span className="rmeta">{names[r.client_profile_id] || "Cliente"} · {r.type === "diet" ? "Dieta" : "Entreno"} · {noon(r.assigned_date).toLocaleDateString("es-CR", { day: "numeric", month: "short" })} · {r.status === "done" ? "hecha" : "pendiente"}</span>
            </div>
            <button className="btn btn-ghost btn-sm danger" onClick={() => eliminar(r.id)}>Eliminar</button>
          </div>
        ))}
      </div>

      <style>{`
        .box{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:20px;margin-bottom:22px}
        .h2{font-family:var(--fd);font-weight:900;font-size:18px;margin-bottom:16px}
        .grid{display:grid;grid-template-columns:1fr;gap:0 14px}
        @media(min-width:680px){.grid{grid-template-columns:1fr 1fr 1fr}}
        .fld{margin-bottom:14px}
        .fld label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px}
        .ta{resize:vertical;font-family:inherit;line-height:1.5}
        .savebar{display:flex;align-items:center;gap:14px;margin-top:4px}
        .saved{font-weight:600;font-size:14px}
        .sec{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--primary);margin:8px 0 12px}
        .list{display:flex;flex-direction:column;gap:8px}
        .row{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:13px 16px}
        .rl{display:flex;flex-direction:column;gap:3px}
        .rtitle{font-weight:700;font-size:15px}
        .rmeta{font-size:12.5px;color:var(--muted)}
        .danger{color:var(--danger);border-color:color-mix(in srgb,var(--danger) 40%,transparent)}
        .empty{color:var(--muted);font-size:14px}
      `}</style>
    </AdminLayout>
  );
}