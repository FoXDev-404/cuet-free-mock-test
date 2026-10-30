import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return NextResponse.json({ success: true, message: "If the email exists, a reset link has been sent" });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.verificationToken.create({
      data: { identifier: email, token, expires },
    });

    // In production, send email with reset link
    console.log(`Password reset token for ${email}: ${token}`);

    return NextResponse.json({ success: true, message: "If the email exists, a reset link has been sent" });
  } catch (error) {
    console.error("forgot-password API error", error);
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 });
  }
}