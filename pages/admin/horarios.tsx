import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";

const DOW = [
  { v: 1, l: "Lunes" }, { v: 2, l: "Martes" }, { v: 3, l: "Miércoles" },
  { v: 4, l: "Jueves" }, { v: 5, l: "Viernes" }, { v: 6, l: "Sábado" }, { v: 0, l: "Domingo" },
];
const dowLabel = (v: number) => DOW.find((d) => d.v === v)?.l ?? "";
const dayOffset = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export default function Horarios() {
  const [tenantId, setTenantId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [templates, setTemplates] = useState<any[]>([]);

  const [weekday, setWeekday] = useState(1);
  const [open, setOpen] = useState("05:00");
  const [close, setClose] = useState("08:00");
  const [cap, setCap] = useState(5);
  const [tmplMsg, setTmplMsg] = useState("");

  const [from, setFrom] = useState(dayOffset(0));
  const [to, setTo] = useState(dayOffset(14));
  const [genMsg, setGenMsg] = useState("");
  const [genBusy, setGenBusy] = useState(false);

  const loadTemplates = useCallback(async (tid: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("schedule_templates")
      .select("id, weekday, open_time, close_time, capacity")
      .eq("tenant_id", tid).order("weekday").order("open_time");
    setTemplates(data ?? []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: prof } = await supabase!.from("profiles").select("tenant_id").eq("id", session.user.id).single();
      const tid = prof?.tenant_id; if (!tid) return;
      setTenantId(tid);
      const { data: locs } = await supabase!.from("locations").select("id").eq("tenant_id", tid).eq("active", true).limit(1);
      if (locs && locs[0]) setLocationId(locs[0].id);
      loadTemplates(tid);
    });
  }, [loadTemplates]);

  async function addTemplate() {
    if (!supabase || !tenantId || !locationId) return;
    setTmplMsg("");
    if (close <= open) { setTmplMsg("El cierre debe ser mayor que la apertura."); return; }
    const { error } = await supabase.from("schedule_templates").insert({
      tenant_id: tenantId, location_id: locationId, weekday,
      open_time: open, close_time: close, slot_minutes: 60, capacity: cap,
    });
    if (error) { setTmplMsg("No se pudo guardar: " + error.message); return; }
    loadTemplates(tenantId);
  }

  async function delTemplate(id: string) {
    if (!supabase) return;
    await supabase.from("schedule_templates").delete().eq("id", id);
    loadTemplates(tenantId);
  }

  async function generar() {
    if (!supabase || !tenantId) return;
    setGenBusy(true); setGenMsg("");
    const { data, error } = await supabase.rpc("generate_sessions", { p_tenant_id: tenantId, p_from: from, p_to: to });
    setGenBusy(false);
    if (error) { setGenMsg("Error: " + error.message); return; }
    setGenMsg(`Listo. Se procesaron ${data} franjas entre ${from} y ${to} (las que ya existían no se duplican).`);
  }

  return (
    <AdminLayout title="Horarios">
      <section className="box">
        <h2 className="h2">Plantilla semanal</h2>
        <p className="hint">Definí apertura y cierre por día. Cada bloque se parte en clases de 1 hora con el cupo que elijas.</p>
        <div className="form">
          <select value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
            {DOW.map((d) => <option key={d.v} value={d.v}>{d.l}</option>)}
          </select>
          <input type="time" value={open} onChange={(e) => setOpen(e.target.value)} />
          <span className="dash">a</span>
          <input type="time" value={close} onChange={(e) => setClose(e.target.value)} />
          <input className="cap" type="number" min={1} max={50} value={cap} onChange={(e) => setCap(Number(e.target.value))} title="Cupo" />
          <button className="add" onClick={addTemplate}>Agregar</button>
        </div>
        {tmplMsg && <p className="err">{tmplMsg}</p>}
        <div className="rows">
          {templates.length === 0 && <p className="hint">Aún no hay franjas.</p>}
          {templates.map((t) => (
            <div className="row" key={t.id}>
              <span><b>{dowLabel(t.weekday)}</b> · {String(t.open_time).slice(0,5)}–{String(t.close_time).slice(0,5)} · cupo {t.capacity}</span>
              <button className="del" onClick={() => delTemplate(t.id)}>Eliminar</button>
            </div>
          ))}
        </div>
      </section>

      <section className="box">
        <h2 className="h2">Generar clases</h2>
        <p className="hint">Crea las clases reales desde la plantilla, para el rango de fechas. Repetilo cuando quieras: no duplica.</p>
        <div className="form">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span className="dash">a</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          <button className="add" disabled={genBusy} onClick={generar}>{genBusy ? "Generando…" : "Generar"}</button>
        </div>
        {genMsg && <p className="ok">{genMsg}</p>}
      </section>

      <style>{`
        .box{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:24px;margin-bottom:20px}
        .h2{font-family:var(--fd);font-weight:900;font-size:20px;letter-spacing:-.01em}
        .hint{color:var(--muted);font-size:14px;line-height:1.5;margin:8px 0 18px;max-width:560px}
        .form{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
        .form select,.form input{background:var(--bg);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:11px 12px;color:var(--ink);font:inherit;font-size:14px}
        .form select:focus,.form input:focus{outline:none;border-color:var(--primary)}
        .cap{width:74px}
        .dash{color:var(--muted);font-size:14px}
        .add{background:var(--primary);color:var(--primary-ink);border:none;border-radius:var(--r-sm);padding:11px 20px;font:inherit;font-weight:700;font-size:14px;cursor:pointer}
        .add:disabled{opacity:.55;cursor:default}
        .rows{margin-top:18px;display:flex;flex-direction:column;gap:8px}
        .row{display:flex;align-items:center;justify-content:space-between;gap:12px;border:1px solid var(--line);border-radius:var(--r-sm);padding:12px 14px;font-size:14px}
        .row b{font-weight:700}
        .del{background:none;border:1px solid rgba(224,86,79,.45);color:#f0a0a0;border-radius:var(--r-sm);padding:7px 12px;font:inherit;font-size:12px;font-weight:600;cursor:pointer}
        .err{color:#f4b4b4;font-size:13.5px;margin-top:12px}
        .ok{color:var(--primary);font-size:14px;margin-top:14px}
      `}</style>
    </AdminLayout>
  );
}