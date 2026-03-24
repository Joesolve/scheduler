import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateTitle, dateRange } from "@/lib/utils";
import { isDateBlockedForTrainer, appendAudit } from "@/lib/settings";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "view_only") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { eventId, method, date, rangeStart, rangeEnd } = await req.json();

    const original = await prisma.event.findUnique({ where: { id: eventId } });
    if (!original) return NextResponse.json({ error: "Event not found." }, { status: 404 });

    const blockRule = await prisma.appRule.findUnique({ where: { key: "blocked_prevents_duplicates" } });
    const preventDuplicatesOnBlocked = blockRule?.value === "true";

    const trainersInEvent = original.trainerCalendar.split(",").map((t) => t.trim()).filter(Boolean);

    let dates: Date[] = [];
    if (method === "single") {
      dates = [new Date(date)];
    } else {
      dates = dateRange(new Date(rangeStart), new Date(rangeEnd));
    }

    const created = [];
    for (const d of dates) {
      if (preventDuplicatesOnBlocked) {
        let blocked = false;
        for (const trainer of trainersInEvent) {
          if (await isDateBlockedForTrainer(d, trainer)) { blocked = true; break; }
        }
        if (blocked) continue;
      }

      const newEvent = await prisma.event.create({
        data: {
          title: generateTitle({ ...original }),
          date: d,
          type: original.type,
          status: original.status,
          source: original.source,
          client: original.client,
          description: original.description,
          trainerCalendar: original.trainerCalendar,
          medium: original.medium,
          location: original.location,
          billing: original.billing,
          invoiced: original.invoiced,
          notes: original.notes,
          isMarked: false,
          markedFor: "",
          actionType: "Duplicated",
          modifiedBy: session.user.email,
          dateModified: new Date(),
        },
      });
      created.push(newEvent);
    }

    await appendAudit(session.user.email, "Duplicated Events", `${created.length} event(s) from ${eventId}`);
    return NextResponse.json({ success: true, count: created.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
