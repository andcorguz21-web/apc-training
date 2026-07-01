import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { supabase } from "@/lib/supabase";
import Brand from "@/components/Brand";

const TENANT_ID = "109fe445-0938-4d05-a693-debc25d1caa8";

function traducirError(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "Correo o contraseña incorrectos.";
  if (m.includes("already registered")) return "Ese correo ya está registrado. Probá iniciar sesión.";
  if (m.includes("at least 6")) return "La contraseña debe tener al menos 6 caracteres.";
  if (m.includes("unable to validate email")) return "Revisá el formato del correo.";
  return "Algo salió mal. Intentá de nuevo.";
}

export default function Login() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  useEffect(() => { if (router.query.mode === "signup") setMode("signup"); }, [router.query.mode]);

  // Redirección por rol: admin -> /admin, cliente -> /app
  async function routeByRole() {
    if (!supabase) return;
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { data } = await supabase.from("profiles").select("role").eq("id", session.user.id).single();
    const role = data?.role;
    router.push(role === "admin" || role === "superadmin" ? "/admin" : "/app");
  }

  async function handleSubmit() {
    setError(""); setInfo("");
    if (!supabase) { setError("Falta configurar Supabase (.env.local)."); return; }
    if (!email || !password) { setError("Completá correo y contraseña."); return; }
    if (mode === "signup" && !fullName) { setError("Decinos tu nombre."); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName, phone, tenant_id: TENANT_ID } } });
        if (error) { setError(traducirError(error.message)); return; }
        if (data.session) { await routeByRole(); }
        else {
          const { error: e2 } = await supabase.auth.signInWithPassword({ email, password });
          if (e2) setInfo("Cuenta creada. Revisá tu correo para confirmar."); else await routeByRole();
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) { setError(traducirError(error.message)); return; }
        await routeByRole();
      }
    } finally { setLoading(false); }
  }

  const isSignup = mode === "signup";

  return (
    <>
      <Head><title>{isSignup ? "Crear cuenta" : "Ingresar"} — APC Hybrid Training</title></Head>
      <main className="au">
        <div className="au-aurora" /><div className="au-grain" />

        <aside className="au-brand">
          <div className="au-brandtop"><Brand size={28} /><span className="mono dim">HYBRID TRAINING</span></div>
          <div className="au-brandmid">
            <h2 className="au-quote">Entrená<br />con <em>intención</em>.</h2>
            <p className="au-qsub">Reservá, pagá y seguí tu plan — todo en un solo lugar.</p>
          </div>
          <div className="mono dim">SAN JOSÉ · COSTA RICA</div>
          <span className="au-ghost">APC</span>
        </aside>

        <section className="au-panel">
          <div className="au-card">
            <div className="au-mobilebrand"><Brand size={24} /></div>
            <span className="mono eyebrow">{isSignup ? "NUEVA CUENTA" : "BIENVENIDO DE VUELTA"}</span>
            <h1 className="au-h1">{isSignup ? "Creá tu cuenta" : "Ingresá"}</h1>
            <p className="au-lead">{isSignup ? "Te registrás y el coach aprueba tu cuenta para empezar a reservar." : "Reservá tus clases y seguí tu plan."}</p>

            {error && <div className="au-banner err">{error}</div>}
            {info && <div className="au-banner ok">{info}</div>}

            {isSignup && (
              <>
                <label className="au-lbl">Nombre completo</label>
                <input className="au-inp" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Tu nombre" />
                <label className="au-lbl">WhatsApp <span className="au-opt">(opcional)</span></label>
                <input className="au-inp" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="8888-8888" />
              </>
            )}

            <label className="au-lbl">Correo</label>
            <input className="au-inp" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vos@correo.com" />

            <label className="au-lbl">Contraseña</label>
            <input className="au-inp" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />

            <button className="au-submit" onClick={handleSubmit} disabled={loading}>
              {loading ? "Un momento…" : isSignup ? "Crear cuenta" : "Ingresar"} <span className="arr">→</span>
            </button>

            <p className="au-switch">
              {isSignup ? "¿Ya tenés cuenta?" : "¿Sos nuevo?"}{" "}
              <button className="au-link" onClick={() => { setMode(isSignup ? "login" : "signup"); setError(""); setInfo(""); }}>
                {isSignup ? "Ingresá" : "Creá una cuenta"}
              </button>
            </p>
            <Link href="/" className="au-back">← Volver al inicio</Link>
          </div>
        </section>

        <style>{`
          .au{--bone:#ECEAE3;position:relative;min-height:100vh;display:grid;grid-template-columns:1fr;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--fb,'Hanken Grotesk',system-ui,sans-serif)}
          .au a{text-decoration:none}
          .mono{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase}
          .dim{color:var(--faint)}.arr{display:inline-block;transition:transform .25s}
          .au-aurora{position:fixed;top:-25%;left:-15%;width:70vw;height:70vw;z-index:0;pointer-events:none;background:radial-gradient(circle,var(--primary) 0%,transparent 60%);filter:blur(60px);opacity:.14;animation:auroraB 16s ease-in-out infinite alternate}
          .au-grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.05;mix-blend-mode:overlay;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
          .au-brand{display:none}
          .au-panel{position:relative;z-index:2;display:flex;align-items:center;justify-content:center;padding:28px 22px;min-height:100vh}
          .au-card{width:100%;max-width:400px;display:flex;flex-direction:column}
          .au-mobilebrand{margin-bottom:30px}
          .eyebrow{color:var(--primary);margin-bottom:14px}
          .au-h1{font-family:var(--fd,'Archivo',sans-serif);font-weight:900;font-size:38px;letter-spacing:-.025em;line-height:1}
          .au-lead{color:var(--muted);font-size:14px;line-height:1.5;margin:10px 0 22px;max-width:340px}
          .au-lbl{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:16px 0 7px;display:block}
          .au-opt{color:var(--faint)}
          .au-inp{width:100%;background:var(--surface);border:1px solid var(--line-2);border-radius:var(--r-sm);padding:14px 15px;color:var(--ink);font-size:15px;font-family:inherit;transition:border-color .2s,box-shadow .2s,background .2s}
          .au-inp::placeholder{color:var(--faint)}
          .au-inp:focus{outline:none;border-color:var(--primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--primary) 22%,transparent);background:var(--bg)}
          .au-submit{margin-top:26px;display:inline-flex;align-items:center;justify-content:center;gap:9px;background:var(--primary);color:var(--primary-ink);border:none;border-radius:var(--r-sm);padding:16px;font-weight:700;font-size:15px;font-family:inherit;cursor:pointer;transition:filter .2s,transform .15s}
          .au-submit:hover{filter:brightness(1.08)}.au-submit:hover .arr{transform:translateX(4px)}
          .au-submit:active{transform:translateY(1px)}.au-submit:disabled{opacity:.6;cursor:default}
          .au-switch{font-size:14px;color:var(--muted);margin-top:20px;text-align:center}
          .au-link{background:none;border:none;color:var(--primary);font:inherit;font-weight:600;cursor:pointer;padding:0}
          .au-back{display:block;text-align:center;margin-top:22px;color:var(--faint);font-size:13px}
          .au-back:hover{color:var(--muted)}
          .au-banner{border-radius:var(--r-sm);padding:11px 13px;font-size:13.5px;line-height:1.4;margin-bottom:6px}
          .au-banner.err{background:rgba(224,86,79,.12);border:1px solid rgba(224,86,79,.4);color:#f4b4b4}
          .au-banner.ok{background:rgba(22,163,74,.12);border:1px solid rgba(22,163,74,.4);color:#9fe3b8}
          @media(min-width:900px){
            .au{grid-template-columns:1.05fr .95fr}
            .au-brand{position:relative;z-index:2;display:flex;flex-direction:column;justify-content:space-between;padding:46px;border-right:1px solid var(--line);overflow:hidden}
            .au-brandtop{display:flex;align-items:center;gap:14px}
            .au-quote{font-family:var(--fd,'Archivo',sans-serif);font-weight:900;font-size:clamp(40px,5vw,72px);line-height:.9;letter-spacing:-.03em}
            .au-quote em{font-style:normal;color:var(--primary)}
            .au-qsub{color:var(--muted);font-size:16px;line-height:1.55;max-width:380px;margin-top:22px}
            .au-ghost{position:absolute;right:-2vw;bottom:-6vh;font-family:var(--fd,'Archivo',sans-serif);font-weight:900;font-size:26vw;color:var(--ink);opacity:.03;letter-spacing:-.04em;pointer-events:none}
            .au-mobilebrand{display:none}
          }
          @keyframes auroraB{0%{transform:translate(0,0) scale(1)}100%{transform:translate(6%,-4%) scale(1.12)}}
          @media(prefers-reduced-motion:reduce){.au-aurora{animation:none}}
        `}</style>
      </main>
    </>
  );
}