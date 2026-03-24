import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadSettings } from "@/lib/settings";
import prisma from "@/lib/db";

// ─── GET /api/settings ────────────────────────────────────────────────────────
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const settings = await loadSettings();
  return NextResponse.json({ settings });
}

// ─── PATCH /api/settings ──────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  try {
    const body = await req.json();

    // Update rules
    if (body.rules) {
      for (const [key, value] of Object.entries(body.rules)) {
        await prisma.appRule.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    // Update defaults
    if (body.defaults) {
      for (const [key, value] of Object.entries(body.defaults)) {
        await prisma.appDefault.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    // Update notifications
    if (body.notifications) {
      for (const [key, value] of Object.entries(body.notifications)) {
        await prisma.notification.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
