import { useEffect, useState, useRef, useCallback } from "react";
import ClientLayout, { useClient } from "@/components/ClientLayout";
import { supabase } from "@/lib/supabase";

export default function MensajesPage() { return <ClientLayout><Mensajes /></ClientLayout>; }

function Mensajes() {
  const { tenantId } = useClient();
  const [uid, setUid] = useState("");
  const [msgs, setMsgs] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (myId: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("messages")
      .select("id, body, sender_profile_id, created_at")
      .eq("client_profile_id", myId).order("created_at", { ascending: true });
    setMsgs(data ?? []);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let channel: any = null;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase!.auth.getSession();
      if (!session || cancelled) return;
      const id = session.user.id; setUid(id);
      await load(id);
      await supabase!.from("messages").update({ read_at: new Date().toISOString() }).eq("client_profile_id", id).neq("sender_profile_id", id).is("read_at", null);
      if (cancelled) return;
      channel = supabase!.channel("msgs-" + id + "-" + Math.random().toString(36).slice(2))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `client_profile_id=eq.${id}` },
          (payload: any) => setMsgs((prev) => prev.some((m) => m.id === payload.new.id) ? prev : [...prev, payload.new]))
        .subscribe();
    })();
    return () => { cancelled = true; if (channel && supabase) supabase.removeChannel(channel); };
  }, [load]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send() {
    if (!supabase || !text.trim() || !uid) return;
    setSending(true);
    const { data, error } = await supabase.from("messages")
      .insert({ tenant_id: tenantId, client_profile_id: uid, sender_profile_id: uid, body: text.trim() })
      .select("id, body, sender_profile_id, created_at").single();
    setSending(false);
    if (!error) { setText(""); if (data) setMsgs((prev) => prev.some((m) => m.id === data.id) ? prev : [...prev, data]); }
  }

  return (
    <div className="container">
      <h1 className="ttl">Mensajes</h1>
      <p className="sub">Chat directo con tu coach.</p>
      <div className="thread">
        {msgs.length === 0 && <p className="empty">Escribile a tu coach. Te responde por acá.</p>}
        {msgs.map((m) => {
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
        <input className="input" placeholder="Escribí un mensaje…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }} />
        <button className="btn btn-primary" disabled={sending || !text.trim()} onClick={send}>Enviar</button>
      </div>

      <style>{`
        .ttl{font-family:var(--fd);font-weight:900;font-size:clamp(32px,9vw,48px);letter-spacing:-.02em;padding-top:30px}
        .sub{color:var(--muted);font-size:14.5px;margin-top:6px}
        .thread{display:flex;flex-direction:column;gap:8px;padding:18px 0 16px;min-height:46vh}
        .bubble{max-width:80%;align-self:flex-start;background:var(--surface);border:1px solid var(--line);border-radius:16px 16px 16px 4px;padding:10px 14px;display:flex;flex-direction:column;gap:3px}
        .bubble.mine{align-self:flex-end;background:var(--primary);border-color:var(--primary);border-radius:16px 16px 4px 16px}
        .btext{font-size:14.5px;line-height:1.45;white-space:pre-wrap}
        .bubble.mine .btext{color:var(--primary-ink)}
        .bt{font-size:10.5px;color:var(--faint);align-self:flex-end}
        .bubble.mine .bt{color:rgba(6,20,12,.6)}
        .empty{color:var(--muted);font-size:14px}
        .composer{position:sticky;bottom:calc(74px + env(safe-area-inset-bottom));display:flex;gap:8px;background:var(--bg);padding:12px 0;border-top:1px solid var(--line)}
        .composer .input{flex:1}
        @media(min-width:760px){.composer{bottom:16px}}
      `}</style>
    </div>
  );
}