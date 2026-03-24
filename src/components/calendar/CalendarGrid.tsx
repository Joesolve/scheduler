"use client";

import { useMemo } from "react";
import type { Event, Trainer } from "@/types";
import { markedForIncludes, trainerInList, isSameLocalDay } from "@/lib/utils";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function buildMonthGrid(year: number, month: number): (number | 0)[][] {
  // month is 1-based
  const firstDay = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  // Shift so Monday = 0
  const startOffset = (firstDay + 6) % 7;
  const grid: (number | 0)[][] = [];
  let day = 1;
  let week: (number | 0)[] = Array(startOffset).fill(0);
  while (day <= daysInMonth) {
    week.push(day);
    if (week.length === 7) {
      grid.push(week);
      week = [];
    }
    day++;
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(0);
    grid.push(week);
  }
  return grid;
}

interface CalendarGridProps {
  events: Event[];
  year: number;
  month: number;
  trainers: Trainer[];
  trainerColors: Record<string, string>;
  onDayClick: (date: Date) => void;
  selectedDay?: Date | null;
}

export function CalendarGrid({
  events,
  year,
  month,
  trainers,
  trainerColors,
  onDayClick,
  selectedDay,
}: CalendarGridProps) {
  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Group events by day-of-month for quick lookup
  const eventsByDay = useMemo(() => {
    const map: Record<number, Event[]> = {};
    for (const ev of events) {
      const d = new Date(ev.date);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(ev);
      }
    }
    return map;
  }, [events, year, month]);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">
            {d}
          </div>
        ))}
      </div>

      {/* Weeks */}
      {grid.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 divide-x divide-slate-100">
          {week.map((day, di) => {
            if (!day) {
              return (
                <div
                  key={`empty-${wi}-${di}`}
                  className="h-28 bg-slate-50/50"
                />
              );
            }

            const dayEvents = eventsByDay[day] ?? [];
            const blocked = dayEvents.filter((e) => e.isMarked);
            const normal = dayEvents.filter((e) => !e.isMarked);

            const thisDate = new Date(year, month - 1, day);
            const isSelected =
              selectedDay &&
              selectedDay.getFullYear() === year &&
              selectedDay.getMonth() + 1 === month &&
              selectedDay.getDate() === day;

            const today = new Date();
            const isToday =
              today.getFullYear() === year &&
              today.getMonth() + 1 === month &&
              today.getDate() === day;

            // Trainers active on this day
            const activeTrainers = new Set<string>();
            for (const ev of normal) {
              ev.trainerCalendar
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
                .forEach((t) => activeTrainers.add(t));
            }

            return (
              <button
                key={day}
                onClick={() => onDayClick(thisDate)}
                className={`h-28 p-1.5 text-left transition-colors relative flex flex-col border-b border-slate-100
                  ${isSelected ? "ring-2 ring-inset ring-brand-orange bg-orange-50/40" : "hover:bg-slate-50"}
                  ${blocked.length > 0 ? "bg-red-50/60" : ""}
                `}
              >
                {/* Day number */}
                <span
                  className={`text-sm font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full
                    ${isToday ? "bg-brand-orange text-white" : isSelected ? "text-brand-orange" : "text-slate-700"}
                  `}
                >
                  {day}
                </span>

                {/* Blocked indicator */}
                {blocked.length > 0 && (
                  <div className="text-[10px] text-red-600 font-semibold bg-red-100 rounded px-1 mb-0.5 truncate">
                    🚫 {blocked[0].description?.slice(0, 14) || "Blocked"}
                  </div>
                )}

                {/* Trainer color bars */}
                <div className="flex-1 space-y-0.5 overflow-hidden">
                  {trainers
                    .filter((t) => activeTrainers.has(t.name))
                    .map((t) => (
                      <div
                        key={t.name}
                        className="h-1.5 rounded-full w-full"
                        style={{ backgroundColor: trainerColors[t.name] ?? "#ccc" }}
                      />
                    ))}
                </div>

                {/* Event count */}
                {normal.length > 0 && (
                  <div className="text-[10px] text-slate-500 mt-auto">
                    {normal.length} event{normal.length > 1 ? "s" : ""}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Trainer Legend ───────────────────────────────────────────────────────────

export function TrainerLegend({
  trainers,
  trainerColors,
}: {
  trainers: Trainer[];
  trainerColors: Record<string, string>;
}) {
  if (!trainers.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {trainers.map((t) => (
        <div
          key={t.name}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-slate-200 bg-white text-sm font-medium"
        >
          <span
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: trainerColors[t.name] ?? "#ccc" }}
          />
          {t.name}
        </div>
      ))}
    </div>
  );
}
