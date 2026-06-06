import { useEffect, useState, useCallback } from "react";
import ClientLayout from "@/components/ClientLayout";
import { supabase } from "@/lib/supabase";

const noon = (d: string) => new Date(d + "T12:00:00");
const typeLabel = (t: string) => (t === "diet" ? "Dieta" : "Entreno");

export default function RutinasPage() { return <ClientLayout><Rutinas /></ClientLayout>; }

function Rutinas() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState<"all" | "routine" | "diet">("all");
  const [busy, setBusy] = useState("");
  const [open, setOpen] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("routines")
      .select("id, type, title, content, file_url, status, assigned_date")
      .order("assigned_date", { ascending: false });
    setRows(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function toggleDone(r: any) {
    if (!supabase) return; setBusy(r.id);
    await supabase.from("routines").update({ status: r.status === "done" ? "assigned" : "done" }).eq("id", r.id);
    setBusy(""); await load();
  }

  const list = rows.filter((r) => filter === "all" || r.type === filter);

  return (
    <div className="container" style={{ paddingTop: 30 }}>
      <h1 className="ttl">Rutinas</h1>
      <p className="sub">Lo que te asigna el coach: entrenos y dietas.</p>

      <div className="tabs">
        {([["all", "Todo"], ["routine", "Entrenos"], ["diet", "Dietas"]] as const).map(([v, l]) => (
          <button key={v} className={"tab" + (filter === v ? " on" : "")} onClick={() => setFilter(v)}>{l}</button>
        ))}
      </div>

      {list.length === 0 ? <p className="empty">Todavía no tenés nada asignado.</p> : (
        <div className="list">
          {list.map((r) => {
            const exp = open === r.id;
            return (
              <div className={"rt" + (r.status === "done" ? " done" : "")} key={r.id}>
                <button className="rt-head" onClick={() => setOpen(exp ? "" : r.id)}>
                  <div className="rt-l">
                    <span className="rt-tag">{typeLabel(r.type)}{r.status === "done" ? " · hecha" : ""}</span>
                    <span className="rt-title">{r.title}</span>
                    <span className="rt-date">{noon(r.assigned_date).toLocaleDateString("es-CR", { day: "numeric", month: "long", year: "numeric" })}</span>
                  </div>
                  <span className="rt-caret">{exp ? "−" : "+"}</span>
                </button>
                {exp && (
                  <div className="rt-body">
                    {r.content && <p className="rt-content">{r.content}</p>}
                    <div className="rt-acts">
                      {r.file_url && <a className="btn btn-ghost btn-sm" href={r.file_url} target="_blank" rel="noreferrer">Abrir archivo</a>}
                      <button className={"btn btn-sm " + (r.status === "done" ? "btn-ghost" : "btn-primary")} disabled={busy === r.id} onClick={() => toggleDone(r)}>{r.status === "done" ? "Marcar pendiente" : "Marcar como hecha ✓"}</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .ttl{font-family:var(--fd);font-weight:900;font-size:clamp(32px,9vw,48px);letter-spacing:-.02em}
        .sub{color:var(--muted);font-size:14.5px;margin-top:6px}
        .tabs{display:flex;gap:8px;margin:20px 0 16px}
        .tab{background:var(--surface);border:1px solid var(--line);color:var(--muted);font:inherit;font-weight:700;font-size:13px;padding:8px 16px;border-radius:var(--r-pill);cursor:pointer}
        .tab.on{background:var(--primary);border-color:var(--primary);color:var(--primary-ink)}
        .list{display:flex;flex-direction:column;gap:10px}
        .rt{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);overflow:hidden}
        .rt.done{opacity:.62}
        .rt-head{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;text-align:left;background:none;border:none;color:inherit;font:inherit;padding:16px 18px;cursor:pointer}
        .rt-l{display:flex;flex-direction:column;gap:3px}
        .rt-tag{font-size:11px;text-transform:uppercase;letter-spacing:.07em;color:var(--primary);font-weight:700}
        .rt-title{font-weight:800;font-size:16px}
        .rt-date{font-size:12.5px;color:var(--faint)}
        .rt-caret{font-size:22px;color:var(--muted);flex:0 0 auto}
        .rt-body{padding:0 18px 18px;display:flex;flex-direction:column;gap:14px}
        .rt-content{white-space:pre-wrap;line-height:1.6;font-size:14.5px;color:var(--ink)}
        .rt-acts{display:flex;gap:10px;flex-wrap:wrap}
        .empty{color:var(--muted);font-size:14px}
      `}</style>
    </div>
  );
}