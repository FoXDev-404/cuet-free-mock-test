import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "CUET Leaderboards — Top Mock Test Scores",
  description:
    "See top CUET (UG) mock-test scores on this platform. Leaderboards are based only on eligible attempts submitted here, not official NTA ranks.",
  path: "/leaderboards",
});

export default function LeaderboardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
