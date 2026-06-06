import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import Brand from "@/components/Brand";

type BrandT = { name: string; tagline: string | null; coach_name: string | null; brand_primary: string; brand_ink: string; brand_bg: string };
const FALLBACK: BrandT = { name: "APC Hybrid Training", tagline: "Entrenamiento funcional adaptado a vos.", coach_name: "Axel Padilla", brand_primary: "#16a34a", brand_ink: "#0a0f0d", brand_bg: "#f2f0eb" };

export default function Home() {
  const [brand, setBrand] = useState<BrandT>(FALLBACK);
  useEffect(() => {
    if (!supabase) return;
    supabase.from("public_tenant_branding").select("name, tagline, coach_name, brand_primary, brand_ink, brand_bg").eq("slug", "apc").single()
      .then(({ data }) => data && setBrand((b) => ({ ...b, ...data })));
  }, []);

  return (
    <>
      <Head>
        <title>{brand.name} — Reservá tu clase</title>
        <meta name="description" content={brand.tagline ?? ""} />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <main className="lp" style={{ ["--ink" as any]: brand.brand_ink, ["--primary" as any]: brand.brand_primary }}>
        <div className="lp-grid" /><div className="lp-aurora" /><div className="lp-grain" />
        <span className="lp-ghost">HYBRID</span>
        <div className="lp-frame" aria-hidden />

        <header className="lp-nav">
          <Brand size={26} />
          <div className="lp-navr">
            <span className="mono dim">SAN JOSÉ · CR</span>
            <Link href="/login" className="lp-enter">Ingresar <span className="arr">→</span></Link>
          </div>
        </header>

        <section className="lp-hero">
          <div className="lp-herotext">
            <span className="mono eyebrow"><i className="pulse" /> Reservas abiertas · entrenamiento funcional</span>
            <h1 className="lp-title">Entrená<br />con <em>intención</em><span className="per">.</span></h1>
            <p className="lp-sub">{brand.tagline}</p>
            <div className="lp-cta">
              <Link href="/login" className="lp-btn primary">Reservá tu clase <span className="arr">→</span></Link>
              <Link href="/login?mode=signup" className="lp-btn ghost">Crear cuenta</Link>
            </div>
          </div>
          <div className="lp-coachwrap">
            <img src="/coach.png" alt={`Coach ${brand.coach_name ?? "APC"}`} className="lp-coach" />
            <span className="lp-coachtag mono">COACH {(brand.coach_name || "").toUpperCase()}</span>
          </div>
        </section>

        <div className="lp-marquee" aria-hidden>
          <div className="lp-track">
            {Array.from({ length: 2 }).map((_, i) => (
              <span key={i}>Entrenamiento funcional <b>·</b> 5 cupos por clase <b>·</b> Rutinas 1:1 <b>·</b> Mensualidad o sesión suelta <b>·</b> San José, CR <b>·</b>&nbsp;</span>
            ))}
          </div>
        </div>

        <section className="lp-feats">
          {[
            { n: "01", t: "Reservá en segundos", d: "Elegí día y hora y mirá el cupo en vivo. Sin WhatsApp, sin enredos." },
            { n: "02", t: "Pagá como quieras", d: "Mensualidad o sesión suelta por SINPE. El coach confirma y listo." },
            { n: "03", t: "Tu plan, guiado", d: "Rutinas y dietas 1:1, y chat directo con tu coach." },
          ].map((f, i) => (
            <article className="lp-feat" key={f.n} style={{ animationDelay: `${0.5 + i * 0.08}s` }}>
              <span className="mono fn">{f.n}</span>
              <h3>{f.t}</h3><p>{f.d}</p>
            </article>
          ))}
        </section>

        <section className="lp-stats">
          <div className="st"><span className="stn">5</span><span className="stl">cupos por clase</span></div>
          <div className="st"><span className="stn">60′</span><span className="stl">minutos por sesión</span></div>
          <div className="st"><span className="stn">1:1</span><span className="stl">seguimiento del coach</span></div>
        </section>

        <footer className="lp-foot">
          <span className="mono">COACH {(brand.coach_name || "").toUpperCase()}</span>
          <span className="mono dim">© {new Date().getFullYear()} {brand.name}</span>
        </footer>

        <style>{CSS}</style>
      </main>
    </>
  );
}

