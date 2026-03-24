import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }
  const notifs = await prisma.notification.findMany();
  const map = Object.fromEntries(notifs.map((n) => [n.key, n.value]));
  return NextResponse.json({ notifications: map });
}
