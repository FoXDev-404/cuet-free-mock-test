"use client";

import { useEffect, useState } from "react";

export function AdSenseLoader() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const enabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
    const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT;
    if (!enabled || !client || client === "pub-XXXXXXXXXXXXXXXXXXXX") {
      setLoaded(false);
      return;
    }
    if (loaded) return;
    const script = document.createElement("script");
    script.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + client;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
    script.onload = () => setLoaded(true);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, [loaded]);

  return null;
}
