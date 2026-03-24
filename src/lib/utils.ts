// ─── Event Utilities ─────────────────────────────────────────────────────────

export function generateTitle(row: {
  status?: string;
  source?: string;
  client?: string;
  description?: string;
  medium?: string;
  trainerCalendar?: string;
  location?: string;
}): string {
  const status = row.status ?? "";
  const source = row.source ?? "";
  const client = row.client ?? "";
  const course = row.description ?? "";
  const medium = row.medium ?? "";
  const trainer = row.trainerCalendar ?? "";
  const location = row.location ?? "";

  let base = `${status}-${source}-${client} ${course}`;
  if (medium) base += ` (${medium})`;
  if (trainer) base += ` ${trainer}`;
  if (location) base += ` ${location}`;

  return base.trim();
}

/**
 * Check if a trainer is included in a comma-separated trainer string.
 */
export function trainerInList(trainerCalendar: string, trainer: string): boolean {
  if (!trainerCalendar) return false;
  return trainerCalendar
    .split(",")
    .map((t) => t.trim())
    .includes(trainer);
}

/**
 * Check if a "markedFor" value includes the given trainer.
 * "All" matches everyone; otherwise checks comma-separated list.
 */
export function markedForIncludes(
  markedFor: string | null | undefined,
  trainer: string
): boolean {
  if (!markedFor) return false;
  const val = markedFor.trim();
  if (val.toLowerCase() === "all") return true;
  return val
    .split(",")
    .map((p) => p.trim())
    .includes(trainer);
}

// ─── Input Validation ─────────────────────────────────────────────────────────

export const MAX_TEXT_LENGTH = 500;
export const MAX_CLIENT_LENGTH = 200;
export const MAX_NOTES_LENGTH = 2000;

export function sanitizeText(text: string, maxLength = MAX_TEXT_LENGTH): string {
  if (!text) return "";
  return text.trim().slice(0, maxLength);
}

export function validateText(
  text: string,
  fieldName: string,
  maxLength = MAX_TEXT_LENGTH
): { valid: boolean; error?: string } {
  if (text.length > maxLength) {
    return {
      valid: false,
      error: `${fieldName} must be less than ${maxLength} characters.`,
    };
  }
  const dangerous = ["<script", "javascript:", "onerror=", "onclick="];
  if (dangerous.some((d) => text.includes(d))) {
    return { valid: false, error: `${fieldName} contains invalid characters.` };
  }
  return { valid: true };
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email) return { valid: false, error: "Email is required." };
  const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!pattern.test(email)) return { valid: false, error: "Invalid email format." };
  if (email.length > 254) return { valid: false, error: "Email too long." };
  return { valid: true };
}

// ─── Date Utilities ───────────────────────────────────────────────────────────

/**
 * Generate an array of Date objects between start and end (inclusive).
 */
export function dateRange(start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);
  const endDate = new Date(end);
  endDate.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/**
 * Format a Date to YYYY-MM-DD string.
 */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Extract the YYYY-MM-DD portion of a Date in LOCAL timezone.
 * Use this instead of getFullYear/getMonth/getDate chains when comparing
 * event dates (stored as noon UTC) to calendar day buttons (local midnight).
 */
export function toLocalDateKey(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Compare two dates by their local YYYY-MM-DD representation.
 */
export function isSameLocalDay(a: Date | string, b: Date | string): boolean {
  return toLocalDateKey(a) === toLocalDateKey(b);
}
