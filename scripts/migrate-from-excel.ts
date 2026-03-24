/**
 * One-time migration script: Excel (.xlsx) → SQLite via Prisma
 *
 * Usage:
 *   npx tsx scripts/migrate-from-excel.ts ./scheduling_recent.xlsx
 *
 * This script reads your existing Excel file and inserts all data into
 * the new SQLite database. Run it once after `prisma db push` and before
 * going live with the Next.js app.
 *
 * It is idempotent for users/trainers/lists/rules/defaults (upsert),
 * but will insert events fresh (clear Events table first if re-running).
 */

import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import bcrypt from "bcryptjs";
import path from "path";

const prisma = new PrismaClient();

// ─── SHA256 verify (matches Python security.py) ───────────────────────────────
import { createHash } from "crypto";
function isLegacyHash(val: string): boolean {
  return /^[0-9a-f]{32}\$[0-9a-f]{64}$/.test(val);
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function safeStr(val: unknown): string {
  if (val === null || val === undefined) return "";
  if (typeof val === "number" && isNaN(val)) return "";
  return String(val).trim();
}

function safeBool(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  return String(val).toLowerCase() === "true";
}

function excelDateToJs(val: unknown): Date {
  if (val instanceof Date) return val;
  if (typeof val === "number") {
    // Excel serial date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000));
    return date;
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? new Date() : d;
}

async function migrateUsers(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets["Users"];
  if (!sheet) { console.log("⚠️  No Users sheet found."); return; }
  const rows = XLSX.utils.sheet_to_json(sheet);
  let count = 0;
  for (const row of rows as any[]) {
    const email = safeStr(row["Email"]).toLowerCase();
    if (!email) continue;
    const rawPw = safeStr(row["Password"]);
    let password: string;
    if (rawPw.startsWith("$2b$") || rawPw.startsWith("$2a$")) {
      password = rawPw; // already bcrypt
    } else if (isLegacyHash(rawPw)) {
      // Keep legacy hash — will be upgraded to bcrypt on first login
      password = rawPw;
    } else {
      // Plaintext - hash with bcrypt
      password = await bcrypt.hash(rawPw || "ChangeMe123!", 12);
    }
    await prisma.user.upsert({
      where: { email },
      update: { role: safeStr(row["Role"]) || "view_only", trainerName: safeStr(row["TrainerName"]) || null, active: safeBool(row["Active"]), password },
      create: { email, role: safeStr(row["Role"]) || "view_only", trainerName: safeStr(row["TrainerName"]) || null, active: safeBool(row["Active"]), password },
    });
    count++;
  }
  console.log(`✅ Migrated ${count} users.`);
}

async function migrateTrainers(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets["Trainers"];
  if (!sheet) { console.log("⚠️  No Trainers sheet found."); return; }
  const rows = XLSX.utils.sheet_to_json(sheet);
  let count = 0;
  for (const row of rows as any[]) {
    const name = safeStr(row["Name"]);
    if (!name) continue;
    await prisma.trainer.upsert({
      where: { name },
      update: { color: safeStr(row["Color"]) || "#cccccc", active: safeBool(row["Active"]) },
      create: { name, color: safeStr(row["Color"]) || "#cccccc", active: safeBool(row["Active"]) },
    });
    count++;
  }
  console.log(`✅ Migrated ${count} trainers.`);
}

async function migrateLists(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets["Lists"];
  if (!sheet) { console.log("⚠️  No Lists sheet found."); return; }
  const rows = XLSX.utils.sheet_to_json(sheet);
  let count = 0;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i] as any;
    const category = safeStr(row["Category"]);
    const value = safeStr(row["Value"]);
    if (!category || !value) continue;
    await prisma.listItem.upsert({
      where: { category_value: { category, value } },
      update: { active: safeBool(row["Active"]), order: i },
      create: { category, value, active: safeBool(row["Active"]), order: i },
    });
    count++;
  }
  console.log(`✅ Migrated ${count} list items.`);
}

async function migrateRules(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets["Rules"];
  if (!sheet) { console.log("⚠️  No Rules sheet found."); return; }
  const rows = XLSX.utils.sheet_to_json(sheet);
  for (const row of rows as any[]) {
    const key = safeStr(row["Key"]);
    const value = safeStr(row["Value"]);
    if (!key) continue;
    await prisma.appRule.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`✅ Migrated rules.`);
}

