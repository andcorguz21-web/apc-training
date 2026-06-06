import ClientLayout from "@/components/ClientLayout";

export default function Soon({ title, desc }: { title: string; desc: string }) {
  return (
    <ClientLayout>
      <div className="container" style={{ paddingTop: 40 }}>
        <h1 style={{ fontFamily: "var(--fd)", fontWeight: 900, fontSize: 34, letterSpacing: "-.02em" }}>{title}</h1>
        <p style={{ color: "var(--muted)", marginTop: 10, maxWidth: 460, lineHeight: 1.55 }}>{desc}</p>
        <span className="pill" style={{ marginTop: 18, color: "var(--amber)", borderColor: "var(--amber)" }}>Próximamente</span>
      </div>
    </ClientLayout>
  );
}