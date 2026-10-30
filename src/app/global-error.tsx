"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Root error boundary. It replaces the root layout, so it must render its own
 * <html> and <body>. Inline styles keep the fallback readable even if the main
 * stylesheet failed to load.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Root application error", error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>Something went wrong — CUETFreeMockTest.Com</title>
        <meta name="robots" content="noindex, nofollow" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          padding: "24px",
        }}
      >
        <main style={{ maxWidth: "520px", textAlign: "center" }}>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              color: "#4f46e5",
            }}
          >
            Application error
          </p>
          <h1 style={{ margin: "12px 0 0", fontSize: "30px", lineHeight: 1.2 }}>
            Something went wrong
          </h1>
          <p style={{ margin: "12px 0 0", color: "#475569", lineHeight: 1.6 }}>
            The application hit an unexpected error. Your practice data is safe. Reload the page to try again.
          </p>
          <div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={retry}
              style={{
                border: 0,
                borderRadius: "10px",
                background: "#4f46e5",
                color: "#fff",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                borderRadius: "10px",
                border: "1px solid #cbd5e1",
                background: "#fff",
                color: "#0f172a",
                padding: "10px 18px",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
