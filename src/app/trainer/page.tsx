"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { PageHeader, Select, Card, Alert } from "@/components/ui";
import { isSameLocalDay } from "@/lib/utils";
import { format } from "date-fns";
import type { Event } from "@/types";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];

function buildGrid(year: number, month: number): (number | 0)[][] {
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const startOffset = (firstDay + 6) % 7;
  const grid: (number | 0)[][] = [];
  let week: (number | 0)[] = Array(startOffset).fill(0);
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day);
    if (week.length === 7) { grid.push(week); week = []; }
  }
  if (week.length) { while (week.length < 7) week.push(0); grid.push(week); }
  return grid;
}

type TabMode = "calendar" | "list";

export default function TrainerPage() {
  const { data: session } = useSession();
  const trainerName = session?.user?.trainerName ?? "";

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [tab, setTab] = useState<TabMode>("calendar");
  const [trainerColor, setTrainerColor] = useState("#FF6B35");
  const [fetchError, setFetchError] = useState("");

  // List filters
  const [listFilters, setListFilters] = useState({ status: "All", source: "All", client: "" });
  const [allEvents, setAllEvents] = useState<Event[]>([]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ settings }) => {
        setTrainerColor(settings.trainerColors[trainerName] ?? "#FF6B35");
      })
      .catch(() => setFetchError("Failed to load settings."));
  }, [trainerName]);

  const fetchMonth = useCallback(() => {
    fetch(`/api/events?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then(({ events }) => setEvents(events ?? []))
      .catch(() => setFetchError("Failed to load events."));
  }, [year, month]);

  useEffect(() => { fetchMonth(); }, [fetchMonth]);

  useEffect(() => {
    if (tab === "list") {
      fetch("/api/events")
        .then((r) => r.json())
        .then(({ events }) => setAllEvents(events ?? []))
        .catch(() => setFetchError("Failed to load events."));
    }
  }, [tab]);

  const grid = buildGrid(year, month);

  const eventsByDay: Record<number, Event[]> = {};
  for (const ev of events) {
    const d = new Date(ev.date).getDate();
    if (!eventsByDay[d]) eventsByDay[d] = [];
    eventsByDay[d].push(ev);
  }

  const dayEvents = selectedDay
    ? events.filter((e) => isSameLocalDay(new Date(e.date), selectedDay))
    : [];

  const filteredList = allEvents.filter((e) => {
    if (e.isMarked) return false;
    if (listFilters.status !== "All" && e.status !== listFilters.status) return false;
    if (listFilters.source !== "All" && e.source !== listFilters.source) return false;
    if (listFilters.client && !e.client.toLowerCase().includes(listFilters.client.toLowerCase())) return false;
    return true;
  });

  const statuses = ["All", ...Array.from(new Set(allEvents.map((e) => e.status)))];
  const sources = ["All", ...Array.from(new Set(allEvents.map((e) => e.source)))];

  return (
    <div>
      <PageHeader title={`🎓 Welcome, ${trainerName}`} subtitle="Your event schedule" />
      {fetchError && <div className="mx-8 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">{fetchError}</div>}

      {/* Tab switcher */}
      <div className="px-8 pt-6 flex gap-1 border-b border-slate-200 bg-white">
        {(["calendar", "list"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === t ? "border-brand-orange text-brand-orange" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t === "calendar" ? "📅 Calendar View" : "📋 My Events List"}
          </button>
        ))}
      </div>

      <div className="p-4 md:p-8">
        {tab === "calendar" && (
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex gap-4 items-end">
              <div className="w-28">
                <Select label="Year" value={String(year)} onChange={(e) => setYear(Number(e.target.value))}
                  options={Array.from({ length: 4 }, (_, i) => ({ value: String(now.getFullYear() - 1 + i), label: String(now.getFullYear() - 1 + i) }))} />
              </div>
              <div className="w-40">
                <Select label="Month" value={String(month)} onChange={(e) => setMonth(Number(e.target.value))}
                  options={MONTHS.map((m, i) => ({ value: String(i + 1), label: m }))} />
              </div>
              <div className="flex items-center gap-2 ml-4">
                <span className="w-4 h-4 rounded-full" style={{ backgroundColor: trainerColor }} />
                <span className="text-sm font-medium text-slate-700">{trainerName}</span>
              </div>
            </div>

            {/* Calendar */}
            <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {DAYS.map((d) => (
                  <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">{d}</div>
                ))}
              </div>
              {grid.map((week, wi) => (
                <div key={wi} className="grid grid-cols-7 divide-x divide-slate-100">
                  {week.map((day, di) => {
                    if (!day) return <div key={`e-${wi}-${di}`} className="h-28 bg-slate-50/50" />;
                    const dayEvs = eventsByDay[day] ?? [];
                    const blocked = dayEvs.find((e) => e.isMarked);
                    const normal = dayEvs.filter((e) => !e.isMarked);
                    const thisDate = new Date(year, month - 1, day);
                    const isSelected = selectedDay?.getDate() === day && selectedDay?.getMonth() === month - 1;
                    const isToday = now.getDate() === day && now.getMonth() === month - 1 && now.getFullYear() === year;

                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(thisDate)}
                        className={`h-28 p-1.5 text-left transition-colors flex flex-col border-b border-slate-100
                          ${isSelected ? "ring-2 ring-inset ring-brand-orange bg-orange-50/40" : "hover:bg-slate-50"}
                          ${blocked ? "bg-red-50/60" : normal.length ? "" : ""}
                        `}
                      >
                        <span className={`text-sm font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${
                          isToday ? "bg-brand-orange text-white" : "text-slate-700"
                        }`}>{day}</span>
                        {blocked && (
                          <div className="text-[10px] text-red-600 font-semibold bg-red-100 rounded px-1 mb-0.5 truncate">
                            🚫 {blocked.description?.slice(0, 12) || "Blocked"}
                          </div>
                        )}
                        {normal.length > 0 && (
                          <>
                            <div className="h-1.5 rounded-full w-full mt-auto mb-0.5" style={{ backgroundColor: trainerColor }} />
                            <div className="text-[10px] text-slate-500">{normal.length} event{normal.length > 1 ? "s" : ""}</div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Day details */}
            {selectedDay && (
              <Card className="mt-4">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-900">📌 {format(selectedDay, "EEEE, d MMMM yyyy")}</h2>
                  <button onClick={() => setSelectedDay(null)} className="text-slate-400 hover:text-slate-600 text-xl">×</button>
                </div>
                <div className="p-6 space-y-3">
                  {dayEvents.length === 0 && <p className="text-slate-500 text-sm">No events this day.</p>}
                  {dayEvents.map((ev) => (
                    <div key={ev.id} className={`rounded-xl p-4 border ${ev.isMarked ? "border-red-200 bg-red-50" : "border-slate-200"}`}>
                      {ev.isMarked ? (
                        <>
                          <p className="font-semibold text-red-700 text-sm">🚫 Blocked for you</p>
                          <p className="text-xs text-red-600 mt-0.5">Reason: {ev.description}</p>
                        </>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-semibold text-slate-800 text-sm">{ev.title}</p>
                          <div className="grid grid-cols-2 gap-x-4 text-xs text-slate-600">
                            <span><strong>Type:</strong> {ev.type}</span>
                            <span><strong>Status:</strong> {ev.status}</span>
                            <span><strong>Client:</strong> {ev.client}</span>
                            <span><strong>Source:</strong> {ev.source}</span>
                            <span><strong>Medium:</strong> {ev.medium}</span>
                            <span><strong>Location:</strong> {ev.location}</span>
                          </div>
                          {ev.description && <p className="text-xs text-slate-600"><strong>Course:</strong> {ev.description}</p>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {tab === "list" && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              <Select label="Status" value={listFilters.status} onChange={(e) => setListFilters((f) => ({ ...f, status: e.target.value }))}
                options={statuses.map((v) => ({ value: v, label: v }))} />
              <Select label="Source" value={listFilters.source} onChange={(e) => setListFilters((f) => ({ ...f, source: e.target.value }))}
                options={sources.map((v) => ({ value: v, label: v }))} />
              <input
                placeholder="Search client…"
                value={listFilters.client}
                onChange={(e) => setListFilters((f) => ({ ...f, client: e.target.value }))}
                className="border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">{filteredList.length} event(s)</p>
              <a href="/api/events/export" className="text-sm text-brand-orange hover:underline">⬇️ Download Excel</a>
            </div>

            <Card className="overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {["Date","Title","Status","Client","Medium","Location"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredList.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">No events found.</td></tr>
                  )}
                  {filteredList.map((ev) => (
                    <tr key={ev.id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500 whitespace-nowrap">{format(new Date(ev.date), "dd/MM/yyyy")}</td>
                      <td className="px-4 py-2.5 font-medium text-slate-800 max-w-xs truncate">{ev.title}</td>
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
