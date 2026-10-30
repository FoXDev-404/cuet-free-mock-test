import type { Metadata } from "next";
import { publicPageMetadata } from "@/lib/seo";

export const metadata: Metadata = publicPageMetadata({
  title: "CUET Subjects & Categories — Browse Practice Topics",
  description:
    "Browse CUET (UG) subjects and categories, including languages, domain subjects and the General Test, with free topic-wise practice questions.",
  path: "/categories",
});

export default function CategoriesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
