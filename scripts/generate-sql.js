#!/usr/bin/env node
const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const { randomBytes } = require("crypto");

function cuid() {
  return "c" + randomBytes(16).toString("hex").slice(0, 23);
}

function excelDateToJS(serial) {
  if (typeof serial === "string") {
    const d = new Date(serial);
    if (!isNaN(d)) return d;
  }
  const excelEpoch = new Date(1899, 11, 30).getTime();
  return new Date(excelEpoch + serial * 86400000);
}

function esc(v) {
  if (v === null || v === undefined || v === "") return "NULL";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

const wb = XLSX.readFile(path.join(__dirname, "../scheduling_recent.xlsx"));
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });

const now = new Date().toISOString();
const lines = [];
lines.push("-- Event migration from scheduling_recent.xlsx");
lines.push("-- " + rows.length + " events");
lines.push("");

for (const row of rows) {
  const date = excelDateToJS(row["Date"]);
  const dateStr = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())).toISOString();

  let dateModified = now;
  if (row["Date Modified"]) {
    const p = new Date(row["Date Modified"]);
    if (!isNaN(p)) dateModified = p.toISOString();
  }

  const isMarked = (row["Is Marked"] === true || row["Is Marked"] === 1) ? "true" : "false";
  const id = cuid();

  const cols = [
    "id", "title", "date", "type", "status", "source", "client",
    "description", '"trainerCalendar"', "medium", "location",
    "billing", "invoiced", "notes", '"isMarked"', '"markedFor"',
    '"actionType"', '"modifiedBy"', '"dateModified"', '"createdAt"', '"updatedAt"'
  ].join(", ");

  const vals = [
    esc(id),
    esc(row["Title"]),
    "'" + dateStr + "'",
    esc(row["Type"]),
    esc(row["Status"]),
    esc(row["Source"]),
    esc(row["Client"]),
    esc(row["Course/Description"]),
    esc(row["Trainer Calendar"]),
    esc(row["Medium"]),
    esc(row["Location"]),
    row["Billing"] ? esc(row["Billing"]) : "NULL",
    esc(row["Invoiced"] || "No"),
    row["Notes"] ? esc(row["Notes"]) : "NULL",
    isMarked,
    row["Marked For"] ? esc(row["Marked For"]) : "NULL",
    row["Action Type"] ? esc(row["Action Type"]) : "NULL",
    row["Modified By"] ? esc(row["Modified By"]) : "NULL",
    "'" + dateModified + "'",
    "'" + now + "'",
    "'" + now + "'",
  ].join(", ");

  lines.push('INSERT INTO "Event" (' + cols + ') VALUES (' + vals + ');');
}

fs.writeFileSync(path.join(__dirname, "migrate-events.sql"), lines.join("\n") + "\n");
console.log("Generated scripts/migrate-events.sql with " + rows.length + " inserts.");
