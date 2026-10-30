import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { normalizeRole } from "@/lib/auth/permissions";

export interface SessionUser {
  userId: string | null;
  role: string;
  email: string | null;
}

/** Resolve the signed-in user without ever trusting client-supplied identity. */
export async function getSessionUser(): Promise<SessionUser> {
  const session = await getServerSession(authOptions);
  const user = session?.user as
    | { id?: string; email?: string; role?: string }
    | undefined;
  return {
    userId: user?.id ?? null,
    role: normalizeRole(user?.role),
    email: user?.email ?? null,
  };
}
