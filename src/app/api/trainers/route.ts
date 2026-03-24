import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { appendAudit } from "@/lib/settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const trainers = await prisma.trainer.findMany({ orderBy: { name: "asc" } });
  return NextResponse.json({ trainers });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const { name, color, active } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: "Name required." }, { status: 400 });

  const trainer = await prisma.trainer.upsert({
    where: { name: name.trim() },
    update: { color: color ?? "#ccc", active: active ?? true },
    create: { name: name.trim(), color: color ?? "#ccc", active: active ?? true },
  });

  await appendAudit(session.user.email, "Upserted Trainer", name);
  return NextResponse.json({ success: true, trainer });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  // Bulk replace all trainers
  const { trainers } = await req.json();
  if (!Array.isArray(trainers)) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  await prisma.$transaction(
    trainers.map((t: { name: string; color: string; active: boolean }) =>
      prisma.trainer.upsert({
        where: { name: t.name },
        update: { color: t.color, active: t.active },
        create: { name: t.name, color: t.color, active: t.active },
      })
    )
  );

  await appendAudit(session.user.email, "Updated Trainers", `${trainers.length} records`);
  return NextResponse.json({ success: true });
}
