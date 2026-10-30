import { ImageResponse } from "next/og";

export const SOCIAL_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/**
 * Shared social card. Kept in one place so the Open Graph and Twitter file
 * conventions always render the same branded image.
 */
export function renderSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 55%, #312e81 100%)",
          color: "#ffffff",
          padding: "72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              background: "#6366f1",
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            C
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: "30px", fontWeight: 700 }}>CUETFreeMockTest.Com</div>
            <div style={{ fontSize: "20px", color: "#c7d2fe" }}>Practice with purpose</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ fontSize: "64px", fontWeight: 800, lineHeight: 1.1, letterSpacing: "-1px" }}>
            Free CUET UG Mock Tests
          </div>
          <div style={{ fontSize: "30px", color: "#e0e7ff" }}>
            NTA-pattern practice · Previous year papers · Performance analytics
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "16px", fontSize: "22px", color: "#c7d2fe" }}>
          <span>2022–2026 papers</span>
          <span>•</span>
          <span>Timed attempts</span>
          <span>•</span>
          <span>Free to start</span>
        </div>
      </div>
    ),
    SOCIAL_IMAGE_SIZE,
  );
}
