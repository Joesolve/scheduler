import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateTitle } from "@/lib/utils";
import { appendAudit } from "@/lib/settings";

/**
 * POST /api/events/bulk
 *
 * Body: { action: "delete" | "update", ids: string[], updates?: Record<string,string> }
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role === "view_only") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, ids, updates } = await req.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "No event IDs provided." }, { status: 400 });
    }

    if (action === "delete") {
      await prisma.event.deleteMany({ where: { id: { in: ids } } });
      await appendAudit(session.user.email, "Bulk Deleted Events", `${ids.length} event(s)`);
      return NextResponse.json({ success: true, count: ids.length });
    }

    if (action === "update") {
      if (!updates || Object.keys(updates).length === 0) {
        return NextResponse.json({ error: "No updates provided." }, { status: 400 });
      }

      // Resolve "All" trainer
      let trainerCalendar: string | undefined;
      if (updates.trainers) {
        if (updates.trainers === "All") {
          const allTrainers = await prisma.trainer.findMany({ where: { active: true } });
          trainerCalendar = allTrainers.map((t) => t.name).join(", ");
        } else {
          trainerCalendar = updates.trainers;
        }
        delete updates.trainers;
      }

      // Build update payload (only include provided fields)
      const updateData: Record<string, unknown> = {
        dateModified: new Date(),
        actionType: "Bulk Modified",
        modifiedBy: session.user.email,
      };
      if (updates.status)      updateData.status      = updates.status;
      if (updates.type)        updateData.type        = updates.type;
      if (updates.source)      updateData.source      = updates.source;
      if (updates.medium)      updateData.medium      = updates.medium;
      if (updates.location)    updateData.location    = updates.location;
      if (updates.invoiced)    updateData.invoiced    = updates.invoiced;
      if (updates.client)      updateData.client      = updates.client;
      if (updates.description) updateData.description = updates.description;
      if (trainerCalendar)     updateData.trainerCalendar = trainerCalendar;

      // Update each event and regenerate its title
      await prisma.$transaction(
        ids.map((id) =>
          prisma.event.update({
            where: { id },
            data: updateData,
          })
        )
      );

      // Regenerate titles for updated events
      const updatedEvents = await prisma.event.findMany({ where: { id: { in: ids } } });
      await prisma.$transaction(
        updatedEvents.map((ev) =>
          prisma.event.update({
            where: { id: ev.id },
            data: { title: generateTitle({ ...ev }) },
          })
        )
      );

      await appendAudit(session.user.email, "Bulk Updated Events", `${ids.length} event(s)`);
      return NextResponse.json({ success: true, count: ids.length });
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Server error." }, { status: 500 });
  }
}
