import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { verifyPassword, hashPassword, validatePassword } from "@/lib/security";

export async function POST(req: NextRequest) {
  try {
    const { email, oldPassword, newPassword } = await req.json();

    if (!email || !oldPassword || !newPassword) {
      return NextResponse.json({ success: false, error: "All fields required." }, { status: 400 });
    }

    const { valid, error } = validatePassword(newPassword);
    if (!valid) return NextResponse.json({ success: false, error }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !user.active) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    const match = await verifyPassword(oldPassword, user.password);
    if (!match) {
      return NextResponse.json({ success: false, error: "Incorrect current password." }, { status: 401 });
    }

    const hashed = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    await prisma.auditLog.create({
      data: { user: email, action: "Password Reset", details: "Self-service reset" },
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ success: false, error: "Server error." }, { status: 500 });
  }
}
