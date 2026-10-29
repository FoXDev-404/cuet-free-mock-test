import { AdSlot } from "@/components/ads/AdSlot";

export default function BlogPage() {
  const posts = [
    { title: "How to use CUET mock tests effectively", excerpt: "A strategy for combining subject-wise practice with full-length mocks.", date: "Oct 2026" },
    { title: "CUET UG marking scheme explained", excerpt: "Understanding +5 / -1 / 0 and how it affects your attempt strategy.", date: "Oct 2026" },
    { title: "General Test preparation tips", excerpt: "Reasoning, general awareness and quantitative aptitude focus areas.", date: "Sep 2026" },
    { title: "Choosing your CUET subject combination", excerpt: "How to pick up to 5 subjects aligned with your target universities.", date: "Sep 2026" },
    { title: "Last 30 days before CUET", excerpt: "A revision plan using PYQs and chapter-wise tests.", date: "Aug 2026" },
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-neutral-900 dark:text-brand-50 mb-2">Blog</h1>
      <p className="text-neutral-600 dark:text-neutral-400 mb-8">
        Original preparation guides and strategy articles. (Sample drafts — fact-check before publishing.)
      </p>
      <div className="grid gap-4">
        {posts.map((p) => (
          <article key={p.title} className="card">
            <div className="text-xs text-neutral-400 mb-1">{p.date}</div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">{p.title}</h3>
            <p className="text-neutral-600 dark:text-neutral-300 text-sm">{p.excerpt}</p>
          </article>
        ))}
      </div>

      <div className="mt-12">
        <AdSlot adSlot="blog-banner" adFormat="leaderboard" style={{ margin: "0 auto", maxWidth: "728px" }} />
      </div>
    </section>
  );
}
