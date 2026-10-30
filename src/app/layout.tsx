import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ClientShell } from "@/components/layout/ClientShell";
import { AdSenseLoader } from "@/components/ads/AdSenseLoader";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "Free Online CUET Mock Test | NTA Pattern Based Practice Papers",
    template: `%s | ${SITE_NAME}`,
  },
  description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking. Not affiliated with NTA.",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    title: "Free Online CUET Mock Test | NTA Pattern Based Practice Papers",
    description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking. Not affiliated with NTA.",
    url: SITE_URL,
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online CUET Mock Test | NTA Pattern Based Practice Papers",
    description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking.",
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 } },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#020617" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking.",
  publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ClientShell>{children}</ClientShell>
        <AdSenseLoader />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </body>
    </html>
  );
}
