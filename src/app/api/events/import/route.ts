import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import * as XLSX from "xlsx";

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
    return new Date(Math.round((val - 25569) * 86400 * 1000));
  }
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? new Date() : d;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) ?? "append"; // "append" | "replace"

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext ?? "")) {
      return NextResponse.json({ error: "Only .xlsx or .xls files are supported." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

    // Use "Events" sheet if present, otherwise first sheet
    const sheetName = wb.SheetNames.includes("Events") ? "Events" : wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    if (!sheet) {
      return NextResponse.json({ error: "No usable sheet found in the file." }, { status: 400 });
    }

    const rows = XLSX.utils.sheet_to_json(sheet) as Record<string, unknown>[];

    if (mode === "replace") {
      await prisma.event.deleteMany({});
    }

    let created = 0;
    let skipped = 0;

    for (const row of rows) {
      try {
        const dateVal = row["Date"];
        if (!dateVal) { skipped++; continue; }
        const date = excelDateToJs(dateVal);
        if (isNaN(date.getTime())) { skipped++; continue; }

        const isMarked = safeBool(row["Is Marked"]);
        const client = safeStr(row["Client"]) || (isMarked ? "N/A" : "Unknown");
        const description = safeStr(row["Course/Description"]) || safeStr(row["Description"]) || "";
        const trainerCalendar = safeStr(row["Trainer Calendar"]) || safeStr(row["Trainer"]) || "";
        const status = safeStr(row["Status"]) || "Offered";
        const source = safeStr(row["Source"]) || "EQS";
        const type = safeStr(row["Type"]) || "W";
        const medium = safeStr(row["Medium"]) || "Online";
        const location = safeStr(row["Location"]) || "Global";
        const title = safeStr(row["Title"]) || `${status}-${source}-${client} ${description}`.trim();

        await prisma.event.create({
          data: {
            title,
            date,
            type,
            status,
            source,
            client,
            description,
            trainerCalendar,
            medium,
            location,
            billing: safeStr(row["Billing"]) || null,
            invoiced: safeStr(row["Invoiced"]) || "No",
            notes: safeStr(row["Notes"]) || null,
            isMarked,
            markedFor: safeStr(row["Marked For"]) || null,
            actionType: safeStr(row["Action Type"]) || "Imported",
            modifiedBy: session.user.email,
            dateModified: new Date(),
          },
        });
        created++;
      } catch {
        skipped++;
      }
    }

    return NextResponse.json({ success: true, created, skipped, sheet: sheetName });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to process file." }, { status: 500 });
  }
}
