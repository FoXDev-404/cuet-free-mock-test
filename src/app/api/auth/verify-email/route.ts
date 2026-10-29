import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token) return NextResponse.json({ error: "Token required" }, { status: 400 });

    const verification = await prisma.verificationToken.findUnique({ where: { token } });
    if (!verification) return NextResponse.json({ error: "Invalid or expired token" }, { status: 400 });
    if (verification.expires < new Date()) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: "Token expired" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email: verification.identifier } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: new Date() } });
    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ success: true, message: "Email verified successfully" });
  } catch (e) {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}