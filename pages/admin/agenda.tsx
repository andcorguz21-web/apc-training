import { useEffect, useState, useCallback, useMemo } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";

const hhmm = (t: string) => String(t).slice(0, 5);
const noon = (d: string) => new Date(d + "T12:00:00");
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mondayOf = (base: Date) => { const d = new Date(base); const g = (d.getDay() + 6) % 7; d.setDate(d.getDate() - g); return iso(d); };
const addDays = (s: string, n: number) => { const d = noon(s); d.setDate(d.getDate() + n); return iso(d); };

export default function Agenda() {
  const [mode, setMode] = useState<"week" | "day">("week");
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [selectedDay, setSelectedDay] = useState(() => iso(new Date()));
  const [tenantId, setTenantId] = useState("");
  const [classes, setClasses] = useState<any[]>([]);
  const [dayBookings, setDayBookings] = useState<Record<string, any[]>>({});

  const week = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const loadWeek = useCallback(async (tid: string, ws: string) => {
    if (!supabase || !tid) return;
    const { data } = await supabase.from("class_sessions")
      .select("id, date, start_time, end_time, capacity, booked_count")
      .eq("tenant_id", tid).eq("status", "scheduled")
      .gte("date", ws).lte("date", addDays(ws, 6)).order("date").order("start_time");
    setClasses(data ?? []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: prof } = await supabase!.from("profiles").select("tenant_id").eq("id", session.user.id).single();
      if (prof?.tenant_id) setTenantId(prof.tenant_id);
    });
  }, []);
  useEffect(() => { if (tenantId) loadWeek(tenantId, weekStart); }, [tenantId, weekStart, loadWeek]);

  const dayClasses = useMemo(() => classes.filter((c) => c.date === selectedDay).sort((a, b) => (a.start_time < b.start_time ? -1 : 1)), [classes, selectedDay]);

  useEffect(() => {
    (async () => {
      if (!supabase || mode !== "day" || !dayClasses.length) { setDayBookings({}); return; }
      const ids = dayClasses.map((c) => c.id);
      const { data } = await supabase.from("bookings")
        .select("id, status, class_session_id, profiles ( full_name )")
        .in("class_session_id", ids).in("status", ["pending", "confirmed", "attended"]);
      const m: Record<string, any[]> = {};
      (data ?? []).forEach((b: any) => (m[b.class_session_id] ||= []).push(b));
      setDayBookings(m);
    })();
  }, [mode, selectedDay, dayClasses]);

  const hours = useMemo(() => { const s = new Set<string>(); classes.forEach((c) => s.add(c.start_time)); return Array.from(s).sort(); }, [classes]);
  const cellOf = (day: string, hour: string) => classes.find((c) => c.date === day && c.start_time === hour);
  const color = (c: any) => { if (!c) return "var(--faint)"; const r = c.booked_count / c.capacity; return r >= 1 ? "var(--danger)" : r >= 0.6 ? "var(--amber)" : "var(--primary)"; };
  const totalWeek = classes.reduce((a, c) => a + c.booked_count, 0);

  return (
    <AdminLayout title="Agenda">
      <div className="bar2">
        <div className="wknav">
          <button className="nv" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</button>
          <span className="wklbl">Semana del {noon(weekStart).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}</span>
          <button className="nv" onClick={() => setWeekStart(addDays(weekStart, 7))}>›</button>
        </div>
        <div className="toggle">
          <button className={mode === "week" ? "on" : ""} onClick={() => setMode("week")}>Semana</button>
          <button className={mode === "day" ? "on" : ""} onClick={() => setMode("day")}>Día</button>
        </div>
      </div>
      <p className="tot">{totalWeek} reservas esta semana</p>

      {mode === "week" ? (
        hours.length === 0 ? <p className="empty">No hay clases esta semana.</p> : (
          <div className="gridwrap">
            <table className="grid2">
              <thead>
                <tr><th className="corner" />{week.map((d) => (
                  <th key={d} className="dh"><span className="dh-w">{noon(d).toLocaleDateString("es-CR", { weekday: "short" }).replace(".", "")}</span><span className="dh-n">{noon(d).getDate()}</span></th>
                ))}</tr>
              </thead>
              <tbody>
                {hours.map((h) => (
                  <tr key={h}>
                    <td className="hr">{hhmm(h)}</td>
                    {week.map((d) => { const c = cellOf(d, h); return (
                      <td key={d} className="cell">
                        {c ? <span className="occ" style={{ color: color(c), borderColor: color(c) }}>{c.booked_count}/{c.capacity}</span> : <span className="dashc">·</span>}
                      </td>
                    ); })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <>
          <div className="daystrip2">
            {week.map((d) => (
              <button key={d} className={"dc" + (d === selectedDay ? " sel" : "")} onClick={() => setSelectedDay(d)}>
                <span className="dc-w">{noon(d).toLocaleDateString("es-CR", { weekday: "short" }).replace(".", "")}</span>
                <span className="dc-n">{noon(d).getDate()}</span>
              </button>
            ))}
          </div>
          {dayClasses.length === 0 ? <p className="empty">No hay clases este día.</p> : dayClasses.map((c) => {
            const bs = dayBookings[c.id] || [];
            return (
              <div className="dclass" key={c.id}>
                <div className="dc-head">
                  <span className="dc-time">{hhmm(c.start_time)}–{hhmm(c.end_time)}</span>
                  <span className="pill" style={{ color: color(c), borderColor: color(c) }}>{c.booked_count}/{c.capacity}</span>
                </div>
                {bs.length === 0 ? <span className="noone">Sin reservas</span> : (
                  <div className="people">
                    {bs.map((b) => (
                      <span className="person" key={b.id}>
                        <span className="dot3" style={{ background: b.status === "confirmed" ? "var(--primary)" : b.status === "pending" ? "var(--amber)" : "var(--muted)" }} />
                        {b.profiles?.full_name || "Cliente"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      <style>{`
        .bar2{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px}
        .wknav{display:flex;align-items:center;gap:12px}
        .nv{background:var(--surface);border:1px solid var(--line-2);color:var(--ink);border-radius:var(--r-sm);width:34px;height:34px;font-size:18px;cursor:pointer}
        .wklbl{font-weight:700;font-size:15px;text-transform:capitalize}
        .toggle{display:flex;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-pill);padding:3px}
        .toggle button{background:none;border:none;color:var(--muted);font:inherit;font-weight:700;font-size:13px;padding:7px 16px;border-radius:var(--r-pill);cursor:pointer}
        .toggle button.on{background:var(--primary);color:var(--primary-ink)}
        .tot{color:var(--muted);font-size:13px;margin:0 0 18px}
        .gridwrap{overflow-x:auto;border:1px solid var(--line);border-radius:var(--r-lg)}
        .grid2{border-collapse:collapse;width:100%;min-width:560px}
        .grid2 th,.grid2 td{border-bottom:1px solid var(--line);border-right:1px solid var(--line);text-align:center}
        .grid2 thead th{background:var(--surface);padding:10px 6px}
        .dh-w{display:block;font-size:11px;text-transform:uppercase;color:var(--muted)}
        .dh-n{display:block;font-family:var(--fd);font-weight:900;font-size:16px}
        .corner,.hr{position:sticky;left:0;z-index:1;background:var(--surface)}
        .hr{font-family:var(--fd);font-weight:700;font-size:13px;padding:10px 12px;color:var(--muted);white-space:nowrap}
        .cell{padding:8px 6px;height:46px}
        .occ{display:inline-block;border:1px solid;border-radius:var(--r-pill);padding:3px 9px;font-size:12px;font-weight:700}
        .dashc{color:var(--faint)}
        .daystrip2{display:flex;gap:8px;overflow-x:auto;padding:6px 0 16px;scrollbar-width:none}
        .daystrip2::-webkit-scrollbar{display:none}
        .dc{flex:0 0 auto;min-width:54px;display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 10px;border:1px solid var(--line);border-radius:12px;background:var(--surface);cursor:pointer}
        .dc-w{font-size:10.5px;text-transform:uppercase;color:var(--muted)}
        .dc-n{font-family:var(--fd);font-weight:900;font-size:18px}
        .dc.sel{background:var(--primary);border-color:var(--primary)}
        .dc.sel .dc-w,.dc.sel .dc-n{color:var(--primary-ink)}
        .dclass{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:16px;margin-bottom:10px}
        .dc-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
        .dc-time{font-family:var(--fd);font-weight:900;font-size:18px}
        .people{display:flex;flex-wrap:wrap;gap:8px}
        .person{display:inline-flex;align-items:center;gap:7px;background:var(--bg);border:1px solid var(--line);border-radius:var(--r-pill);padding:6px 12px;font-size:13px;font-weight:600}
        .dot3{width:7px;height:7px;border-radius:50%}
        .noone{color:var(--faint);font-size:13px}
        .empty{color:var(--muted);font-size:14px;padding:20px 0}
      `}</style>
    </AdminLayout>
  );
}