async function migrateDefaults(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets["Defaults"];
  if (!sheet) { console.log("⚠️  No Defaults sheet found."); return; }
  const rows = XLSX.utils.sheet_to_json(sheet);
  for (const row of rows as any[]) {
    const key = safeStr(row["Key"]);
    const value = safeStr(row["Value"]);
    if (!key) continue;
    await prisma.appDefault.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`✅ Migrated defaults.`);
}

async function migrateNotifications(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets["Notifications"];
  if (!sheet) return;
  const rows = XLSX.utils.sheet_to_json(sheet);
  for (const row of rows as any[]) {
    const key = safeStr(row["Key"]);
    const value = safeStr(row["Value"]);
    if (!key) continue;
    await prisma.notification.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  console.log(`✅ Migrated notifications.`);
}

async function migrateAudit(wb: XLSX.WorkBook) {
  const sheet = wb.Sheets["Audit"];
  if (!sheet) return;
  const rows = XLSX.utils.sheet_to_json(sheet);
  let count = 0;
  for (const row of rows as any[]) {
    const ts = safeStr(row["Timestamp"]);
    if (!ts) continue;
    await prisma.auditLog.create({
      data: {
        timestamp: new Date(ts),
        user: safeStr(row["User"]),
        action: safeStr(row["Action"]),
        details: safeStr(row["Details"]),
      },
    });
    count++;
  }
  console.log(`✅ Migrated ${count} audit entries.`);
}

async function migrateEvents(wb: XLSX.WorkBook) {
  // Try "Events" sheet first, then first sheet
  const sheetName = wb.SheetNames.includes("Events") ? "Events" : wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  if (!sheet) { console.log("⚠️  No Events sheet found."); return; }

  const rows = XLSX.utils.sheet_to_json(sheet);
  let count = 0;
  let skipped = 0;

  for (const row of rows as any[]) {
    try {
      const dateVal = row["Date"];
      if (!dateVal) { skipped++; continue; }
      const date = excelDateToJs(dateVal);
      if (isNaN(date.getTime())) { skipped++; continue; }

      const isMarked = safeBool(row["Is Marked"]);
      const client = safeStr(row["Client"]) || (isMarked ? "N/A" : "Unknown");
      const description = safeStr(row["Course/Description"]) || safeStr(row["Description"]) || "";
      const trainerCalendar = safeStr(row["Trainer Calendar"]) || safeStr(row["Trainer"]) || "";

      const rowData = {
        client,
        description,
        status: safeStr(row["Status"]) || "Offered",
        source: safeStr(row["Source"]) || "EQS",
        type: safeStr(row["Type"]) || "W",
        medium: safeStr(row["Medium"]) || "Online",
        location: safeStr(row["Location"]) || "Global",
        trainerCalendar,
      };

      // Re-generate title to be consistent with the new format
      const title = safeStr(row["Title"]) || `${rowData.status}-${rowData.source}-${rowData.client} ${rowData.description}`.trim();

      await prisma.event.create({
        data: {
          title,
          date,
          type: rowData.type,
          status: rowData.status,
          source: rowData.source,
          client: rowData.client,
          description: rowData.description,
          trainerCalendar: rowData.trainerCalendar,
          medium: rowData.medium,
          location: rowData.location,
          billing: safeStr(row["Billing"]) || null,
          invoiced: safeStr(row["Invoiced"]) || "No",
          notes: safeStr(row["Notes"]) || null,
          isMarked,
          markedFor: safeStr(row["Marked For"]) || null,
          actionType: safeStr(row["Action Type"]) || "Migrated",
          modifiedBy: safeStr(row["Modified By"]) || "migration",
          dateModified: new Date(),
        },
      });
      count++;
    } catch (e) {
      console.warn(`⚠️  Skipped a row: ${e}`);
      skipped++;
    }
  }
  console.log(`✅ Migrated ${count} events. (${skipped} skipped)`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const xlsxPath = process.argv[2];
  if (!xlsxPath) {
    console.error("Usage: npx tsx scripts/migrate-from-excel.ts <path-to-excel-file>");
    process.exit(1);
  }

  const absolutePath = path.resolve(xlsxPath);
  console.log(`\n📂 Reading: ${absolutePath}\n`);

  const wb = XLSX.readFile(absolutePath);
  console.log(`📋 Sheets found: ${wb.SheetNames.join(", ")}\n`);

  // Run migrations in order
  await migrateUsers(wb);
  await migrateTrainers(wb);
  await migrateLists(wb);
  await migrateRules(wb);
  await migrateDefaults(wb);
  await migrateNotifications(wb);
  await migrateAudit(wb);
  await migrateEvents(wb);

  console.log("\n🎉 Migration complete!\n");
}

main()
  .catch((e) => { console.error("Migration failed:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
