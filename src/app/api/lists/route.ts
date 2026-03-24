import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { appendAudit } from "@/lib/settings";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const items = await prisma.listItem.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }] });
  return NextResponse.json({ items });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const { items } = await req.json();
  if (!Array.isArray(items)) return NextResponse.json({ error: "Invalid payload." }, { status: 400 });

  // Delete and re-insert for simplicity
  await prisma.$transaction(async (tx) => {
    await tx.listItem.deleteMany();
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      await tx.listItem.create({
        data: { category: item.category, value: item.value, active: item.active ?? true, order: i },
      });
    }
  });

  await appendAudit(session.user.email, "Updated Lists", `${items.length} items`);
  return NextResponse.json({ success: true });
}
