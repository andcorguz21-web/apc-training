import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function App({ Component, pageProps }: AppProps) {
  useEffect(() => {
    if (!supabase) return;
    supabase.from("public_tenant_branding").select("brand_primary, brand_ink").eq("slug", "apc").single()
      .then(({ data }) => {
        if (!data) return;
        const r = document.documentElement.style;
        if (data.brand_primary) r.setProperty("--primary", data.brand_primary);
        if (data.brand_ink) r.setProperty("--bg", data.brand_ink);
      });
  }, []);
  return <Component {...pageProps} />;
}