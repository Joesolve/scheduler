"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { PageHeader, Button, Input, Select, Card, Badge, Alert, Modal, MultiSelect, Textarea } from "@/components/ui";
import type { Event } from "@/types";

interface Settings {
  trainers: { name: string }[];
  lists: Record<string, string[]>;
}

function statusVariant(s: string): "green" | "orange" | "blue" | "slate" {
  if (s === "Confirmed") return "green";
  if (s === "Offered") return "orange";
  if (s === "Tentative") return "blue";
  return "slate";
}

function opts(arr: string[]) {
  return arr.map((v) => ({ value: v, label: v }));
}

export default function ManageEventsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Filters
  const [filters, setFilters] = useState({ trainer: "All", status: "All", source: "All", client: "", dateFrom: "", dateTo: "" });
  const [useDateRange, setUseDateRange] = useState(false);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Modals
  const [editEvent, setEditEvent] = useState<Event | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [dupEvent, setDupEvent] = useState<Event | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string[] | null>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(({ settings }) => setSettings(settings));
  }, []);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.trainer !== "All") params.set("trainer", filters.trainer);
    if (filters.status !== "All") params.set("status", filters.status);
    if (filters.source !== "All") params.set("source", filters.source);
    if (filters.client) params.set("client", filters.client);
    if (useDateRange && filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (useDateRange && filters.dateTo) params.set("dateTo", filters.dateTo);
    try {
      const res = await fetch(`/api/events?${params}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `API error ${res.status}`);
        setEvents([]);
      } else {
        setEvents(data.events ?? []);
      }
    } catch (err) {
      setError(`Failed to load events: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSelected(new Set());
      setLoading(false);
    }
  }, [filters, useDateRange]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Auto-clear success message after 3 seconds
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 3000);
    return () => clearTimeout(t);
  }, [success]);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === events.length) setSelected(new Set());
    else setSelected(new Set(events.map((e) => e.id)));
  }

  async function handleDelete(ids: string[]) {
    setError("");
    if (ids.length === 1) {
      await fetch(`/api/events/${ids[0]}`, { method: "DELETE" });
    } else {
      await fetch("/api/events/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids }),
      });
    }
    setSuccess(`Deleted ${ids.length} event(s).`);
    setDeleteConfirm(null);
    setSelected(new Set());
    fetchEvents();
  }

  if (!settings) return <div className="p-8 text-slate-500">Loading…</div>;

  const trainerNames = ["All", ...settings.trainers.map((t) => t.name)];
  const { lists } = settings;
  return (
    <div>
      <PageHeader title="🔍 Manage Events" subtitle={`${events.length} event(s) found`} />

      <div className="p-4 md:p-8 space-y-4 md:space-y-6">
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Select label="Trainer" value={filters.trainer} onChange={(e) => setFilters((f) => ({ ...f, trainer: e.target.value }))} options={opts(trainerNames)} />
            <Select label="Status" value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))} options={opts(["All", ...(lists.Statuses ?? [])])} />
            <Select label="Source" value={filters.source} onChange={(e) => setFilters((f) => ({ ...f, source: e.target.value }))} options={opts(["All", ...(lists.Sources ?? [])])} />
            <Input label="Client" value={filters.client} onChange={(e) => setFilters((f) => ({ ...f, client: e.target.value }))} placeholder="Search client…" />
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                <input type="checkbox" checked={useDateRange} onChange={(e) => setUseDateRange(e.target.checked)} className="rounded border-slate-300" />
                Date range
              </label>
            </div>
          </div>
          {useDateRange && (
            <div className="grid grid-cols-2 gap-3 mt-3 max-w-md">
              <Input label="From" type="date" value={filters.dateFrom} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value }))} />
              <Input label="To" type="date" value={filters.dateTo} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value }))} />
            </div>
          )}
        </Card>

        {/* Bulk actions */}
        {selected.size > 0 && (
          <div className="flex items-center gap-3 p-3 bg-brand-orange/10 border border-brand-orange/20 rounded-xl">
            <span className="text-sm font-semibold text-brand-orange">{selected.size} selected</span>
            {selected.size === 1 && (
              <>
               <Button variant="secondary" onClick={() => setEditEvent(events.find((e) => e.id === Array.from(selected)[0])!)}>✏️ Edit</Button>
                <Button variant="secondary" onClick={() => setDupEvent(events.find((e) => e.id === Array.from(selected)[0])!)}>📋 Duplicate</Button>
              </>
            )}
            {selected.size > 1 && (
              <Button variant="secondary" onClick={() => setBulkEditOpen(true)}>✏️ Bulk Edit</Button>
            )}
            <Button variant="danger" onClick={() => setDeleteConfirm([...selected])}>🗑️ Delete</Button>
            <Button variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
          </div>
        )}

        {/* Table */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" checked={selected.size === events.length && events.length > 0} onChange={toggleAll} className="rounded border-slate-300" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Trainer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">Source</th>
                <th className="w-20 px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">Loading…</td></tr>
              )}
              {!loading && events.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-slate-400">No events found.</td></tr>
              )}
              {events.map((ev) => (
                <tr key={ev.id} className={`hover:bg-slate-50 transition-colors ${selected.has(ev.id) ? "bg-orange-50/50" : ""} ${ev.isMarked ? "bg-red-50/40" : ""}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selected.has(ev.id)} onChange={() => toggleSelect(ev.id)} className="rounded border-slate-300" />
                  </td>
                  <td className="px-4 py-3 text-slate-700 font-mono text-xs whitespace-nowrap">
                    {format(new Date(ev.date), "dd/MM/yyyy")}
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-medium max-w-xs truncate">
                    {ev.isMarked ? <span className="text-red-600">🚫 {ev.description}</span> : ev.title}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{ev.trainerCalendar}</td>
                  <td className="px-4 py-3">
                    {!ev.isMarked && <Badge variant={statusVariant(ev.status)}>{ev.status}</Badge>}
                    {ev.isMarked && <Badge variant="red">Blocked</Badge>}
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{ev.client}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{ev.source}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setSelected(new Set([ev.id])); setEditEvent(ev); }}
                      className="text-xs text-brand-orange hover:underline"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* Download */}
          {events.length > 0 && (
            <div className="p-4 border-t border-slate-100">
              <a
                href={`/api/events/export?${new URLSearchParams({ trainer: filters.trainer, status: filters.status, source: filters.source, client: filters.client })}`}
                className="text-sm text-brand-orange hover:underline"
              >
                ⬇️ Download filtered data (Excel)
              </a>
            </div>
          )}
        </Card>
      </div>

      {/* Edit Modal */}
      {editEvent && (
        <EditEventModal
          event={editEvent}
          settings={settings}
          onClose={() => setEditEvent(null)}
          onSaved={() => { setEditEvent(null); fetchEvents(); setSuccess("Event updated."); }}
        />
      )}

      {/* Bulk Edit Modal */}
      <BulkEditModal
        open={bulkEditOpen}
        eventIds={Array.from(selected)}
        settings={settings}
        onClose={() => setBulkEditOpen(false)}
        onSaved={() => { setBulkEditOpen(false); fetchEvents(); setSuccess(`${selected.size} event(s) updated.`); }}
      />

      {/* Duplicate Modal */}
      {dupEvent && (
        <DuplicateModal
          event={dupEvent}
          onClose={() => setDupEvent(null)}
          onSaved={() => { setDupEvent(null); fetchEvents(); setSuccess("Event(s) duplicated."); }}
        />
      )}

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Delete">
        <p className="text-slate-600 mb-6">
          Delete <strong>{deleteConfirm?.length}</strong> event(s)? This cannot be undone.
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button variant="danger" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────
function EditEventModal({ event, settings, onClose, onSaved }: {
  event: Event; settings: Settings;
  onClose: () => void; onSaved: () => void;
}) {
  const { lists, trainers } = settings;
  const [form, setForm] = useState({
    startDate: new Date(event.date).toISOString().split("T")[0],
    endDate: new Date(event.date).toISOString().split("T")[0],
    type: event.type, status: event.status, source: event.source,
    client: event.client, description: event.description,
    trainers: event.trainerCalendar.split(",").map((t) => t.trim()).filter(Boolean),
    medium: event.medium, location: event.location,
    billing: event.billing ?? "", invoiced: event.invoiced, notes: event.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(k: string, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }
  function opts(arr: string[]) { return arr.map((v) => ({ value: v, label: v })); }

  async function handleSave() {
    setError("");
    if (!form.client.trim() || !form.description.trim() || !form.trainers.length) {
      return setError("Client, description, and trainer are required.");
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed to save.");
    } finally { setLoading(false); }
  }

  return (
    <Modal open title={`Edit: ${event.title}`} onClose={onClose} maxWidth="max-w-2xl">
      {error && <Alert type="error">{error}</Alert>}
      <div className="space-y-4 mt-4">
        <div className="grid grid-cols-2 gap-3">
          <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          <Input label="End Date" type="date" value={form.endDate} min={form.startDate} onChange={(e) => set("endDate", e.target.value)} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Select label="Type" value={form.type} onChange={(e) => set("type", e.target.value)} options={opts(lists.Types ?? [])} />
          <Select label="Status" value={form.status} onChange={(e) => set("status", e.target.value)} options={opts(lists.Statuses ?? [])} />
          <Select label="Source" value={form.source} onChange={(e) => set("source", e.target.value)} options={opts(lists.Sources ?? [])} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Client" value={form.client} onChange={(e) => set("client", e.target.value)} />
          <Input label="Course / Description" value={form.description} onChange={(e) => set("description", e.target.value)} />
        </div>
        <MultiSelect label="Trainer Calendar" options={["All", ...trainers.map((t) => t.name)]} value={form.trainers} onChange={(v) => set("trainers", v)} />
        <div className="grid grid-cols-3 gap-3">
          <Select label="Medium" value={form.medium} onChange={(e) => set("medium", e.target.value)} options={opts(lists.Mediums ?? [])} />
          <Select label="Location" value={form.location} onChange={(e) => set("location", e.target.value)} options={opts(lists.Locations ?? [])} />
          <Select label="Invoiced" value={form.invoiced} onChange={(e) => set("invoiced", e.target.value)} options={opts(["No", "Yes"])} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Textarea label="Billing Notes" value={form.billing} onChange={(e) => set("billing", e.target.value)} />
          <Textarea label="Notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleSave}>Save Changes</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Bulk Edit Modal ──────────────────────────────────────────────────────────
function BulkEditModal({ open, eventIds, settings, onClose, onSaved }: {
  open: boolean; eventIds: string[]; settings: Settings;
  onClose: () => void; onSaved: () => void;
}) {
  const { lists, trainers } = settings;
  const [fields, setFields] = useState<string[]>([]);
  const [updates, setUpdates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function opts(arr: string[]) { return arr.map((v) => ({ value: v, label: v })); }
  const ALL_FIELDS = ["Status", "Source", "Type", "Medium", "Location", "Invoiced", "Trainer Calendar"];

  async function handleBulkSave() {
    if (!fields.length) return;
    setLoading(true);
    const res = await fetch("/api/events/bulk", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update", ids: eventIds, updates }),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) onSaved();
  }

  return (
    <Modal open={open} onClose={onClose} title={`Bulk Edit — ${eventIds.length} events`}>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Fields to update</label>
          <div className="flex flex-wrap gap-2">
            {ALL_FIELDS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFields((prev) => prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f])}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  fields.includes(f) ? "bg-brand-orange text-white border-brand-orange" : "bg-white text-slate-600 border-slate-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {fields.includes("Status") && <Select label="New Status" options={opts(lists.Statuses ?? [])} value={updates.status ?? ""} onChange={(e) => setUpdates((u) => ({ ...u, status: e.target.value }))} />}
        {fields.includes("Source") && <Select label="New Source" options={opts(lists.Sources ?? [])} value={updates.source ?? ""} onChange={(e) => setUpdates((u) => ({ ...u, source: e.target.value }))} />}
        {fields.includes("Type") && <Select label="New Type" options={opts(lists.Types ?? [])} value={updates.type ?? ""} onChange={(e) => setUpdates((u) => ({ ...u, type: e.target.value }))} />}
        {fields.includes("Medium") && <Select label="New Medium" options={opts(lists.Mediums ?? [])} value={updates.medium ?? ""} onChange={(e) => setUpdates((u) => ({ ...u, medium: e.target.value }))} />}
        {fields.includes("Location") && <Select label="New Location" options={opts(lists.Locations ?? [])} value={updates.location ?? ""} onChange={(e) => setUpdates((u) => ({ ...u, location: e.target.value }))} />}
        {fields.includes("Invoiced") && <Select label="New Invoiced" options={opts(["No", "Yes"])} value={updates.invoiced ?? ""} onChange={(e) => setUpdates((u) => ({ ...u, invoiced: e.target.value }))} />}
        {fields.includes("Trainer Calendar") && <Select label="New Trainer" options={opts(["All", ...trainers.map((t) => t.name)])} value={updates.trainers ?? ""} onChange={(e) => setUpdates((u) => ({ ...u, trainers: e.target.value }))} />}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleBulkSave}>Apply to {eventIds.length} Events</Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Duplicate Modal ──────────────────────────────────────────────────────────
function DuplicateModal({ event, onClose, onSaved }: { event: Event; onClose: () => void; onSaved: () => void }) {
  const [method, setMethod] = useState<"single" | "range">("single");
  const [date, setDate] = useState("");
  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDuplicate() {
    setError("");
    if (method === "single" && !date) return setError("Select a date.");
    if (method === "range" && (!rangeStart || !rangeEnd)) return setError("Select a range.");
    setLoading(true);
    try {
      const res = await fetch("/api/events/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId: event.id, method, date, rangeStart, rangeEnd }),
      });
      const data = await res.json();
      if (data.success) onSaved();
      else setError(data.error ?? "Failed.");
    } finally { setLoading(false); }
  }

  return (
    <Modal open onClose={onClose} title="Duplicate Event">
      {error && <Alert type="error">{error}</Alert>}
      <div className="space-y-4 mt-4">
        <div className="flex gap-3">
          {(["single", "range"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${method === m ? "bg-brand-orange text-white border-brand-orange" : "bg-white text-slate-600 border-slate-200"}`}
            >
              {m === "single" ? "Single Date" : "Date Range"}
            </button>
          ))}
        </div>
        {method === "single" ? (
          <Input label="Duplicate to date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Input label="Range Start" type="date" value={rangeStart} onChange={(e) => setRangeStart(e.target.value)} />
            <Input label="Range End" type="date" value={rangeEnd} min={rangeStart} onChange={(e) => setRangeEnd(e.target.value)} />
          </div>
        )}
        <div className="flex gap-3 justify-end pt-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={loading} onClick={handleDuplicate}>🔄 Duplicate</Button>
        </div>
      </div>
    </Modal>
  );
}
