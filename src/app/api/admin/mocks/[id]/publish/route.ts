import { PATCH } from "../../../tests/[id]/route";

export const dynamic = "force-dynamic";

/**
 * Blueprint alias: POST /api/admin/mocks/{id}/publish
 *
 * Reuses the canonical test PATCH handler, which validates the paper, checks
 * TEST_PUBLISH, snapshots an immutable version and writes the audit row.
 */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const forwarded = new Request(req.url, {
    method: "PATCH",
    headers: req.headers,
    body: JSON.stringify({ status: "PUBLISHED" }),
  });
  return PATCH(forwarded, { params: Promise.resolve({ id }) });
}
