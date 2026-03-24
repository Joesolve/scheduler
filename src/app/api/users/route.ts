import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/security";
import { validateEmail } from "@/lib/utils";
import { appendAudit } from "@/lib/settings";

// ─── GET /api/users ───────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true, role: true, trainerName: true, active: true, createdAt: true },
  });
  return NextResponse.json({ users });
}

// ─── POST /api/users ──────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  try {
    const { email, role, trainerName, password } = await req.json();
    const { valid: emailOk, error: emailErr } = validateEmail(email);
    if (!emailOk) return NextResponse.json({ error: emailErr }, { status: 400 });

    const { valid: pwOk, error: pwErr } = validatePassword(password);
    if (!pwOk) return NextResponse.json({ error: pwErr }, { status: 400 });

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) return NextResponse.json({ error: "User already exists." }, { status: 409 });

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        role,
        trainerName: role === "trainer" ? trainerName : null,
        active: true,
        password: await hashPassword(password),
      },
    });

    await appendAudit(session.user.email, "Created User", email);
    return NextResponse.json({ success: true, userId: user.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
