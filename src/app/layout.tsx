import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientShell } from "@/components/layout/ClientShell";
import { AdSenseLoader } from "@/components/ads/AdSenseLoader";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  title: "CUETFreeMockTest — Free CUET (UG) Mock Tests & Practice",
  description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking. Not affiliated with NTA.",
  metadataBase: new URL(siteUrl),
  openGraph: {
    title: "CUETFreeMockTest — Free CUET (UG) Mock Tests & Practice",
    description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking. Not affiliated with NTA.",
    url: siteUrl,
    siteName: "CUETFreeMockTest",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "CUETFreeMockTest — Free CUET (UG) Mock Tests & Practice",
    description: "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        <ClientShell>{children}</ClientShell>
        <AdSenseLoader />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "CUETFreeMockTest",
              "url": siteUrl,
              "description": "Free CUET (UG) mock tests, practice questions, PYQs and performance tracking.",
              "publisher": {
                "@type": "Organization",
                "name": "CUETFreeMockTest",
                "url": siteUrl,
              },
            }),
          }}
        />
      </body>
    </html>
  );
}
