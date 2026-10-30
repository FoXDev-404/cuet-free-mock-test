import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";

const resetSchema = z.object({
  token: z.string(),
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine(data => data.password === data.confirmPassword, { message: "Passwords do not match", path: ["confirmPassword"] });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = resetSchema.parse(body);

    const verification = await prisma.verificationToken.findUnique({ where: { token: parsed.token } });
    if (!verification) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    if (verification.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token: parsed.token } });
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: verification.identifier } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const passwordHash = await bcrypt.hash(parsed.password, 12);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    await prisma.verificationToken.delete({ where: { token: parsed.token } });

    return NextResponse.json({ success: true, message: "Password reset successfully" });
  } catch (e) {
    console.error("reset-password API error", e);
    if (e instanceof z.ZodError) return NextResponse.json({ error: e.issues[0]?.message }, { status: 400 });
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}