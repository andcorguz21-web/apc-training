import { useEffect, useState, useRef, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";

export default function AdminMensajes() {
  const [tid, setTid] = useState("");
  const [uid, setUid] = useState("");
  const [all, setAll] = useState<any[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [clients, setClients] = useState<any[]>([]);
  const [sel, setSel] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const loadMsgs = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from("messages")
      .select("id, body, client_profile_id, sender_profile_id, read_at, created_at")
      .order("created_at", { ascending: true });
    setAll(data ?? []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let channel: any = null;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session || cancelled) return;
      setUid(session.user.id);
      const { data: prof } = await supabase!.from("profiles").select("tenant_id").eq("id", session.user.id).single();
      const tenant = prof?.tenant_id || ""; setTid(tenant);
      const { data: cl } = await supabase!.from("profiles").select("id, full_name").eq("role", "client").eq("approval_status", "approved").order("full_name");
      if (cancelled) return;
      setClients(cl ?? []);
      const nm: Record<string, string> = {}; (cl ?? []).forEach((c: any) => (nm[c.id] = c.full_name || "Sin nombre")); setNames(nm);
      await loadMsgs();
      if (cancelled || !tenant) return;
      channel = supabase!.channel("adm-msgs-" + tenant + "-" + Math.random().toString(36).slice(2))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `tenant_id=eq.${tenant}` }, () => loadMsgs())
        .subscribe();
    })();
    return () => { cancelled = true; if (channel && supabase) supabase.removeChannel(channel); };
  }, [loadMsgs]);

  // hilos: agrupa por client_profile_id
  const threadsMap: Record<string, any> = {};
  all.forEach((m) => {
    const k = m.client_profile_id;
    if (!threadsMap[k]) threadsMap[k] = { client: k, last: m, unread: 0 };
    threadsMap[k].last = m;
    if (m.sender_profile_id === m.client_profile_id && !m.read_at) threadsMap[k].unread++;
  });
  const threads = Object.values(threadsMap).sort((a: any, b: any) => (a.last.created_at < b.last.created_at ? 1 : -1));
  const thread = all.filter((m) => m.client_profile_id === sel);

  async function openThread(c: string) {
    setSel(c);
    if (!supabase) return;
    await supabase.from("messages").update({ read_at: new Date().toISOString() }).eq("client_profile_id", c).neq("sender_profile_id", uid).is("read_at", null);
    loadMsgs();
  }
  useEffect(() => { if (sel) endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread.length, sel]);

  async function send() {
    if (!supabase || !text.trim() || !sel) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({ tenant_id: tid, client_profile_id: sel, sender_profile_id: uid, body: text.trim() });
    setSending(false);
    if (!error) { setText(""); loadMsgs(); }
  }

  return (
    <AdminLayout title="Mensajes">
      {!sel ? (
        <>
          <div className="newrow">
            <select className="input" value="" onChange={(e) => e.target.value && openThread(e.target.value)}>
              <option value="">＋ Escribir a un cliente…</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name || "Sin nombre"}</option>)}
            </select>
          </div>
          {threads.length === 0 ? <p className="empty">No hay conversaciones todavía.</p> : (
            <div className="list">
              {threads.map((t: any) => (
                <button className="thr" key={t.client} onClick={() => openThread(t.client)}>
                  <div className="tl">
                    <span className="tn">{names[t.client] || "Cliente"}</span>
                    <span className="tp">{t.last.sender_profile_id === uid ? "Vos: " : ""}{t.last.body}</span>
                  </div>
                  {t.unread > 0 && <span className="badge">{t.unread}</span>}
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <button className="back" onClick={() => setSel("")}>‹ Conversaciones</button>
          <h2 className="who">{names[sel] || "Cliente"}</h2>
          <div className="thread">
            {thread.length === 0 && <p className="empty">Sin mensajes. Escribí el primero.</p>}
            {thread.map((m) => {
              const mine = m.sender_profile_id === uid;
              return (
                <div className={"bubble" + (mine ? " mine" : "")} key={m.id}>
                  <span className="btext">{m.body}</span>
                  <span className="bt">{new Date(m.created_at).toLocaleTimeString("es-CR", { hour: "2-digit", minute: "2-digit" })}</span>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          <div className="composer">
            <input className="input" placeholder="Escribí una respuesta…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }} />
            <button className="btn btn-primary" disabled={sending || !text.trim()} onClick={send}>Enviar</button>
          </div>
        </>
      )}

      <style>{`
        .newrow{margin-bottom:14px}
        .list{display:flex;flex-direction:column;gap:8px}
        .thr{display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;text-align:left;background:var(--surface);border:1px solid var(--line);border-radius:var(--r);padding:14px 16px;cursor:pointer;font:inherit;color:inherit}
        .thr:hover{border-color:var(--line-2)}
        .tl{display:flex;flex-direction:column;gap:3px;min-width:0}
        .tn{font-weight:700;font-size:15px}
        .tp{font-size:13px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70vw}
        .badge{background:var(--primary);color:var(--primary-ink);border-radius:999px;font-size:11px;font-weight:800;padding:2px 8px;flex:0 0 auto}
        .back{background:none;border:none;color:var(--primary);font:inherit;font-weight:600;font-size:14px;cursor:pointer;padding:0;margin-bottom:6px}
        .who{font-family:var(--fd);font-weight:900;font-size:22px;margin-bottom:8px}
        .thread{display:flex;flex-direction:column;gap:8px;padding:8px 0 16px;min-height:42vh}
        .bubble{max-width:80%;align-self:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:16px 16px 16px 4px;padding:10px 14px;display:flex;flex-direction:column;gap:3px}
        .bubble.mine{align-self:flex-end;background:var(--primary);border-color:var(--primary);border-radius:16px 16px 4px 16px}
        .btext{font-size:14.5px;line-height:1.45;white-space:pre-wrap}
        .bubble.mine .btext{color:var(--primary-ink)}
        .bt{font-size:10.5px;color:var(--faint);align-self:flex-end}
        .bubble.mine .bt{color:rgba(6,20,12,.6)}
        .composer{position:sticky;bottom:calc(88px + env(safe-area-inset-bottom));display:flex;gap:8px;background:var(--bg);padding:12px 0;border-top:1px solid var(--line)}
        .composer .input{flex:1}
        @media(min-width:820px){.composer{bottom:16px}}
        .empty{color:var(--muted);font-size:14px}
      `}</style>
    </AdminLayout>
  );
}