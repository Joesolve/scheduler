"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Select, Card } from "@/components/ui";
import { isSameLocalDay } from "@/lib/utils";
import { CalendarGrid, TrainerLegend } from "@/components/calendar/CalendarGrid";
import { DayDetailsPanel } from "@/components/calendar/DayDetailsPanel";
import type { Event, Trainer } from "@/types";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function AdminCalendarPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<Event[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerColors, setTrainerColors] = useState<Record<string, string>>({});
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ settings }) => {
        setTrainers(settings.trainers ?? []);
        setTrainerColors(settings.trainerColors ?? {});
      })
      .catch(() => setFetchError("Failed to load settings."));
  }, []);

  const fetchEvents = useCallback(() => {
    fetch(`/api/events?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(({ events }) => setEvents(events ?? []))
      .catch(() => setFetchError("Failed to load events."));
  }, [year, month]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const years = Array.from({ length: 4 }, (_, i) => now.getFullYear() - 1 + i);

  function handleUnmark(eventId: string) {
    fetch(`/api/events/${eventId}`, { method: "DELETE" }).then(() => {
      setSelectedDay(null);
      fetchEvents();
    });
  }

  const dayEvents = selectedDay
    ? events.filter((e) => isSameLocalDay(new Date(e.date), selectedDay))
    : [];

  return (
    <div>
      <PageHeader title="📅 Calendar View" />
      <div className="p-8 space-y-4">
        {fetchError && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{fetchError}</div>}
        {/* Controls */}
        <div className="flex gap-4 items-end">
          <div className="w-28">
            <Select
              label="Year"
              value={String(year)}
              onChange={(e) => setYear(Number(e.target.value))}
              options={years.map((y) => ({ value: String(y), label: String(y) }))}
            />
          </div>
          <div className="w-40">
            <Select
              label="Month"
              value={String(month)}
              onChange={(e) => setMonth(Number(e.target.value))}
              options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))}
            />
          </div>
        </div>

        <TrainerLegend trainers={trainers} trainerColors={trainerColors} />

        <CalendarGrid
          events={events}
          year={year}
          month={month}
          trainers={trainers}
          trainerColors={trainerColors}
          onDayClick={setSelectedDay}
          selectedDay={selectedDay}
        />

        {/* Day details */}
        {selectedDay && (
          <DayDetailsPanel
            date={selectedDay}
            events={dayEvents}
            canUnmark
            onUnmark={handleUnmark}
            onClose={() => setSelectedDay(null)}
          />
        )}

        {/* Month event list */}
        <div className="mt-4">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            All events in {MONTHS[month - 1]} {year}
          </h2>
          {events.filter((e) => !e.isMarked).length === 0 ? (
            <p className="text-slate-500 text-sm">No events this month.</p>
          ) : (
            <div className="space-y-2">
              {events
                .filter((e) => !e.isMarked)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((ev) => (
                  <Card key={ev.id} className="px-4 py-3 flex items-center gap-4">
                    <span className="font-mono text-xs text-slate-500 w-20 shrink-0">
                      {new Date(ev.date).toLocaleDateString("en-AU", { day: "2-digit", month: "short" })}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{ev.title}</p>
                      <p className="text-xs text-slate-500">{ev.trainerCalendar}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                      ev.status === "Confirmed" ? "bg-green-100 text-green-700"
                      : ev.status === "Offered" ? "bg-orange-100 text-orange-700"
                      : "bg-slate-100 text-slate-600"
                    }`}>{ev.status}</span>
                  </Card>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
