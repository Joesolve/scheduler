import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { dateRange } from "@/lib/utils";
import { appendAudit } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check only-admin-can-block rule
  const rule = await prisma.appRule.findUnique({ where: { key: "only_admin_can_block" } });
  if (rule?.value === "true" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Only admins can block dates." }, { status: 403 });
  }

  try {
    const { startDate, endDate, scope, trainers, reason } = await req.json();

    if (!startDate || !endDate) {
      return NextResponse.json({ error: "Start and end dates required." }, { status: 400 });
    }
    if (scope === "Specific Trainer(s)" && (!trainers || !trainers.length)) {
      return NextResponse.json({ error: "Select at least one trainer." }, { status: 400 });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return NextResponse.json({ error: "End before start." }, { status: 400 });

    const markedFor = scope === "All Trainers" ? "All" : trainers.join(", ");
    const dates = dateRange(start, end);
    let count = 0;

    for (const date of dates) {
      // Don't create duplicate marks for same date + markedFor combo
      const existing = await prisma.event.findFirst({
        where: { date: { gte: new Date(date.setHours(0,0,0,0)), lte: new Date(date.setHours(23,59,59,999)) }, isMarked: true, markedFor },
      });
      if (existing) continue;

      const description = reason || "Marked Date";
      await prisma.event.create({
        data: {
          title: `🚫 BLOCKED (${markedFor}) - ${description}`,
          date,
          type: "M",
          status: "Blocked",
          source: "Admin",
          client: "N/A",
          description,
          trainerCalendar: markedFor,
          medium: "N/A",
          location: "N/A",
          isMarked: true,
          markedFor,
          actionType: "Marked",
          modifiedBy: session.user.email,
          dateModified: new Date(),
        },
      });
      count++;
    }

    await appendAudit(session.user.email, "Marked Dates", `${count} day(s) for ${markedFor}`);
    return NextResponse.json({ success: true, count });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
