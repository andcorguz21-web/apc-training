import Link from "next/link";
import AdminLayout from "@/components/AdminLayout";

export default function Ajustes() {
  const items = [
    { href: "/admin/mensajes", t: "Mensajes", d: "Chat con tus clientes." },
    { href: "/admin/rutinas", t: "Rutinas", d: "Asigná entrenos y dietas." },
    { href: "/admin/branding", t: "Marca", d: "Nombre, logo, número SINPE y colores." },
    { href: "/admin/precios", t: "Precios", d: "Mensualidades y sesión suelta." },
  ];
  return (
    <AdminLayout title="Ajustes">
      <div className="hub">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="hcard">
            <span className="ht">{i.t}</span>
            <span className="hd">{i.d}</span>
            <span className="ha">→</span>
          </Link>
        ))}
      </div>
      <style>{`
        .hub{display:grid;grid-template-columns:1fr;gap:12px}
        @media(min-width:680px){.hub{grid-template-columns:1fr 1fr}}
        .hcard{position:relative;display:flex;flex-direction:column;gap:6px;background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:22px;text-decoration:none;transition:border-color .2s}
        .hcard:hover{border-color:var(--primary)}
        .ht{font-family:var(--fd);font-weight:900;font-size:20px}
        .hd{color:var(--muted);font-size:14px}
        .ha{position:absolute;top:20px;right:22px;color:var(--primary);font-size:18px}
      `}</style>
    </AdminLayout>
  );
}