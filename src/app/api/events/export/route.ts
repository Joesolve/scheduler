import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const trainer = searchParams.get("trainer");
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const client = searchParams.get("client");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  const where: any = {};
  if (trainer && trainer !== "All") where.trainerCalendar = { contains: trainer };
  if (status && status !== "All") where.status = status;
  if (source && source !== "All") where.source = source;
  if (client) where.client = { contains: client };
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }
  // Trainers only see their own
  if (session.user.role === "trainer" && session.user.trainerName) {
    where.trainerCalendar = { contains: session.user.trainerName };
  }

  const events = await prisma.event.findMany({ where, orderBy: { date: "asc" } });

  const rows = events.map((ev) => ({
    Date: ev.date.toISOString().split("T")[0],
    Title: ev.title,
    Type: ev.type,
    Status: ev.status,
    Source: ev.source,
    Client: ev.client,
    "Course/Description": ev.description,
    "Trainer Calendar": ev.trainerCalendar,
    Medium: ev.medium,
    Location: ev.location,
    Billing: ev.billing ?? "",
    Invoiced: ev.invoiced,
    Notes: ev.notes ?? "",
    "Date Modified": ev.dateModified?.toISOString().split("T")[0] ?? "",
    "Modified By": ev.modifiedBy ?? "",
  }));

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, "Events");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="Events_Export_${new Date().toISOString().split("T")[0]}.xlsx"`,
    },
  });
}
