import { getSessionUser } from "@/lib/session-user";
import { hasGuestAttemptAccess } from "@/lib/guest-token";

/**
 * Who may read or mutate an in-progress attempt?
 *
 * - A signed-in owner, always.
 * - A guest only with the signed cookie issued when the attempt started, so a
 *   leaked/guessed id is not enough.
 * - Admin reads are handled separately by the caller through `can()`.
 */
export async function canAccessAttempt(attempt: {
  id: string;
  userId: string | null;
}): Promise<boolean> {
  const { userId } = await getSessionUser();
  if (attempt.userId) return attempt.userId === userId;
  return hasGuestAttemptAccess(attempt.id);
}

/** Remaining seconds before the server deadline; negative means expired. */
export function secondsUntilDeadline(deadlineAt: Date | null): number | null {
  if (!deadlineAt) return null;
  return Math.floor((deadlineAt.getTime() - Date.now()) / 1000);
}
