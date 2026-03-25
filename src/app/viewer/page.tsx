"use client";

import { useState, useEffect, useCallback } from "react";
import { PageHeader, Select, Card, Alert } from "@/components/ui";
import { isSameLocalDay } from "@/lib/utils";
import { CalendarGrid, TrainerLegend } from "@/components/calendar/CalendarGrid";
import { DayDetailsPanel } from "@/components/calendar/DayDetailsPanel";
import { format } from "date-fns";
import type { Event, Trainer } from "@/types";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

type TabMode = "calendar" | "list";

export default function ViewerPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [trainerColors, setTrainerColors] = useState<Record<string, string>>({});
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [tab, setTab] = useState<TabMode>("calendar");
  const [fetchError, setFetchError] = useState("");
  const [listFilters, setListFilters] = useState({ trainer: "All", status: "All", source: "All", client: "" });

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ settings }) => {
        setTrainers(settings.trainers ?? []);
        setTrainerColors(settings.trainerColors ?? {});
      })
      .catch(() => setFetchError("Failed to load settings."));
  }, []);

  const fetchMonth = useCallback(() => {
    fetch(`/api/events?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(({ events }) => setEvents(events ?? []))
      .catch(() => setFetchError("Failed to load events."));
  }, [year, month]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  useEffect(() => {
    if (tab === "list") {
      const params = new URLSearchParams();
      if (listFilters.trainer !== "All") params.set("trainer", listFilters.trainer);
      if (listFilters.status !== "All") params.set("status", listFilters.status);
      if (listFilters.source !== "All") params.set("source", listFilters.source);
      if (listFilters.client) params.set("client", listFilters.client);
      fetch(`/api/events?${params}`).then((r) => r.json()).then(({ events }) => setAllEvents(events ?? []));
    }
  }, [tab, listFilters]);

  const dayEvents = selectedDay
    ? events.filter((e) => isSameLocalDay(new Date(e.date), selectedDay))
    : [];

  const statuses = ["All", ...Array.from(new Set(allEvents.filter((e) => !e.isMarked).map((e) => e.status)))];
  const sources = ["All", ...Array.from(new Set(allEvents.filter((e) => !e.isMarked).map((e) => e.source)))];

  return (
    <div>
      <PageHeader title="👁️ View Events" subtitle="Read-only access — you can view but not modify events" />
      {fetchError && <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{fetchError}</div>}

      <div className="px-8 pt-4">
        <Alert type="info">You have view-only access. Contact an admin to make changes.</Alert>
      </div>

      <div className="px-8 pt-4 flex gap-1 border-b border-slate-200 bg-white">
        {(["calendar", "list"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? "border-brand-orange text-brand-orange" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "calendar" ? "📅 Calendar View" : "📋 Events List"}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-8 space-y-4">
        {tab === "calendar" && (
          <>
            <div className="flex gap-4 items-end">
              <div className="w-28">
                <Select label="Year" value={String(year)} onChange={(e) => setYear(Number(e.target.value))}
                  options={Array.from({ length: 4 }, (_, i) => ({ value: String(now.getFullYear() - 1 + i), label: String(now.getFullYear() - 1 + i) }))} />
              </div>
              <div className="w-40">
                <Select label="Month" value={String(month)} onChange={(e) => setMonth(Number(e.target.value))}
                  options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
              </div>
            </div>

            <TrainerLegend trainers={trainers} trainerColors={trainerColors} />

            <CalendarGrid
              events={events} year={year} month={month}
              trainers={trainers} trainerColors={trainerColors}
              onDayClick={setSelectedDay} selectedDay={selectedDay}
            />

            {selectedDay && (
              <DayDetailsPanel
                date={selectedDay} events={dayEvents}
                canUnmark={false} onClose={() => setSelectedDay(null)}
              />
            )}
          </>
        )}

        {tab === "list" && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3 max-w-2xl">
              <Select label="Trainer" value={listFilters.trainer} onChange={(e) => setListFilters((f) => ({ ...f, trainer: e.target.value }))}
                options={["All", ...trainers.map((t) => t.name)].map((v) => ({ value: v, label: v }))} />
              <Select label="Status" value={listFilters.status} onChange={(e) => setListFilters((f) => ({ ...f, status: e.target.value }))}
                options={statuses.map((v) => ({ value: v, label: v }))} />
              <Select label="Source" value={listFilters.source} onChange={(e) => setListFilters((f) => ({ ...f, source: e.target.value }))}
                options={sources.map((v) => ({ value: v, label: v }))} />
              <input placeholder="Search client…" value={listFilters.client}
                onChange={(e) => setListFilters((f) => ({ ...f, client: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-orange" />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{allEvents.filter((e) => !e.isMarked).length} event(s)</p>
              <a href={`/api/events/export?trainer=${listFilters.trainer}&status=${listFilters.status}&source=${listFilters.source}&client=${listFilters.client}`}
                className="text-sm text-brand-orange hover:underline">⬇️ Download Excel</a>
            </div>

            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {["Date","Title","Trainer","Status","Client","Medium","Location"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allEvents.filter((e) => !e.isMarked).length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">No events found.</td></tr>
                  )}
                  {allEvents.filter((e) => !e.isMarked).map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">{format(new Date(ev.date), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 max-w-xs truncate">{ev.title}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{ev.trainerCalendar}</td>
                      <td className="px-4 py-2.5"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ev.status === "Confirmed" ? "bg-green-100 text-green-700" : ev.status === "Offered" ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600"}`}>{ev.status}</span></td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{ev.client}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{ev.medium}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{ev.location}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
