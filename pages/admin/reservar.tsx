import { useEffect, useState, useCallback, useRef } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const todayISO = () => { const d = new Date(); return iso(d.getFullYear(), d.getMonth(), d.getDate()); };
const hhmm = (t: string) => String(t).slice(0, 5);
const DOW = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
const MES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
function mapErr(m: string) {
  const u = (m || "").toUpperCase();
  if (u.includes("CLASS_FULL")) return "Esa clase ya está llena.";
  if (u.includes("ALREADY_BOOKED")) return "Ese cliente ya está en esa clase.";
  if (u.includes("NOT_A_CLIENT")) return "Ese usuario no es un cliente válido.";
  if (u.includes("NO_TARGET")) return "Elegí un cliente o escribí un nombre.";
  return "Error: " + m;
}

export default function AdminReservar() {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });
  const [date, setDate] = useState(todayISO());
  const [sessions, setSessions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [sel, setSel] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const [query, setQuery] = useState("");
  const [openList, setOpenList] = useState(false);
  const [picked, setPicked] = useState<{ type: "client" | "guest"; id?: string; name: string } | null>(null);
  const comboRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async (d: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("class_sessions").select("id, start_time, end_time, booked_count, capacity").eq("status", "scheduled").eq("date", d).order("start_time");
    setSessions(data ?? []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.from("profiles").select("id, full_name").eq("role", "client").eq("approval_status", "approved").order("full_name").then(({ data }) => setClients(data ?? []));
  }, []);
  useEffect(() => { loadSessions(date); setSel(""); setMsg(""); }, [date, loadSessions]);

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (comboRef.current && !comboRef.current.contains(e.target as Node)) setOpenList(false); }
    document.addEventListener("mousedown", onDoc); return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const { y, m } = cursor;
  const startWeekday = (new Date(y, m, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const tIso = todayISO();
  const prevMonth = () => setCursor(({ y, m }) => m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 });
  const nextMonth = () => setCursor(({ y, m }) => m === 11 ? { y: y + 1, m: 0 } : { y, m: m + 1 });
  const atCurrentMonth = y === new Date().getFullYear() && m === new Date().getMonth();

  const filtered = clients.filter((c) => (c.full_name || "").toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8);
  const hasExact = clients.some((c) => (c.full_name || "").toLowerCase() === query.trim().toLowerCase());
  function pickClient(c: any) { setPicked({ type: "client", id: c.id, name: c.full_name || "Sin nombre" }); setQuery(c.full_name || ""); setOpenList(false); }
  function pickGuest() { const n = query.trim(); if (!n) return; setPicked({ type: "guest", name: n }); setOpenList(false); }

  async function crear() {
    if (!supabase) return;
    if (!sel) { setMsg("Elegí una clase."); return; }
    const target = picked || (query.trim() ? { type: "guest" as const, name: query.trim() } : null);
    if (!target) { setMsg("Elegí un cliente o escribí un nombre."); return; }
    setBusy(true); setMsg("");
    const { error } = await supabase.rpc("admin_create_booking", {
      p_class_session_id: sel,
      p_profile_id: target.type === "client" ? target.id : null,
      p_guest_name: target.type === "guest" ? target.name : null,
    });
    setBusy(false);
    if (error) { setMsg(mapErr(error.message)); return; }
    setMsg(`Reserva creada para ${target.name} ✓`);
    setPicked(null); setQuery("");
    loadSessions(date);
  }

  const ok = msg.includes("✓");
  const selDateLabel = (() => { const [yy, mm, dd] = date.split("-").map(Number); const d = new Date(yy, mm - 1, dd); return `${["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][d.getDay()]} ${dd} de ${MES[mm - 1]}`; })();
  const selSession = sessions.find((s) => s.id === sel);

  return (
    <AdminLayout title="Crear reserva">
      <div className="wrap">
        <div className="box cal">
          <div className="cal-head">
            <button className="cal-nav" onClick={prevMonth} disabled={atCurrentMonth} aria-label="Mes anterior">‹</button>
            <span className="cal-title">{MES[m]} {y}</span>
            <button className="cal-nav" onClick={nextMonth} aria-label="Mes siguiente">›</button>
          </div>
          <div className="cal-grid">
            {DOW.map((d) => <span key={d} className="cal-dow">{d}</span>)}
            {cells.map((d, i) => {
              if (d === null) return <span key={"e" + i} />;
              const dIso = iso(y, m, d);
              const past = dIso < tIso;
              return (
                <button key={dIso} className={"cal-day" + (dIso === date ? " on" : "") + (dIso === tIso ? " today" : "")} disabled={past} onClick={() => setDate(dIso)}>{d}</button>
              );
            })}
          </div>
        </div>

        <div className="box main">
          <p className="daylabel">Clases del <b>{selDateLabel}</b></p>

          {sessions.length === 0 ? (
            <div className="nosess">No hay clases programadas ese día.</div>
          ) : (
            <div className="timeline">
              {sessions.map((s) => {
                const left = s.capacity - s.booked_count;
                const full = left <= 0;
                const ratio = s.capacity ? s.booked_count / s.capacity : 0;
                const tone = full ? "full" : ratio >= 0.6 ? "warm" : "open";
                const on = sel === s.id;
                return (
                  <button
                    key={s.id}
                    className={"slot " + tone + (on ? " on" : "") + (full ? " disabled" : "")}
                    disabled={full}
                    onClick={() => setSel(s.id)}
                  >
                    <span className="slot-rail" aria-hidden />
                    <span className="slot-time">
                      <span className="slot-h">{hhmm(s.start_time)}</span>
                      <span className="slot-end">{hhmm(s.end_time)}</span>
                    </span>
                    <span className="slot-body">
                      <span className="slot-row">
                        <span className="slot-state">{full ? "Clase llena" : on ? "Seleccionada" : `${left} ${left === 1 ? "lugar" : "lugares"} libre${left === 1 ? "" : "s"}`}</span>
                        <span className="slot-count">{s.booked_count}<span className="slot-cap">/{s.capacity}</span></span>
                      </span>
                      <span className="bar"><span className="bar-fill" style={{ width: `${Math.min(100, ratio * 100)}%` }} /></span>
                    </span>
                    <span className="slot-check">{on ? "✓" : ""}</span>
                  </button>
                );
              })}
            </div>
          )}

          <label className="lbl">Cliente</label>
          <div className="combo" ref={comboRef}>
            <input
              className="inp"
              placeholder="Buscá un cliente o escribí un nombre nuevo"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setPicked(null); setOpenList(true); }}
              onFocus={() => setOpenList(true)}
            />
            {openList && (query.trim() || filtered.length > 0) && (
              <div className="combo-menu">
                {filtered.map((c) => (
                  <div key={c.id} className="combo-item" onMouseDown={() => pickClient(c)}>
                    <span>{c.full_name || "Sin nombre"}</span><span className="tag">inscrito</span>
                  </div>
                ))}
                {filtered.length === 0 && !query.trim() && <div className="combo-item dim">Escribí para buscar…</div>}
                {query.trim() && !hasExact && (
                  <div className="combo-item combo-new" onMouseDown={pickGuest}>➕ Agregar “{query.trim()}” como invitado</div>
                )}
              </div>
            )}
          </div>
          {picked && (
            <span className="pickchip">{picked.type === "client" ? "Cliente:" : "Invitado:"} <b>{picked.name}</b><span className="clr" onClick={() => { setPicked(null); setQuery(""); }}>✕</span></span>
          )}

          <div className="bar2">
            <button className="btn btn-primary" disabled={busy || !sel} onClick={crear}>{busy ? "Creando…" : "Crear reserva"}</button>
            {selSession && !msg && <span className="ctx">{hhmm(selSession.start_time)}–{hhmm(selSession.end_time)}{picked ? ` · ${picked.name}` : ""}</span>}
            {msg && <span className="saved" style={{ color: ok ? "var(--primary)" : "var(--danger)" }}>{msg}</span>}
          </div>
          <p className="hint">Queda confirmada al instante y respeta el cupo. Un invitado es alguien sin cuenta (solo se guarda el nombre).</p>
        </div>
      </div>

      <style>{`
        .wrap{display:grid;grid-template-columns:1fr;gap:14px;max-width:640px}
        .box{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:20px}
        .cal{max-width:360px}
        .cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .cal-nav{width:34px;height:34px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--bg);color:var(--ink);font-size:18px;cursor:pointer}
        .cal-nav:disabled{opacity:.3;cursor:not-allowed}
        .cal-title{font-family:var(--fd);font-weight:800;font-size:16px;text-transform:capitalize}
        .cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:5px}
        .cal-dow{font-size:10px;text-transform:uppercase;letter-spacing:.04em;color:var(--faint);text-align:center;padding:2px 0}
        .cal-day{aspect-ratio:1;display:flex;align-items:center;justify-content:center;border-radius:var(--r-sm);border:1px solid transparent;background:var(--bg);color:var(--ink);font-size:13.5px;font-weight:600;cursor:pointer;transition:border-color .15s,background .15s}
        .cal-day:hover:not(:disabled){border-color:var(--line-2)}
        .cal-day.today{color:var(--primary)}
        .cal-day.on{background:var(--primary);color:var(--primary-ink);border-color:var(--primary)}
        .cal-day:disabled{opacity:.25;cursor:not-allowed}

        .daylabel{font-size:14px;color:var(--muted);margin-bottom:16px;text-transform:capitalize}
        .daylabel b{color:var(--ink);font-weight:700}
        .nosess{color:var(--muted);font-size:14px;background:var(--bg);border:1px dashed var(--line-2);border-radius:var(--r);padding:22px;text-align:center}

        /* ---- timeline de horarios ---- */
        .timeline{display:flex;flex-direction:column;gap:8px;margin-bottom:6px}
        .slot{position:relative;display:flex;align-items:stretch;gap:14px;width:100%;text-align:left;
          background:var(--bg);border:1px solid var(--line);border-radius:var(--r);padding:13px 15px 13px 13px;
          color:var(--ink);font:inherit;cursor:pointer;transition:border-color .18s,background .18s,transform .12s}
        .slot:hover:not(.disabled){border-color:var(--line-2);transform:translateX(2px)}
        .slot.on{border-color:var(--primary);background:color-mix(in srgb,var(--primary) 9%,var(--surface))}
        .slot.disabled{opacity:.5;cursor:not-allowed}
        .slot-rail{flex:0 0 3px;align-self:stretch;border-radius:3px;background:var(--line-2)}
        .slot.open .slot-rail{background:var(--primary)}
        .slot.warm .slot-rail{background:var(--amber)}
        .slot.full .slot-rail{background:var(--danger)}
        .slot-time{display:flex;flex-direction:column;align-items:flex-start;min-width:58px;line-height:1}
        .slot-h{font-family:var(--fd);font-weight:900;font-size:21px;letter-spacing:-.02em}
        .slot-end{font-size:11px;color:var(--faint);margin-top:3px}
        .slot-body{flex:1;display:flex;flex-direction:column;justify-content:center;gap:8px;min-width:0}
        .slot-row{display:flex;align-items:baseline;justify-content:space-between;gap:10px}
        .slot-state{font-size:13px;font-weight:600;color:var(--muted)}
        .slot.on .slot-state{color:var(--primary)}
        .slot-count{font-family:var(--fd);font-weight:800;font-size:15px}
        .slot-cap{color:var(--faint);font-weight:600;font-size:12px}
        .bar{display:block;height:5px;border-radius:3px;background:color-mix(in srgb,var(--ink) 10%,transparent);overflow:hidden}
        .bar-fill{display:block;height:100%;border-radius:3px;transition:width .4s}
        .slot.open .bar-fill{background:var(--primary)}
        .slot.warm .bar-fill{background:var(--amber)}
        .slot.full .bar-fill{background:var(--danger)}
        .slot-check{flex:0 0 18px;display:flex;align-items:center;justify-content:center;color:var(--primary);font-weight:900;font-size:15px}

        .lbl{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:20px 0 7px}
        .inp{width:100%;background:var(--bg);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:13px 14px;color:var(--ink);font:inherit;font-size:14px}
        .inp:focus{outline:none;border-color:var(--primary)}
        .combo{position:relative}
        .combo-menu{position:absolute;z-index:5;left:0;right:0;top:calc(100% + 4px);background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-sm);max-height:260px;overflow:auto;box-shadow:0 14px 34px rgba(0,0,0,.45)}
        .combo-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 13px;cursor:pointer;font-size:14px}
        .combo-item:hover{background:rgba(236,234,227,.06)}
        .combo-item .tag{font-size:11px;color:var(--faint);text-transform:uppercase;letter-spacing:.04em}
        .combo-item.dim{color:var(--muted);cursor:default}
        .combo-new{color:var(--primary);font-weight:600;border-top:1px solid var(--line)}
        .pickchip{display:inline-flex;align-items:center;gap:8px;margin-top:9px;font-size:13px;color:var(--muted)}
        .pickchip b{color:var(--ink)}
        .pickchip .clr{cursor:pointer;color:var(--faint);font-size:12px}
        .bar2{display:flex;align-items:center;gap:14px;margin-top:22px;flex-wrap:wrap}
        .ctx{font-size:13px;color:var(--muted)}
        .saved{font-weight:600;font-size:14px}
        .hint{font-size:12.5px;color:var(--faint);margin-top:12px;line-height:1.5}
        @media(min-width:760px){.wrap{grid-template-columns:360px 1fr;align-items:start}.cal{max-width:none}}
      `}</style>
    </AdminLayout>
  );
}