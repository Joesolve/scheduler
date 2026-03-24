"use client";

import type { Event } from "@/types";
import { Badge, Button, Card } from "@/components/ui";
import { format } from "date-fns";

interface DayDetailsPanelProps {
  date: Date;
  events: Event[];
  canUnmark?: boolean;
  onUnmark?: (eventId: string) => void;
  onClose: () => void;
}

function statusVariant(status: string) {
  if (status === "Confirmed") return "green";
  if (status === "Offered") return "orange";
  if (status === "Tentative") return "blue";
  return "slate";
}

export function DayDetailsPanel({
  date,
  events,
  canUnmark,
  onUnmark,
  onClose,
}: DayDetailsPanelProps) {
  const blocked = events.filter((e) => e.isMarked);
  const normal = events.filter((e) => !e.isMarked);

  return (
    <Card className="mt-4">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-900">
          📌 {format(date, "EEEE, d MMMM yyyy")}
        </h2>
        <Button variant="ghost" onClick={onClose} className="text-slate-400">
          ✕ Close
        </Button>
      </div>

      <div className="p-6 space-y-4">
        {events.length === 0 && (
          <p className="text-slate-500 text-sm text-center py-4">
            No events on this day.
          </p>
        )}

        {/* Blocked dates */}
        {blocked.map((ev) => (
          <div
            key={ev.id}
            className="border border-red-200 bg-red-50 rounded-xl p-4 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold text-red-700 text-sm">
                  🚫 BLOCKED — For: {ev.markedFor ?? "All"}
                </p>
                <p className="text-sm text-red-600 mt-0.5">
                  Reason: {ev.description}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  By {ev.modifiedBy} on{" "}
                  {ev.dateModified
                    ? format(new Date(ev.dateModified), "dd/MM/yyyy HH:mm")
                    : "—"}
                </p>
              </div>
              {canUnmark && onUnmark && (
                <Button
                  variant="secondary"
                  onClick={() => onUnmark(ev.id)}
                  className="shrink-0 text-xs"
                >
                  ✅ Unmark
                </Button>
              )}
            </div>
          </div>
        ))}

        {/* Normal events */}
        {normal.map((ev) => (
          <div
            key={ev.id}
            className="border border-slate-200 rounded-xl p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-slate-900 text-sm">{ev.title}</p>
              <div className="flex gap-1.5 shrink-0">
                <Badge variant={statusVariant(ev.status) as any}>{ev.status}</Badge>
                <Badge>{ev.type}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-slate-600">
              <span>
                <span className="font-medium text-slate-700">Trainer: </span>
                {ev.trainerCalendar}
              </span>
              <span>
                <span className="font-medium text-slate-700">Client: </span>
                {ev.client}
              </span>
              <span>
                <span className="font-medium text-slate-700">Source: </span>
                {ev.source}
              </span>
              <span>
                <span className="font-medium text-slate-700">Medium: </span>
                {ev.medium}
              </span>
              <span>
                <span className="font-medium text-slate-700">Location: </span>
                {ev.location}
              </span>
              <span>
                <span className="font-medium text-slate-700">Invoiced: </span>
                {ev.invoiced}
              </span>
            </div>

            {ev.description && (
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-700">Course: </span>
                {ev.description}
              </p>
            )}
            {ev.notes && ev.notes !== "nan" && (
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-700">Notes: </span>
                {ev.notes}
              </p>
            )}
            {ev.billing && ev.billing !== "nan" && (
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-700">Billing: </span>
                {ev.billing}
              </p>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}
