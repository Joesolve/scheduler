"use client";

import { useState, useEffect } from "react";
import { PageHeader, Button, Input, Textarea, Select, MultiSelect, Alert, Card } from "@/components/ui";

interface Settings {
  trainers: { name: string; color: string; active: boolean }[];
  lists: Record<string, string[]>;
  defaults: Record<string, string>;
}

const today = () => new Date().toISOString().split("T")[0];

export default function NewEventPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [form, setForm] = useState({
    startDate: today(), endDate: today(),
    type: "", status: "", source: "", client: "", description: "",
    trainers: [] as string[], medium: "", location: "",
    billing: "", invoiced: "No", notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-clear success after 4 seconds
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(t);
  }, [success]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then(({ settings }) => {
        setSettings(settings);
        setForm((f) => ({
          ...f,
          type: settings.defaults.default_type ?? "",
          status: settings.defaults.default_status ?? "",
          source: settings.defaults.default_source ?? "",
          medium: settings.defaults.default_medium ?? "",
          location: settings.defaults.default_location ?? "",
        }));
      })
      .catch(() => setError("Failed to load form settings. Please refresh."));
  }, []);

  function set(key: string, val: unknown) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!form.client.trim()) return setError("Client is required.");
    if (!form.description.trim()) return setError("Course / Description is required.");
    if (!form.trainers.length) return setError("Select at least one trainer.");
    if (form.endDate < form.startDate) return setError("End date cannot be before start date.");

    setLoading(true);
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`✅ ${data.count} event(s) added successfully!`);
        setForm((f) => ({ ...f, client: "", description: "", billing: "", notes: "", trainers: [], startDate: today(), endDate: today() }));
      } else {
        setError(data.error ?? "Failed to save event.");
      }
    } finally {
      setLoading(false);
    }
  }

  if (!settings) return <div className="p-8 text-slate-500">Loading…</div>;

  const { trainers, lists } = settings;
  const trainerNames = ["All", ...trainers.map((t) => t.name)];

  function opts(arr: string[]) {
    return arr.map((v) => ({ value: v, label: v }));
  }

  return (
    <div>
      <PageHeader title="➕ New Event" subtitle="Create one or more events across a date range" />
      <div className="p-8 max-w-4xl">
        {error && <Alert type="error">{error}</Alert>}
        {success && <div className="mb-4"><Alert type="success">{success}</Alert></div>}

        <form onSubmit={handleSubmit}>
          <Card className="p-6 space-y-6">
            {/* Dates */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Date Range</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                <Input label="End Date" type="date" value={form.endDate} min={form.startDate} onChange={(e) => set("endDate", e.target.value)} />
              </div>
              {form.startDate && form.endDate && form.endDate > form.startDate && (
                <p className="text-xs text-slate-500 mt-1">
                  Creates one event per day —{" "}
                  {Math.ceil((new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) / 86400000) + 1} day(s)
                </p>
              )}
            </div>

            {/* Event details */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Event Details</h3>
              <div className="grid grid-cols-3 gap-4">
                <Select label="Type" value={form.type} onChange={(e) => set("type", e.target.value)} options={opts(lists.Types ?? [])} />
                <Select label="Status" value={form.status} onChange={(e) => set("status", e.target.value)} options={opts(lists.Statuses ?? [])} />
                <Select label="Source" value={form.source} onChange={(e) => set("source", e.target.value)} options={opts(lists.Sources ?? [])} />
              </div>
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input label="Client *" value={form.client} onChange={(e) => set("client", e.target.value)} placeholder="Client name" maxLength={200} />
                <Input label="Course / Description *" value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Course name or description" maxLength={500} />
              </div>
            </div>

            {/* Trainers */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Trainers & Delivery</h3>
              <MultiSelect
                label="Trainer Calendar *"
                options={trainerNames}
                value={form.trainers}
                onChange={(v) => set("trainers", v)}
              />
              <div className="grid grid-cols-3 gap-4 mt-4">
                <Select label="Medium" value={form.medium} onChange={(e) => set("medium", e.target.value)} options={opts(lists.Mediums ?? [])} />
                <Select label="Location" value={form.location} onChange={(e) => set("location", e.target.value)} options={opts(lists.Locations ?? [])} />
                <Select label="Invoiced" value={form.invoiced} onChange={(e) => set("invoiced", e.target.value)} options={opts(["No", "Yes"])} />
              </div>
            </div>

            {/* Notes */}
            <div>
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Notes</h3>
              <div className="grid grid-cols-2 gap-4">
                <Textarea label="Billing Notes" value={form.billing} onChange={(e) => set("billing", e.target.value)} maxLength={2000} />
                <Textarea label="Additional Notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} />
              </div>
            </div>

            <div className="pt-2">
              <Button type="submit" loading={loading} fullWidth>
                Save Event
              </Button>
            </div>
          </Card>
        </form>
      </div>
    </div>
  );
}
