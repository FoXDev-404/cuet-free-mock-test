// Shared attempt helpers for the start/submit lifecycle.

import { prisma } from "@/lib/prisma";

/**
 * Reserved non-public tests so every attempt has a FK target. Attempts still
 * attach here; these tests are hidden from student listings via isPublic=false.
 */
export async function ensureSyntheticTest(
  slug: string,
  title: string,
  config: object,
  type = "GENERAL_TEST",
) {
  const existing = await prisma.test.findUnique({ where: { slug }, select: { id: true } });
  if (existing) return existing;
  return prisma.test.create({
    data: {
      slug,
      title,
      type,
      status: "PUBLISHED",
      isPublic: false, // hidden from student listing; attempts still attach here
      config: JSON.stringify(config),
    },
    select: { id: true },
  });
}
