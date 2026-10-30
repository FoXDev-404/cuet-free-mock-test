export interface BlogSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  description: string;
  date: string;
  updated: string;
  readingMinutes: number;
  intro: string;
  sections: BlogSection[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-to-use-cuet-mock-tests-effectively",
    title: "How to use CUET mock tests effectively",
    excerpt: "A repeatable loop for turning every mock into a small, measurable improvement.",
    description:
      "A practical CUET mock-test routine: diagnose, drill, retest. Learn how to review errors, track accuracy by topic and avoid the trap of taking endless papers without changing anything.",
    date: "2026-10-12",
    updated: "2026-10-12",
    readingMinutes: 6,
    intro:
      "A mock test is only useful if it changes what you do next. Most learners take a paper, glance at the score and move on. A better loop is shorter and harder: diagnose the loss, drill the cause, then retest the same skill under time.",
    sections: [
      {
        heading: "1. Take the paper under exam conditions",
        paragraphs: [
          "Use one sitting, one screen and the real duration. Keep a rough paper for working but do not pause the clock to look something up. The point is to expose decision-making under pressure, not to produce a beautiful revision document.",
        ],
        bullets: [
          "Sit the paper at the same time of day as your likely exam shift.",
          "Turn off notifications and keep water nearby so you do not leave mid-paper.",
          "If you must guess, guess deliberately and note the question number.",
        ],
      },
      {
        heading: "2. Classify every lost mark",
        paragraphs: [
          "After submission, sort mistakes into three buckets: knowledge gap (you did not know the concept), execution error (you knew it but misread or miscalculated), and strategy error (you spent too long or guessed badly). Each bucket needs a different fix.",
        ],
        bullets: [
          "Knowledge gap → revise the concept and do five focused questions.",
          "Execution error → slow down on the exact step that broke; rewrite the working.",
          "Strategy error → set a per-question time cap in the next paper.",
        ],
      },
      {
        heading: "3. Drill one weakness, not ten",
        paragraphs: [
          "Pick the topic with the largest mark loss and spend the next session only on it. Ten scattered questions across ten chapters feel productive but rarely move a score. Twenty questions on one weak chapter create a visible before-and-after.",
        ],
      },
      {
        heading: "4. Retest within 48 hours",
        paragraphs: [
          "Take a short timed set on the same topic while the review is fresh. If accuracy improves, keep the method. If it does not, the problem was probably the explanation you used, not the number of questions.",
        ],
      },
      {
        heading: "5. Track accuracy, not just score",
        paragraphs: [
          "Score mixes difficulty, marking and luck. Accuracy on attempted questions and the number of unattempted questions tell you whether the improvement is real. A rising score with falling accuracy usually means the paper was easier, not that you improved.",
        ],
      },
    ],
  },
  {
    slug: "cuet-ug-marking-scheme-explained",
    title: "CUET UG marking scheme explained",
    excerpt: "What +5, −1 and 0 mean for your attempt strategy, with worked examples.",
    description:
      "Understand the CUET UG marking scheme: +5 for correct, −1 for incorrect, 0 for unattempted. See worked score examples and a practical rule for guessing.",
    date: "2026-10-10",
    updated: "2026-10-10",
    readingMinutes: 5,
    intro:
      "The marking scheme is not a footnote; it is the rules of the game. A paper with negative marking rewards accurate attempts and punishes panic guessing. Here is the arithmetic without the hype.",
    sections: [
      {
        heading: "The standard MCQ numbers",
        bullets: [
          "Correct answer: +5 marks.",
          "Incorrect answer: −1 mark.",
          "Unattempted question: 0 marks.",
        ],
        paragraphs: [
          "Confirm the current-year bulletin before relying on any pattern detail. The numbers above describe the standard multiple-choice paper used in recent cycles.",
        ],
      },
      {
        heading: "A worked example",
        paragraphs: [
          "Suppose you attempt 40 of 50 questions. You get 28 right and 12 wrong. Your score is 28 × 5 − 12 × 1 = 128 out of 250. The ten unattempted questions contribute nothing.",
          "Now suppose you attempt ten more questions and get four right and six wrong. The extra ten add 4 × 5 − 6 = 14 marks. That is positive, but only because four of the ten guesses landed. If only two had landed, the extra ten would have lost 4 marks.",
        ],
      },
      {
        heading: "The guessing rule",
        paragraphs: [
          "With four equally likely options, a blind guess has an expected value of +0.5 marks. That positive expectation is real, but it assumes you are truly indifferent between options. In practice, a guess made after eliminating two options is much better than a guess made in the last five seconds.",
        ],
        bullets: [
          "Guess when you can eliminate at least two options.",
          "Skip when the question is unreadable and time is short.",
          "Never let one hard question consume the time of three easy ones.",
        ],
      },
      {
        heading: "What normalisation means for you",
        paragraphs: [
          "When a subject is held in multiple shifts, NTA may normalise scores so candidates are compared fairly. You cannot control the shift you receive. You can control accuracy, which is the input that survives any reasonable normalisation.",
        ],
      },
    ],
  },
  {
    slug: "general-test-preparation-tips",
    title: "General Test preparation tips that actually transfer",
    excerpt: "Reasoning, quantitative aptitude and general awareness without a 300-hour video course.",
    description:
      "A focused CUET General Test plan: reasoning patterns, quantitative shortcuts, current-affairs habits and timed practice that transfers to the actual paper.",
    date: "2026-10-05",
    updated: "2026-10-05",
    readingMinutes: 7,
    intro:
      "The General Test rewards a broad base and fast decisions. You do not need to memorise an encyclopedia; you need reliable patterns, clean arithmetic and a habit of reading current affairs without drowning in it.",
    sections: [
      {
        heading: "Reasoning: learn the pattern families",
        paragraphs: [
          "Most reasoning questions are variations on a small set of families: series, analogies, blood relations, direction sense, syllogisms, coding-decoding and arrangement. Learn the family, then practise mixed sets so you have to identify the family yourself.",
        ],
        bullets: [
          "Keep a one-page sheet of symbol conventions for blood relations and directions.",
          "For arrangements, draw the constraint grid before reading the options.",
          "For syllogisms, test the conclusion against a Venn diagram, not intuition.",
        ],
      },
      {
        heading: "Quantitative aptitude: accuracy over tricks",
        paragraphs: [
          "Shortcuts help only when the underlying operation is clear. Build speed with percentages, ratios, averages, time-speed-distance and profit-loss, then add approximation for data interpretation.",
        ],
        bullets: [
          "Memorise fraction-to-percentage equivalents up to twelfths.",
          "Estimate before calculating; options often make exact work unnecessary.",
          "Do a five-minute mental-math warm-up before a timed section.",
        ],
      },
      {
        heading: "General awareness: a sustainable habit",
        paragraphs: [
          "Read a short daily digest and note five items: one national, one international, one economy, one science/technology and one sports/culture item. Review the week on Sunday. This beats a last-minute PDF dump because the items have context.",
        ],
      },
      {
        heading: "Practice in mixed sets",
        paragraphs: [
          "The exam does not label the topic for you. Once the basics are comfortable, practise mixed 20-question sets under a time cap. The skill being tested is switching between reasoning styles without losing accuracy.",
        ],
      },
    ],
  },
  {
    slug: "choosing-your-cuet-subject-combination",
    title: "Choosing your CUET subject combination",
    excerpt: "Start from the university programme, then work backwards to the subjects you can score in.",
    description:
      "How to choose CUET UG subjects: map target university programmes to required subjects, balance scoring potential and avoid combinations that close doors later.",
    date: "2026-09-24",
    updated: "2026-09-24",
    readingMinutes: 6,
    intro:
      "Subject selection is a strategy decision, not a prestige decision. The right combination satisfies the programmes you actually want and gives you a realistic chance to score well.",
    sections: [
      {
        heading: "1. List target programmes first",
        paragraphs: [
          "Write down five to ten programmes you would genuinely consider. For each, check the university's current eligibility page: which CUET subjects are required, which are optional and whether a language paper is mandatory.",
        ],
      },
      {
        heading: "2. Build a requirement matrix",
        paragraphs: [
          "Create a table with programmes as rows and subjects as columns. Mark required, recommended and irrelevant. A combination that covers your top three programmes is usually stronger than one chosen for a single dream course.",
        ],
      },
      {
        heading: "3. Balance requirement and scoring",
        paragraphs: [
          "A required subject you consistently score poorly in is a risk; an optional subject you enjoy may lift your aggregate. Take the requirement seriously, but do not add a fourth or fifth subject that you will not have time to prepare.",
        ],
        bullets: [
          "Prefer subjects you have studied formally or practised for at least a month.",
          "Check whether your board syllabus overlaps with the CUET syllabus.",
          "Leave room for language preparation if your target universities require it.",
        ],
      },
      {
        heading: "4. Check the current bulletin",
        paragraphs: [
          "Subject lists and eligibility rules change. Before submitting the form, verify the current information bulletin and each university's admission page. No blog, including this one, can replace the official notification.",
        ],
      },
    ],
  },
  {
    slug: "last-30-days-before-cuet",
    title: "The last 30 days before CUET",
    excerpt: "A four-week revision plan built around full-length papers, error logs and recovery.",
    description:
      "A practical 30-day CUET revision plan: weekly full-length mocks, topic repair, spaced revision and a final-week routine that protects sleep and confidence.",
    date: "2026-09-12",
    updated: "2026-09-12",
    readingMinutes: 7,
    intro:
      "The last month is not the time to start a new syllabus. It is the time to convert what you already know into marks under time. The plan below is deliberately boring: test, repair, retest, recover.",
    sections: [
      {
        heading: "Week 1: diagnose",
        bullets: [
          "Take two full-length papers on different days.",
          "Build an error log with topic, error type and the fix.",
          "Rank topics by marks lost, not by how much you dislike them.",
        ],
      },
      {
        heading: "Week 2: repair",
        bullets: [
          "Spend mornings on the top two weak topics.",
          "Do timed 20-question sets in the afternoon.",
          "Keep one full-length paper at the weekend to protect stamina.",
        ],
      },
      {
        heading: "Week 3: integrate",
        bullets: [
          "Take three full-length papers with the exact subject combination.",
          "Review each paper the same day; do not accumulate corrections.",
          "Practise the first ten minutes of the paper: instructions, marking and question order.",
        ],
      },
      {
        heading: "Week 4: protect the score",
        bullets: [
          "Reduce new material; revise your error log and formula sheet.",
          "Keep sleep consistent; a 2 a.m. cram session costs more than it adds.",
          "Do one final timed paper early in the week, then switch to light revision.",
          "Prepare ID, admit card and travel plan before the last 48 hours.",
        ],
      },
      {
        heading: "The recovery rule",
        paragraphs: [
          "If a mock goes badly, do not take another paper immediately to prove something. Review it, repair one cause and return the next day. Confidence is part of performance; panic-repeating papers usually deepens the slump.",
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((post) => post.slug === slug);
}
