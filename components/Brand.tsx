import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

let cache: { logo_url?: string | null; name?: string | null } | null = null;

export default function Brand({ size = 24 }: { size?: number }) {
  const [b, setB] = useState(cache);
  const [err, setErr] = useState(false);
  useEffect(() => {
    if (cache?.logo_url || !supabase) { if (cache) setB(cache); return; }
    supabase.from("public_tenant_branding").select("name, logo_url").eq("slug", "apc").single()
      .then(({ data }) => { cache = data || {}; setB(cache); setErr(false); });
  }, []);
  if (b?.logo_url && !err) {
    return <img src={b.logo_url} alt={b.name || "APC"} onError={() => setErr(true)} style={{ height: size, width: "auto", display: "block", objectFit: "contain" }} />;
  }
  return <span className="mark">APC<span className="dot">.</span></span>;
}