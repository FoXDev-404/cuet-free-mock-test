import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth/password";
import { allocateUsername } from "@/lib/username";
import { enforceRateLimit, forbiddenOrigin, isSameOrigin, logApiError } from "@/lib/http";
import { SETTING_KEYS, isSettingEnabled } from "@/lib/settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().trim().toLowerCase().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters").max(200),
  confirmPassword: z.string(),
  terms: z.boolean().refine((v) => v === true, "You must accept the terms"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function POST(req: Request) {
  try {
    if (!isSameOrigin(req)) return forbiddenOrigin();

    if (!(await isSettingEnabled(SETTING_KEYS.registrationEnabled))) {
      return NextResponse.json(
        { error: "New registrations are temporarily paused. Please try again later." },
        { status: 503 },
      );
    }

    const limited = await enforceRateLimit(req, {
      bucket: "auth:register",
      limit: 8,
      windowSec: 60 * 60,
    });
    if (limited) return limited;

    const body = await req.json();
    const parsed = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { email: parsed.email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const [passwordHash, username] = await Promise.all([
      hashPassword(parsed.password),
      allocateUsername(parsed.name, parsed.email),
    ]);
    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        username,
        email: parsed.email,
        passwordHash,
        role: "USER",
        lastActiveAt: new Date(),
      },
    });

    return NextResponse.json({ id: user.id, email: user.email, name: user.name, username: user.username });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    }
    logApiError("auth/register", e, req);
    return NextResponse.json({ error: "Registration failed" }, { status: 500 });
  }
}
