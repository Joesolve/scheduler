import prisma from "@/lib/db";
import type { AppSettings, ListCategory } from "@/types";

/**
 * Load all app settings in one query batch.
 * Replaces the Python load_settings() function.
 */
export async function loadSettings(): Promise<AppSettings & { notifications: Record<string, string> }> {
  const [trainers, listItems, rules, defaults, notifs] = await Promise.all([
    prisma.trainer.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.listItem.findMany({ where: { active: true }, orderBy: { order: "asc" } }),
    prisma.appRule.findMany(),
    prisma.appDefault.findMany(),
    prisma.notification.findMany(),
  ]);

  // Build trainer color map
  const trainerColors: Record<string, string> = {};
  for (const t of trainers) {
    trainerColors[t.name] = t.color;
  }

  // Group list items by category
  const lists: Record<ListCategory, string[]> = {
    Locations: [],
    Sources: [],
    Statuses: [],
    Mediums: [],
    Types: [],
  };
  for (const item of listItems) {
    const cat = item.category as ListCategory;
    if (lists[cat]) lists[cat].push(item.value);
  }

  // Rules map (string -> boolean)
  const rulesMap: Record<string, boolean> = {};
  for (const rule of rules) {
    rulesMap[rule.key] = rule.value === "true";
  }

  // Defaults map
  const defaultsMap: Record<string, string> = {};
  for (const def of defaults) {
    defaultsMap[def.key] = def.value;
  }

  // Notifications map
  const notificationsMap: Record<string, string> = {};
  for (const n of notifs) {
    notificationsMap[n.key] = n.value;
  }

  return {
    trainers,
    trainerColors,
    lists,
    rules: rulesMap,
    defaults: defaultsMap,
    notifications: notificationsMap,
  };
}

/**
 * Check if a date is blocked for a specific trainer.
 */
export async function isDateBlockedForTrainer(
  date: Date,
  trainer: string
): Promise<boolean> {
  // Create a 48-hour window centred on the date to catch any stored time offset
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const marks = await prisma.event.findMany({
    where: {
      isMarked: true,
      date: { gte: startOfDay, lte: endOfDay },
    },
  });

  for (const mark of marks) {
    const markedFor = mark.markedFor ?? "";
    if (
      markedFor.toLowerCase() === "all" ||
      markedFor
        .split(",")
        .map((p) => p.trim())
        .includes(trainer)
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Append an audit log entry.
 */
export async function appendAudit(
  user: string,
  action: string,
  details?: string
): Promise<void> {
  await prisma.auditLog.create({
    data: { user, action, details: details ?? "" },
  });
}
