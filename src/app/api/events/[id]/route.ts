import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateTitle, sanitizeText, dateRange, MAX_CLIENT_LENGTH, MAX_TEXT_LENGTH, MAX_NOTES_LENGTH } from "@/lib/utils";
// Note: generateTitle is imported statically above
import { appendAudit } from "@/lib/settings";

// ─── GET /api/events/[id] ─────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const event = await prisma.event.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ event });
}

// ─── PATCH /api/events/[id] ───────────────────────────────────────────────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "view_only") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { startDate, endDate, type, status, source, client, description,
            trainers, medium, location, billing, invoiced, notes, bulkUpdate } = body;

    // Bulk update (only specific fields, no date expansion)
    if (bulkUpdate) {
      const updates: any = { dateModified: new Date(), actionType: "Bulk Modified", modifiedBy: session.user.email };
      if (status) updates.status = status;
      if (type) updates.type = type;
      if (source) updates.source = source;
      if (location) updates.location = location;
      if (medium) updates.medium = medium;
      if (invoiced) updates.invoiced = invoiced;
      if (client) updates.client = client;
      if (description) updates.description = description;
      if (trainers) {
        if (trainers === "All") {
          const allTrainers = await prisma.trainer.findMany({ where: { active: true } });
          updates.trainerCalendar = allTrainers.map((t) => t.name).join(", ");
        } else {
          updates.trainerCalendar = trainers;
        }
      }
      // Fetch current event to rebuild title with merged fields
      const current = await prisma.event.findUnique({ where: { id: params.id } });
      if (current) {
        const merged = { ...current, ...updates };
        updates.title = generateTitle(merged);
      }
      const updated = await prisma.event.update({ where: { id: params.id }, data: updates });
      return NextResponse.json({ success: true, event: updated });
    }

    // Full edit - may expand date range
    const existing = await prisma.event.findUnique({ where: { id: params.id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let trainerCalendar = existing.trainerCalendar;
    if (trainers) {
      if (trainers.includes("All")) {
        const allTrainers = await prisma.trainer.findMany({ where: { active: true } });
        trainerCalendar = allTrainers.map((t) => t.name).join(", ");
      } else {
        trainerCalendar = trainers.join(", ");
      }
    }

    const row = {
      type: type ?? existing.type,
      status: status ?? existing.status,
      source: source ?? existing.source,
      client: sanitizeText(client ?? existing.client, MAX_CLIENT_LENGTH),
      description: sanitizeText(description ?? existing.description, MAX_TEXT_LENGTH),
      trainerCalendar,
      medium: medium ?? existing.medium,
      location: location ?? existing.location,
      billing: sanitizeText(billing ?? existing.billing ?? "", MAX_NOTES_LENGTH),
      invoiced: invoiced ?? existing.invoiced,
      notes: sanitizeText(notes ?? existing.notes ?? "", MAX_NOTES_LENGTH),
    };

    // If date range changed, delete old and create new per-day events
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) return NextResponse.json({ error: "End before start." }, { status: 400 });

      const dates = dateRange(start, end);
      await prisma.event.delete({ where: { id: params.id } });
      const created = await prisma.$transaction(
        dates.map((date) => {
          const title = generateTitle({ ...row });
          return prisma.event.create({
            data: { ...row, title, date, dateModified: new Date(), actionType: "Modified", modifiedBy: session.user.email, isMarked: false },
          });
        })
      );
      await appendAudit(session.user.email, "Edited Event", `${created.length} day(s)`);
      return NextResponse.json({ success: true, count: created.length });
    }

    // Single event update
    const title = generateTitle({ ...row });
    const updated = await prisma.event.update({
      where: { id: params.id },
      data: { ...row, title, dateModified: new Date(), actionType: "Modified", modifiedBy: session.user.email },
    });
    await appendAudit(session.user.email, "Edited Event", `1 event`);
    return NextResponse.json({ success: true, event: updated });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}

// ─── DELETE /api/events/[id] ──────────────────────────────────────────────────
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "view_only") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await prisma.event.delete({ where: { id: params.id } });
    await appendAudit(session.user.email, "Deleted Event", params.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
