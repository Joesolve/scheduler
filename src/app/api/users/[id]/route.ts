import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { hashPassword, validatePassword } from "@/lib/security";
import { appendAudit } from "@/lib/settings";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const body = await req.json();

  // Password reset
  if (body.newPassword !== undefined) {
    const { valid, error } = validatePassword(body.newPassword);
    if (!valid) return NextResponse.json({ error }, { status: 400 });
    await prisma.user.update({
      where: { id: params.id },
      data: { password: await hashPassword(body.newPassword) },
    });
    await appendAudit(session.user.email, "Reset Password", `User ${params.id}`);
    return NextResponse.json({ success: true });
  }

  // General field update (role, trainerName, active)
  const { role, trainerName, active } = body;
  await prisma.user.update({
    where: { id: params.id },
    data: {
      ...(role !== undefined && { role }),
      ...(trainerName !== undefined && { trainerName }),
      ...(active !== undefined && { active }),
    },
  });
  await appendAudit(session.user.email, "Updated User", params.id);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Admin only." }, { status: 403 });
  }

  const user = await prisma.user.findUnique({ where: { id: params.id } });
  if (!user) return NextResponse.json({ error: "Not found." }, { status: 404 });

  await prisma.user.delete({ where: { id: params.id } });
  await appendAudit(session.user.email, "Deleted User", user.email);
  return NextResponse.json({ success: true });
}
