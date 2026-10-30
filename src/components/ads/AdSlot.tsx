"use client";

import { useEffect } from "react";

interface AdSlotProps {
  adSlot: string;
  adFormat?: "auto" | "rectangle" | "leaderboard";
  style?: React.CSSProperties;
}

export function AdSlot({ adSlot, adFormat = "auto", style }: AdSlotProps) {
  const enabled = process.env.NEXT_PUBLIC_ADSENSE_ENABLED === "true";
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";
  const isDevOrDisabled = !enabled || !client || client === "pub-XXXXXXXXXXXXXXXXXXXX";

  const widthMap: Record<string, string> = {
    auto: "auto",
    rectangle: "300x250",
    leaderboard: "728x90",
  };

  // Register the slot with the AdSense queue once its client script (loaded by
  // <AdSenseLoader/>) is present; no local state tracking is needed.
  useEffect(() => {
    if (typeof window === "undefined" || isDevOrDisabled) return;
    const win = window as unknown as { adsbygoogle?: unknown[] };
    if (!win.adsbygoogle) return;
    win.adsbygoogle.push({});
  }, [adSlot, isDevOrDisabled]);

  if (isDevOrDisabled) {
    return (
      <div
        className="flex items-center justify-center border-2 border-dashed border-neutral-300 bg-neutral-50 dark:bg-neutral-800/30 dark:border-neutral-700 rounded-lg text-neutral-400 dark:text-neutral-500 text-xs font-mono"
        style={style}
      >
        [Ad slot: {adSlot}] (disabled in dev)
      </div>
    );
  }

  return (
    <div
      className="min-w-[200px]"
      style={style}
    >
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={client}
        data-ad-slot={adSlot}
        data-ad-format={widthMap[adFormat]}
      ></ins>
    </div>
  );
}