const CSS = `
.lp{--bone:#ECEAE3;position:relative;min-height:100vh;overflow:hidden;display:flex;flex-direction:column;
  background:var(--ink,#0a0f0d);color:var(--bone);font-family:'Hanken Grotesk',system-ui,sans-serif;
  padding:clamp(18px,3.4vw,40px);isolation:isolate}
.lp a{text-decoration:none;color:inherit}
.mono{font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11px;letter-spacing:.22em;text-transform:uppercase}
.dim{color:#6E6C66}.arr{display:inline-block}
.lp-grid{position:fixed;inset:0;z-index:0;pointer-events:none;
  background-image:linear-gradient(rgba(236,234,227,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(236,234,227,.04) 1px,transparent 1px);
  background-size:64px 64px;-webkit-mask:radial-gradient(120% 90% at 70% 0,#000 30%,transparent 80%);mask:radial-gradient(120% 90% at 70% 0,#000 30%,transparent 80%)}
.lp-aurora{position:fixed;top:-30%;right:-15%;width:75vw;height:75vw;z-index:0;pointer-events:none;
  background:radial-gradient(circle,var(--primary,#16a34a) 0%,transparent 60%);filter:blur(60px);opacity:.18;animation:auroraA 16s ease-in-out infinite alternate}
.lp-grain{position:fixed;inset:0;z-index:0;pointer-events:none;opacity:.05;mix-blend-mode:overlay;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")}
.lp-ghost{position:fixed;left:-3vw;bottom:-9vh;z-index:0;pointer-events:none;user-select:none;
  font-family:'Archivo',sans-serif;font-weight:900;font-size:32vw;line-height:1;color:#fff;opacity:.022;letter-spacing:-.04em}
.lp-frame{position:fixed;inset:12px;z-index:1;pointer-events:none;border:1px solid rgba(236,234,227,.07);border-radius:4px}
.lp-frame::before,.lp-frame::after{content:"";position:absolute;width:14px;height:14px;border:1.5px solid var(--primary,#16a34a)}
.lp-frame::before{top:-1px;left:-1px;border-right:none;border-bottom:none}
.lp-frame::after{bottom:-1px;right:-1px;border-left:none;border-top:none}
.lp-nav,.lp-hero,.lp-marquee,.lp-feats,.lp-stats,.lp-foot{position:relative;z-index:2}
.lp-nav{display:flex;align-items:center;justify-content:space-between;gap:16px}
.lp-navr{display:flex;align-items:center;gap:20px}
.lp-enter{display:inline-flex;align-items:center;gap:8px;font-weight:600;font-size:14px}
.lp-enter .arr,.lp-btn.primary .arr{transition:transform .25s}
.lp-enter:hover .arr,.lp-btn.primary:hover .arr{transform:translateX(4px)}
.lp-hero{flex:1;display:grid;grid-template-columns:1fr;align-items:center;gap:8px;max-width:1100px;padding:4vh 0 2vh}
.lp-herotext{position:relative;z-index:2}
.eyebrow{display:inline-flex;align-items:center;gap:9px;color:var(--primary,#16a34a);margin-bottom:24px;opacity:0;animation:rise2 .7s .05s forwards}
.pulse{width:7px;height:7px;border-radius:50%;background:var(--primary,#16a34a);animation:pulse 2.2s infinite}
.lp-title{font-family:'Archivo',sans-serif;font-weight:900;font-size:clamp(46px,9.5vw,128px);line-height:.86;letter-spacing:-.04em;opacity:0;animation:rise2 .85s .12s forwards}
.lp-title em{font-style:normal;color:var(--primary,#16a34a)}.lp-title .per{color:var(--primary,#16a34a)}
.lp-sub{font-size:clamp(16px,2.1vw,21px);line-height:1.5;color:#B9B7AF;max-width:460px;margin-top:28px;opacity:0;animation:rise2 .85s .22s forwards}
.lp-cta{display:flex;flex-wrap:wrap;gap:13px;margin-top:36px;opacity:0;animation:rise2 .85s .32s forwards}
.lp-btn{display:inline-flex;align-items:center;gap:9px;padding:16px 26px;border-radius:3px;font-weight:700;font-size:15px;transition:transform .15s,filter .2s,border-color .2s,color .2s,background .2s}
.lp-btn:active{transform:translateY(1px)}
.lp-btn.primary{background:var(--primary,#16a34a);color:#06140c}
.lp-btn.primary:hover{filter:brightness(1.08)}
.lp-btn.ghost{border:1px solid rgba(236,234,227,.22)}
.lp-btn.ghost:hover{border-color:var(--primary,#16a34a);color:var(--primary,#16a34a)}
/* COACH flotante */
.lp-coachwrap{position:relative;display:flex;justify-content:center;align-items:flex-end;opacity:0;animation:rise2 .9s .28s forwards;margin-top:6px}
.lp-coachwrap::before{content:"";position:absolute;left:50%;top:46%;transform:translate(-50%,-50%);width:80%;height:78%;
  background:radial-gradient(circle,var(--primary,#16a34a) 0%,transparent 62%);filter:blur(56px);opacity:.26;z-index:0;pointer-events:none}
.lp-coach{position:relative;z-index:1;width:auto;max-height:42vh;height:auto;display:block;
  -webkit-mask-image:radial-gradient(82% 92% at 50% 42%,#000 60%,transparent 90%);
  mask-image:radial-gradient(82% 92% at 50% 42%,#000 60%,transparent 90%);
  animation:floatY 6s ease-in-out infinite;filter:drop-shadow(0 30px 50px rgba(0,0,0,.5))}
.lp-coachtag{position:absolute;bottom:6%;left:50%;transform:translateX(-50%);z-index:2;color:#9C9A92;
  background:rgba(10,15,13,.55);backdrop-filter:blur(6px);border:1px solid rgba(236,234,227,.12);border-radius:999px;padding:6px 14px;font-size:10px;white-space:nowrap}
.lp-marquee{margin:1vh calc(clamp(18px,3.4vw,40px) * -1) 0;border-top:1px solid rgba(236,234,227,.1);border-bottom:1px solid rgba(236,234,227,.1);overflow:hidden;padding:13px 0}
.lp-track{display:flex;white-space:nowrap;animation:marquee 30s linear infinite;will-change:transform}
.lp-track span{font-family:'JetBrains Mono',ui-monospace,monospace;font-size:13px;letter-spacing:.16em;text-transform:uppercase;color:#9C9A92}
.lp-track b{color:var(--primary,#16a34a);margin:0 4px}
.lp-feats{display:grid;grid-template-columns:1fr;border-bottom:1px solid rgba(236,234,227,.1)}
.lp-feat{padding:30px 4px;border-top:1px solid rgba(236,234,227,.1);opacity:0;animation:rise2 .8s forwards;transition:padding-left .25s}
.lp-feat:hover{padding-left:14px}
.lp-feat .fn{color:var(--primary,#16a34a);font-size:12px}
.lp-feat h3{font-family:'Archivo',sans-serif;font-weight:900;font-size:22px;letter-spacing:-.01em;margin:10px 0 8px}
.lp-feat p{color:#9C9A92;font-size:14.5px;line-height:1.55;max-width:520px}
.lp-stats{display:flex;flex-wrap:wrap;gap:clamp(28px,7vw,80px);padding:34px 0}
.st{display:flex;flex-direction:column;gap:4px}
.stn{font-family:'Archivo',sans-serif;font-weight:900;font-size:clamp(38px,6vw,64px);line-height:1;color:var(--primary,#16a34a);letter-spacing:-.02em}
.stl{font-size:13px;color:#9C9A92}
.lp-foot{display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;padding-top:8px}
@media(min-width:880px){
  .lp-hero{grid-template-columns:1.12fr .88fr;gap:24px;padding:5vh 0 3vh}
  .lp-coach{max-height:none;width:100%;max-width:440px}
  .lp-coachwrap{align-items:center;margin-top:0}
  .lp-feats{grid-template-columns:repeat(3,1fr)}
  .lp-feat{border-top:none;border-left:1px solid rgba(236,234,227,.1);padding:18px 26px 30px}
  .lp-feat:first-child{border-left:none;padding-left:0}
  .lp-feat:hover{padding-left:26px}.lp-feat:first-child:hover{padding-left:0}
}
@keyframes rise2{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
@keyframes floatY{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
@keyframes auroraA{0%{transform:translate(0,0) scale(1)}100%{transform:translate(-6%,4%) scale(1.12)}}
@keyframes marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(22,163,74,.5)}70%{box-shadow:0 0 0 9px rgba(22,163,74,0)}100%{box-shadow:0 0 0 0 rgba(22,163,74,0)}}
@media(prefers-reduced-motion:reduce){.lp *{animation:none!important}.lp-hero *,.lp-feat{opacity:1!important}}
`;