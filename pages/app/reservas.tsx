import { useEffect, useState, useCallback } from "react";
import ClientLayout from "@/components/ClientLayout";
import { supabase } from "@/lib/supabase";

const hhmm = (t: string) => String(t).slice(0, 5);
const noon = (d: string) => new Date(d + "T12:00:00");
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const ST: Record<string, { t: string; c: string }> = {
  confirmed: { t: "Confirmada", c: "var(--primary)" }, pending: { t: "Pendiente", c: "var(--amber)" },
  cancelled: { t: "Cancelada", c: "var(--faint)" }, attended: { t: "Asististe", c: "var(--primary)" }, no_show: { t: "No asististe", c: "var(--danger)" },
};

export default function ReservasPage() { return <ClientLayout><Reservas /></ClientLayout>; }

function Reservas() {
  const [rows, setRows] = useState<any[]>([]);
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("bookings")
      .select("id, status, class_sessions ( date, start_time, end_time )")
      .order("booked_at", { ascending: false });
    setRows(data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  async function cancelar(id: string) {
    if (!supabase) return; setBusy(id);
    await supabase.from("bookings").update({ status: "cancelled", cancelled_at: new Date().toISOString() }).eq("id", id);
    setBusy(""); await load();
  }

  const t = today();
  const upcoming = rows.filter((r) => r.class_sessions?.date >= t && ["pending", "confirmed"].includes(r.status));
  const history = rows.filter((r) => !(r.class_sessions?.date >= t && ["pending", "confirmed"].includes(r.status)));

  const Item = ({ r }: any) => {
    const s = ST[r.status] || ST.pending; const cs = r.class_sessions;
    return (
      <div className="rv">
        <div className="rv-l">
          <span className="rv-d">{cs ? noon(cs.date).toLocaleDateString("es-CR", { weekday: "long", day: "numeric", month: "short" }) : "—"}</span>
          <span className="rv-t">{cs ? `${hhmm(cs.start_time)}–${hhmm(cs.end_time)}` : ""}</span>
        </div>
        <div className="rv-r">
          <span className="st" style={{ color: s.c }}>{s.t}</span>
          {cs && cs.date >= t && ["pending", "confirmed"].includes(r.status) &&
            <button className="btn btn-ghost btn-sm" disabled={busy === r.id} onClick={() => cancelar(r.id)}>Cancelar</button>}
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ paddingTop: 30 }}>
      <h1 style={{ fontFamily: "var(--fd)", fontWeight: 900, fontSize: "clamp(32px,9vw,48px)", letterSpacing: "-.02em" }}>Mis reservas</h1>
      <h2 className="sec">Próximas</h2>
      {upcoming.length ? upcoming.map((r) => <Item key={r.id} r={r} />) : <p className="empty">No tenés reservas próximas.</p>}
      <h2 className="sec">Historial</h2>
      {history.length ? history.map((r) => <Item key={r.id} r={r} />) : <p className="empty">Sin historial todavía.</p>}
      <style>{`
        .sec{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:var(--primary);margin:28px 0 12px}
        .rv{display:flex;align-items:center;justify-content:space-between;gap:12px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;margin-bottom:8px}
        .rv-l{display:flex;flex-direction:column;gap:2px}
        .rv-d{font-weight:700;font-size:15px;text-transform:capitalize}
        .rv-t{font-size:13px;color:var(--faint)}
        .rv-r{display:flex;align-items:center;gap:12px}
        .st{font-size:13px;font-weight:700}
        .empty{color:var(--muted);font-size:14px}
      `}</style>
    </div>
  );
}