import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/AdminLayout";
import { supabase } from "@/lib/supabase";

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <div className="fld"><label>{label}</label><input className="input" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} /></div>;
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return <div className="fld"><label>{label}</label><div className="crow"><input type="color" className="cpick" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} /><input className="input mono" value={value} onChange={(e) => onChange(e.target.value)} /></div></div>;
}

const COLS = "name,tagline,coach_name,logo_url,sinpe_number,sinpe_name,whatsapp,contact_phone,contact_email,brand_primary,brand_ink,brand_bg";

export default function Branding() {
  const [tid, setTid] = useState("");
  const [f, setF] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async (id: string) => {
    if (!supabase) return;
    const { data } = await supabase.from("tenants").select(COLS).eq("id", id).single();
    setF(data);
  }, []);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;
      const { data: prof } = await supabase!.from("profiles").select("tenant_id").eq("id", session.user.id).single();
      if (prof?.tenant_id) { setTid(prof.tenant_id); load(prof.tenant_id); }
    });
  }, [load]);

  const set = (k: string, v: string) => setF((p: any) => ({ ...p, [k]: v }));

  async function subirLogo(file: File) {
    if (!supabase || !tid || !file) return;
    setUploading(true); setMsg("");
    try {
      const uid = (await supabase.auth.getSession()).data.session?.user.id;
      if (!uid) { setMsg("Sesión no válida, volvé a entrar."); return; }
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${uid}/logo-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("brand-assets").upload(path, file, { cacheControl: "3600" });      if (up.error) { setMsg("Error subiendo el logo: " + up.error.message); return; }
      const url = supabase.storage.from("brand-assets").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from("tenants").update({ logo_url: url }).eq("id", tid);
      if (error) { setMsg("Se subió, pero no se guardó: " + error.message); return; }
      set("logo_url", url);
      setMsg("Logo actualizado ✓ (recargá para verlo en los encabezados)");
    } finally { setUploading(false); }
  }

  async function guardar() {
    if (!supabase || !tid) return;
    setSaving(true); setMsg("");
    const { error } = await supabase.from("tenants").update(f).eq("id", tid);
    setSaving(false);
    setMsg(error ? "Error: " + error.message : "Guardado ✓");
  }

  if (!f) return <AdminLayout title="Branding"><p style={{ color: "var(--muted)" }}>Cargando…</p></AdminLayout>;

  return (
    <AdminLayout title="Branding">
      <section className="bsec">
        <h2>Negocio</h2>
        <Field label="Nombre" value={f.name || ""} onChange={(v) => set("name", v)} />
        <Field label="Eslogan" value={f.tagline || ""} onChange={(v) => set("tagline", v)} />
        <Field label="Coach" value={f.coach_name || ""} onChange={(v) => set("coach_name", v)} />

        <div className="fld">
          <label>Logo</label>
          <div className="logorow">
            <div className="logoprev">{f.logo_url ? <img src={f.logo_url} alt="logo" /> : <span className="ph">sin logo</span>}</div>
            <div className="logoctrls">
              <label className="filebtn">
                {uploading ? "Subiendo…" : "Subir logo"}
                <input type="file" accept="image/*" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) subirLogo(fl); }} />
              </label>
              <input className="input" value={f.logo_url || ""} placeholder="o pegá una URL" onChange={(e) => set("logo_url", e.target.value)} />
            </div>
          </div>
        </div>
      </section>

      <section className="bsec">
        <h2>Pagos · SINPE Móvil</h2>
        <Field label="Número SINPE" value={f.sinpe_number || ""} onChange={(v) => set("sinpe_number", v)} placeholder="8888-8888" />
        <Field label="Titular de la cuenta" value={f.sinpe_name || ""} onChange={(v) => set("sinpe_name", v)} placeholder="Axel Padilla" />
      </section>

      <section className="bsec">
        <h2>Contacto</h2>
        <Field label="WhatsApp" value={f.whatsapp || ""} onChange={(v) => set("whatsapp", v)} />
        <Field label="Teléfono" value={f.contact_phone || ""} onChange={(v) => set("contact_phone", v)} />
        <Field label="Correo" value={f.contact_email || ""} onChange={(v) => set("contact_email", v)} />
      </section>

      <section className="bsec">
        <h2>Colores</h2>
        <div className="grid2c">
          <ColorField label="Primario (acento)" value={f.brand_primary || ""} onChange={(v) => set("brand_primary", v)} />
          <ColorField label="Fondo oscuro" value={f.brand_ink || ""} onChange={(v) => set("brand_ink", v)} />
          <ColorField label="Fondo claro" value={f.brand_bg || ""} onChange={(v) => set("brand_bg", v)} />
        </div>
        <div className="preview" style={{ background: f.brand_ink || "#0a0f0d", border: "1px solid var(--line)" }}>
          {f.logo_url ? <img src={f.logo_url} alt="logo" style={{ height: 30, width: "auto", objectFit: "contain" }} />
            : <span style={{ fontFamily: "var(--fd)", fontWeight: 900, fontSize: 22, color: "#ECEAE3" }}>{f.name || "APC"}</span>}
          <span style={{ color: "#9C9A92", fontSize: 13 }}>{f.tagline}</span>
          <span style={{ alignSelf: "flex-start", marginTop: 6, background: f.brand_primary || "#16a34a", color: f.brand_ink || "#06140c", fontWeight: 700, fontSize: 13, padding: "9px 16px", borderRadius: 8 }}>Reservar</span>
        </div>
      </section>

      <div className="savebar">
        <button className="btn btn-primary" disabled={saving} onClick={guardar}>{saving ? "Guardando…" : "Guardar cambios"}</button>
        {msg && <span className="saved" style={{ color: msg.startsWith("Error") ? "var(--danger)" : "var(--primary)" }}>{msg}</span>}
      </div>

      <style>{`
        .bsec{background:var(--surface);border:1px solid var(--line);border-radius:var(--r-lg);padding:20px;margin-bottom:16px}
        .bsec h2{font-family:var(--fd);font-weight:900;font-size:18px;margin-bottom:16px}
        .fld{margin-bottom:14px}
        .fld label{display:block;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin-bottom:6px}
        .grid2c{display:grid;grid-template-columns:1fr;gap:0 16px}
        @media(min-width:640px){.grid2c{grid-template-columns:1fr 1fr 1fr}}
        .crow{display:flex;gap:10px;align-items:center}
        .cpick{width:46px;height:46px;flex:0 0 auto;border:1px solid var(--line-2);border-radius:var(--r-sm);background:none;padding:2px;cursor:pointer}
        .mono{font-family:ui-monospace,SFMono-Regular,monospace}
        .logorow{display:flex;gap:14px;align-items:flex-start;flex-wrap:wrap}
        .logoprev{flex:0 0 auto;width:84px;height:84px;border:1px solid var(--line-2);border-radius:var(--r-sm);background:var(--bg);display:flex;align-items:center;justify-content:center;overflow:hidden}
        .logoprev img{max-width:100%;max-height:100%;object-fit:contain}
        .logoprev .ph{color:var(--faint);font-size:12px}
        .logoctrls{flex:1;min-width:220px;display:flex;flex-direction:column;gap:10px}
        .filebtn{display:inline-flex;align-items:center;justify-content:center;align-self:flex-start;position:relative;overflow:hidden;background:transparent;border:1px solid var(--line-2);color:var(--ink);border-radius:var(--r-sm);padding:10px 18px;font-weight:700;font-size:14px;cursor:pointer}
        .filebtn:hover{border-color:var(--primary);color:var(--primary)}
        .filebtn input{position:absolute;inset:0;opacity:0;cursor:pointer}
        .preview{display:flex;flex-direction:column;gap:8px;border-radius:var(--r);padding:20px;margin-top:8px}
        .savebar{display:flex;align-items:center;gap:14px;margin:4px 0 8px}
        .saved{font-weight:600;font-size:14px}
      `}</style>
    </AdminLayout>
  );
}