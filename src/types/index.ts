// ─── Core Domain Types ────────────────────────────────────────────────────────

export type UserRole = "admin" | "trainer" | "view_only";

export interface User {
  id: string;
  email: string;
  role: UserRole;
  trainerName?: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Event {
  id: string;
  title: string;
  date: Date;
  type: string;
  status: string;
  source: string;
  client: string;
  description: string;
  trainerCalendar: string; // comma-separated
  medium: string;
  location: string;
  billing?: string | null;
  invoiced: string;
  notes?: string | null;
  isMarked: boolean;
  markedFor?: string | null;
  actionType?: string | null;
  modifiedBy?: string | null;
  dateModified: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Trainer {
  id: string;
  name: string;
  color: string;
  active: boolean;
}

export interface ListItem {
  id: string;
  category: ListCategory;
  value: string;
  active: boolean;
  order: number;
}

export interface AppRule {
  id: string;
  key: string;
  value: string;
}

export interface AppDefault {
  id: string;
  key: string;
  value: string;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  details?: string | null;
}

// ─── Constants / Unions ───────────────────────────────────────────────────────

export type ListCategory =
  | "Locations"
  | "Sources"
  | "Statuses"
  | "Mediums"
  | "Types";

// ─── App Settings (aggregated for use in pages) ───────────────────────────────

export interface AppSettings {
  trainers: Trainer[];
  trainerColors: Record<string, string>;
  lists: Record<ListCategory, string[]>;
  rules: Record<string, boolean>;
  defaults: Record<string, string>;
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface NewEventFormData {
  startDate: string;
  endDate: string;
  type: string;
  status: string;
  source: string;
  client: string;
  description: string;
  trainers: string[];
  medium: string;
  location: string;
  billing: string;
  invoiced: "Yes" | "No";
  notes: string;
}

export interface MarkDateFormData {
  startDate: string;
  endDate: string;
  scope: "All Trainers" | "Specific Trainer(s)";
  trainers: string[];
  reason: string;
}

// ─── API Response Types ───────────────────────────────────────────────────────

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Session Extension (NextAuth) ─────────────────────────────────────────────

// next-auth.d.ts declarations are in src/types/next-auth.d.ts
