import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientShell } from "@/components/layout/ClientShell";
import { AdSenseLoader } from "@/components/ads/AdSenseLoader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const siteName = "CUETFreeMockTest.Com";

export const metadata: Metadata = {
  title: {
    default: "Free Online CUET Mock Test | NTA Pattern Based Practice Papers",
    template: "%s | CUETFreeMockTest.Com",
  },
  description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking. Not affiliated with NTA.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "Free Online CUET Mock Test | NTA Pattern Based Practice Papers",
    description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking. Not affiliated with NTA.",
    url: siteUrl,
    siteName: "CUETFreeMockTest.Com",
    type: "website",
    locale: "en_IN",
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: "CUETFreeMockTest.Com - Free CUET UG Mock Tests" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free Online CUET Mock Test | NTA Pattern Based Practice Papers",
    description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking.",
    images: [`${siteUrl}/og-image.png`],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 } },
  icons: { icon: "/favicon.ico", shortcut: "/favicon-16x16.png", apple: "/apple-touch-icon.png" },
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
  name: "CUETFreeMockTest.Com",
  url: siteUrl,
  description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking.",
  publisher: { "@type": "Organization", name: "CUETFreeMockTest.Com", url: siteUrl },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${siteUrl}/search?q={search_term_string}` },
    "query-input": "required name=search_term_string",
  },
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
