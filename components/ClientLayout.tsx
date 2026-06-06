import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Brand from "@/components/Brand";

type Ctx = { profile: any; tenantId: string };
const ClientCtx = createContext<Ctx>({ profile: null, tenantId: "" });
export const useClient = () => useContext(ClientCtx);

const I = {
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/></svg>,
  list: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>,
  pay: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/></svg>,
  dumb: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5v11M3.5 9v6M17.5 6.5v11M20.5 9v6M6.5 12h11"/></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l.9-5.2A8 8 0 1 1 21 12z"/></svg>,
};
const TABS = [
  { href: "/app", label: "Reservar", icon: I.cal },
  { href: "/app/reservas", label: "Mis reservas", icon: I.list },
  { href: "/app/pagos", label: "Pagos", icon: I.pay },
  { href: "/app/rutinas", label: "Rutinas", icon: I.dumb },
  { href: "/app/mensajes", label: "Mensajes", icon: I.chat },
];

export default function ClientLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [tenantId, setTenantId] = useState("");
  const [state, setState] = useState<"loading" | "ok" | "gate">("loading");

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      const { data } = await supabase!.from("profiles").select("full_name, approval_status, tenant_id").eq("id", session.user.id).single();
      setProfile(data); setTenantId(data?.tenant_id || "");
      setState(data?.approval_status === "approved" ? "ok" : "gate");
    });
  }, [router]);

  async function logout() { await supabase?.auth.signOut(); router.replace("/login"); }

  if (state === "loading") return <div style={{ minHeight: "100vh" }} />;

  if (state === "gate") {
    const rej = profile?.approval_status === "rejected";
    return (
      <main className="container cl-gate">
        <Brand size={24} />
        <h1 className="gh">Hola, {profile?.full_name}</h1>
        <p className="gp">{rej ? "Tu cuenta fue rechazada." : "Tu cuenta está pendiente de aprobación."} El coach la revisa antes de que puedas reservar.</p>
        <button className="btn btn-ghost" onClick={logout}>Cerrar sesión</button>
        <style>{CSS}</style>
      </main>
    );
  }

  const on = (href: string) => (href === "/app" ? router.pathname === "/app" : router.pathname.startsWith(href));

  return (
    <ClientCtx.Provider value={{ profile, tenantId }}>
      <header className="cl-top">
        <div className="container row">
          <Brand size={110} />
          <nav className="cl-topnav">
            {TABS.map((t) => <Link key={t.href} href={t.href} className={on(t.href) ? "on" : ""}>{t.label}</Link>)}
          </nav>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
        </div>
      </header>
      <div className="cl-body">{children}</div>
      <nav className="cl-tabs">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} className={"cl-tab" + (on(t.href) ? " on" : "")}>{t.icon}<span>{t.label}</span></Link>
        ))}
      </nav>
      <style>{CSS}</style>
    </ClientCtx.Provider>
  );
}

const CSS = `
.cl-top{position:sticky;top:0;z-index:30;background:rgba(10,15,13,.8);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
.cl-top .row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 0}
.cl-topnav{display:none}
.cl-body{min-height:100vh;padding-bottom:calc(80px + env(safe-area-inset-bottom))}
.cl-tabs{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;background:rgba(10,15,13,.92);
  backdrop-filter:blur(14px);border-top:1px solid var(--line);padding:8px 4px calc(8px + env(safe-area-inset-bottom))}
.cl-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--faint);font-size:10px;font-weight:600}
.cl-tab svg{width:22px;height:22px}
.cl-tab.on{color:var(--primary)}
.cl-gate{min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;gap:10px}
.cl-gate .gh{font-family:var(--fd);font-weight:900;font-size:34px;letter-spacing:-.02em;margin-top:18px}
.cl-gate .gp{color:var(--muted);font-size:15px;line-height:1.55;margin-bottom:10px;max-width:460px}
@media(min-width:760px){
  .cl-topnav{display:flex;gap:24px;align-items:center}
  .cl-topnav a{color:var(--muted);font-weight:600;font-size:14px}
  .cl-topnav a.on{color:var(--primary)}
  .cl-tabs{display:none}
  .cl-body{padding-bottom:40px}
}
`;