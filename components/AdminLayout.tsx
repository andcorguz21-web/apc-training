import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Brand from "@/components/Brand";

const I = {
  grid: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  cal: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9h18M8 3v3M16 3v3"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0M16 5.4a3.2 3.2 0 0 1 0 6.1M16.5 20a5.5 5.5 0 0 0-2-4.3"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>,
  wallet: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="13" rx="2"/><path d="M3 10h18M16 14.5h2"/></svg>,
  sliders: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7h10M4 17h6"/><circle cx="18" cy="7" r="2.4"/><circle cx="14" cy="17" r="2.4"/></svg>,
};
const TABS = [
  { href: "/admin", label: "Resumen", icon: I.grid },
  { href: "/admin/agenda", label: "Agenda", icon: I.cal },
  { href: "/admin/clientes", label: "Clientes", icon: I.users },
  { href: "/admin/horarios", label: "Horarios", icon: I.clock },
  { href: "/admin/pagos", label: "Pagos", icon: I.wallet },
];

export default function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const router = useRouter();
  const [ok, setOk] = useState(false);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      const { data } = await supabase!.from("profiles").select("role").eq("id", session.user.id).single();
      if (data && (data.role === "admin" || data.role === "superadmin")) setOk(true);
      else router.replace("/app");
    });
  }, [router]);

  async function logout() { await supabase?.auth.signOut(); router.replace("/login"); }
  if (!ok) return <div style={{ minHeight: "100vh" }} />;
  const on = (h: string) => (h === "/admin" ? router.pathname === "/admin" : router.pathname.startsWith(h));

  return (
    <div className="adm">
      <header className="adm-top">
        <div className="container row">
          <Brand size={150} />
          <nav className="adm-topnav">
            {TABS.map((t) => <Link key={t.href} href={t.href} className={on(t.href) ? "on" : ""}>{t.label}</Link>)}
          </nav>
          <div className="adm-actions">
            <Link href="/admin/ajustes" className={"gear" + (["/admin/ajustes", "/admin/branding", "/admin/precios", "/admin/mensajes", "/admin/rutinas"].includes(router.pathname) ? " on" : "")} aria-label="Ajustes">{I.sliders}</Link>
            <button className="btn btn-ghost btn-sm" onClick={logout}>Salir</button>
          </div>
        </div>
      </header>

      <main className="adm-body container">
        <h1 className="adm-title">{title}</h1>
        {children}
      </main>

      <nav className="adm-tabs">
        {TABS.map((t) => <Link key={t.href} href={t.href} className={"adm-tab" + (on(t.href) ? " on" : "")}>{t.icon}<span>{t.label}</span></Link>)}
      </nav>

      <style>{`
        .adm{min-height:100vh}
        .adm-top{position:sticky;top:0;z-index:30;background:rgba(10,15,13,.8);backdrop-filter:blur(14px);border-bottom:1px solid var(--line)}
        .adm-top .row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 0}
        .adm-topnav{display:none}
        .adm-actions{display:flex;align-items:center;gap:10px}
        .gear{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border:1px solid var(--line-2);border-radius:var(--r-sm);color:var(--muted)}
        .gear svg{width:18px;height:18px}
        .gear.on,.gear:hover{color:var(--primary);border-color:var(--primary)}
        .adm-body{padding-top:26px;padding-bottom:calc(82px + env(safe-area-inset-bottom));min-height:60vh}
        .adm-title{font-family:var(--fd);font-weight:900;font-size:clamp(26px,5vw,38px);letter-spacing:-.02em;margin-bottom:24px}
        .adm-tabs{position:fixed;left:0;right:0;bottom:0;z-index:30;display:flex;background:rgba(10,15,13,.92);backdrop-filter:blur(14px);border-top:1px solid var(--line);padding:8px 4px calc(8px + env(safe-area-inset-bottom))}
        .adm-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;color:var(--faint);font-size:10px;font-weight:600}
        .adm-tab svg{width:21px;height:21px}
        .adm-tab.on{color:var(--primary)}
        @media(min-width:820px){
          .adm-topnav{display:flex;gap:22px;align-items:center}
          .adm-topnav a{color:var(--muted);font-weight:600;font-size:14px}
          .adm-topnav a.on{color:var(--primary)}
          .adm-tabs{display:none}
          .adm-body{padding-bottom:48px}
        }
      `}</style>
    </div>
  );
}