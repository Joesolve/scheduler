import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database…");

  // ── Admin user ──────────────────────────────────────────────────────────────
  const existing = await prisma.user.findUnique({ where: { email: "sues@eqstrategist.com" } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: "sues@eqstrategist.com",
        role: "admin",
        active: true,
        password: await bcrypt.hash("Welcome123", 12),
      },
    });
    console.log("✅ Created admin user: sues@eqstrategist.com / Welcome123");
  } else {
    console.log("ℹ️  Admin user already exists.");
  }

  // ── Trainers ────────────────────────────────────────────────────────────────
  const trainers = [
    { name: "Dom",    color: "#E74E25" },
    { name: "Andrew", color: "#4ECDC4" },
    { name: "Dale",   color: "#4A90E2" },
    { name: "Jack",   color: "#FFD93D" },
  ];
  for (const t of trainers) {
    await prisma.trainer.upsert({
      where: { name: t.name },
      update: {},
      create: { name: t.name, color: t.color, active: true },
    });
  }
  console.log("✅ Seeded trainers.");

  // ── List items ──────────────────────────────────────────────────────────────
  const lists: { category: string; values: string[] }[] = [
    { category: "Locations", values: ["Syd", "Mel", "Bne", "SG", "Msia", "Global"] },
    { category: "Sources",   values: ["EQS", "CCE", "CTD"] },
    { category: "Statuses",  values: ["Offered", "Tentative", "Confirmed"] },
    { category: "Mediums",   values: ["F2F", "Online"] },
    { category: "Types",     values: ["W", "C", "M"] },
  ];
  let order = 0;
  for (const { category, values } of lists) {
    for (const value of values) {
      await prisma.listItem.upsert({
        where: { category_value: { category, value } },
        update: {},
        create: { category, value, active: true, order: order++ },
      });
    }
  }
  console.log("✅ Seeded list items.");

  // ── Rules ───────────────────────────────────────────────────────────────────
  const rules = [
    { key: "only_admin_can_block",          value: "true" },
    { key: "blocked_prevents_duplicates",   value: "true" },
    { key: "blocked_allows_visible_events", value: "true" },
  ];
  for (const r of rules) {
    await prisma.appRule.upsert({ where: { key: r.key }, update: {}, create: r });
  }
  console.log("✅ Seeded rules.");

  // ── Defaults ─────────────────────────────────────────────────────────────────
  const defaults = [
    { key: "default_status",   value: "Offered" },
    { key: "default_medium",   value: "Online" },
    { key: "default_source",   value: "EQS" },
    { key: "default_location", value: "Global" },
    { key: "default_type",     value: "W" },
  ];
  for (const d of defaults) {
    await prisma.appDefault.upsert({ where: { key: d.key }, update: {}, create: d });
  }
  console.log("✅ Seeded defaults.");

  // ── Notifications ─────────────────────────────────────────────────────────────
  const notifs = [
    { key: "notify_on_new_event", value: "false" },
    { key: "notify_on_edit",      value: "false" },
    { key: "notify_on_block",     value: "false" },
    { key: "notification_emails", value: "" },
  ];
  for (const n of notifs) {
    await prisma.notification.upsert({ where: { key: n.key }, update: {}, create: n });
  }
  console.log("✅ Seeded notifications.");

  console.log("\n🎉 Done! Login at http://localhost:3000 with:");
  console.log("   Email:    sues@eqstrategist.com");
  console.log("   Password: Welcome123");
  console.log("\n⚠️  Change the password immediately after first login.\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
