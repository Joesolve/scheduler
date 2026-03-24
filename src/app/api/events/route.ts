import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateTitle, sanitizeText, validateText, dateRange, MAX_CLIENT_LENGTH, MAX_TEXT_LENGTH, MAX_NOTES_LENGTH } from "@/lib/utils";
import { isDateBlockedForTrainer, appendAudit } from "@/lib/settings";

// ─── GET /api/events ──────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const trainer = searchParams.get("trainer");
  const status = searchParams.get("status");
  const source = searchParams.get("source");
  const client = searchParams.get("client");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  // Build where clause
  const where: any = {};

  if (year && month) {
    const y = parseInt(year);
    const m = parseInt(month);
    where.date = {
      gte: new Date(y, m - 1, 1),
      lt: new Date(y, m, 1),
    };
  } else if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }

  // Trainers can only see their own events
  if (session.user.role === "trainer") {
    const trainerName = session.user.trainerName;
    if (!trainerName) return NextResponse.json({ events: [] });
    where.OR = [
      { trainerCalendar: { contains: trainerName } },
      { AND: [{ isMarked: true }, { markedFor: { contains: trainerName } }] },
      { AND: [{ isMarked: true }, { markedFor: "All" }] },
    ];
  }

  if (trainer && trainer !== "All") {
    where.trainerCalendar = { contains: trainer };
  }
  if (status && status !== "All") where.status = status;
  if (source && source !== "All") where.source = source;
  // SQLite LIKE is case-insensitive for ASCII by default
  if (client) where.client = { contains: client };

  const events = await prisma.event.findMany({
    where,
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ events });
}

// ─── POST /api/events ─────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "view_only") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { startDate, endDate, type, status, source, client, description,
            trainers, medium, location, billing, invoiced, notes } = body;

    // Required field validation
    if (!client?.trim()) return NextResponse.json({ error: "Client is required." }, { status: 400 });
    if (!description?.trim()) return NextResponse.json({ error: "Course/Description is required." }, { status: 400 });
    if (!trainers?.length) return NextResponse.json({ error: "Select at least one trainer." }, { status: 400 });

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end < start) return NextResponse.json({ error: "End date cannot be before start date." }, { status: 400 });

    // Validate text inputs
    for (const [val, name, max] of [
      [client, "Client", MAX_CLIENT_LENGTH],
      [description, "Course/Description", MAX_TEXT_LENGTH],
      [billing ?? "", "Billing", MAX_NOTES_LENGTH],
      [notes ?? "", "Notes", MAX_NOTES_LENGTH],
    ] as [string, string, number][]) {
      const { valid, error } = validateText(val, name, max);
      if (!valid) return NextResponse.json({ error }, { status: 400 });
    }

    // Trainers - resolve "All" to full list
    let trainerList: string[] = trainers;
    if (trainers.includes("All")) {
      const allTrainers = await prisma.trainer.findMany({ where: { active: true } });
      trainerList = allTrainers.map((t) => t.name);
    }
    const trainerCalendar = trainerList.join(", ");

    // Check for blocked dates
    const dates = dateRange(start, end);
    const blockedDates: string[] = [];
    for (const date of dates) {
      for (const trainer of trainerList) {
        const blocked = await isDateBlockedForTrainer(date, trainer);
        if (blocked) blockedDates.push(`${date.toISOString().split("T")[0]} (${trainer})`);
      }
    }
    if (blockedDates.length) {
      return NextResponse.json({
        error: `Cannot create event. Blocked: ${[...new Set(blockedDates)].join(", ")}`,
      }, { status: 409 });
    }

    // Create one event per day in the range
    const created = await prisma.$transaction(
      dates.map((date) => {
        const row = {
          client: sanitizeText(client, MAX_CLIENT_LENGTH),
          description: sanitizeText(description, MAX_TEXT_LENGTH),
          status,
          source,
          type,
          medium,
          location,
          trainerCalendar,
          billing: sanitizeText(billing ?? "", MAX_NOTES_LENGTH),
          invoiced,
          notes: sanitizeText(notes ?? "", MAX_NOTES_LENGTH),
        };
        const title = generateTitle({ ...row, trainerCalendar });
        return prisma.event.create({
          data: {
            ...row,
            title,
            date,
            dateModified: new Date(),
            actionType: "Created",
            modifiedBy: session.user.email,
            isMarked: false,
          },
        });
      })
    );

    await appendAudit(session.user.email, "Created Event", `${created.length} event(s)`);
    return NextResponse.json({ success: true, count: created.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
