import { POST as submitAttempt } from "../../route";

export const dynamic = "force-dynamic";

/**
 * Blueprint alias: POST /api/attempts/{id}/submit
 *
 * Delegates to the canonical submission handler with the path id injected into
 * the body. Ownership, deadline, grading and CSRF checks remain in one place.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const forwarded = new Request(req.url, {
    method: "POST",
    headers: req.headers,
    body: JSON.stringify({ ...(body as Record<string, unknown>), attemptId: id }),
  });
  return submitAttempt(forwarded);
}
