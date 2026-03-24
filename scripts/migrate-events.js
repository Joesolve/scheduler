#!/usr/bin/env node
/**
 * Migrate events from scripts/events-data.json into the database.
 * Run via Railway shell: node scripts/migrate-events.js
 */

const { PrismaClient } = require("@prisma/client");
const path = require("path");

const prisma = new PrismaClient();

async function main() {
  const events = require(path.join(__dirname, "events-data.json"));
  console.log(`Found ${events.length} events to import.`);

  // Check existing events to avoid duplicates
  const existing = await prisma.event.count();
  if (existing > 0) {
    console.log(`Database already has ${existing} events. Skipping to avoid duplicates.`);
    console.log("To force re-import, delete all events first, then re-run.");
    await prisma.$disconnect();
    return;
  }

  let created = 0;
  let skipped = 0;

  for (const ev of events) {
    try {
      await prisma.event.create({
        data: {
          title: ev.title,
          date: new Date(ev.date),
          type: ev.type,
          status: ev.status,
          source: ev.source,
          client: ev.client,
          description: ev.description,
          trainerCalendar: ev.trainerCalendar,
          medium: ev.medium,
          location: ev.location,
          billing: ev.billing,
          invoiced: ev.invoiced,
          notes: ev.notes,
          isMarked: ev.isMarked,
          markedFor: ev.markedFor,
          actionType: ev.actionType,
          modifiedBy: ev.modifiedBy,
          dateModified: new Date(ev.dateModified),
        },
      });
      created++;
    } catch (err) {
      console.error(`Failed to insert event "${ev.title}" on ${ev.date}: ${err.message}`);
      skipped++;
    }
  }

  console.log(`\nMigration complete: ${created} events created, ${skipped} skipped.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
