"use client";

import { useState, useEffect } from "react";
import { PageHeader, Button, Input, Select, Card, Alert } from "@/components/ui";
import { format } from "date-fns";
import type { Event, Trainer } from "@/types";

export default function MarkDatesPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [markedDates, setMarkedDates] = useState<Event[]>([]);
  const [form, setForm] = useState({
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
    scope: "All Trainers" as "All Trainers" | "Specific Trainer(s)",
    trainers: [] as string[],
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(({ settings }) => setTrainers(settings.trainers));
    loadMarked();
  }, []);

  function loadMarked() {
    fetch("/api/events?dateFrom=2000-01-01")
      .then((r) => r.json())
      .then(({ events }) => setMarkedDates((events ?? []).filter((e: Event) => e.isMarked)));
  }

  function set(k: string, v: unknown) { setForm((f) => ({ ...f, [k]: v })); }

  function toggleTrainer(name: string) {
    setForm((f) => ({
      ...f,
      trainers: f.trainers.includes(name)
        ? f.trainers.filter((t) => t !== name)
        : [...f.trainers, name],
    }));
  }

  async function handleMark(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setSuccess("");
    setLoading(true);
    try {
      const res = await fetch("/api/events/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(`✅ Marked ${data.count} day(s).`);
        loadMarked();
        setForm((f) => ({ ...f, reason: "" }));
      } else {
        setError(data.error ?? "Failed.");
      }
    } finally { setLoading(false); }
  }

  async function handleUnmark(id: string) {
    await fetch(`/api/events/${id}`, { method: "DELETE" });
    loadMarked();
  }

  return (
    <div>
      <PageHeader title="🚫 Mark Dates" subtitle="Block dates for all trainers or specific trainer(s)" />
      <div className="p-8">
        <div className="grid grid-cols-2 gap-8">
          {/* Form */}
          <div>
            <form onSubmit={handleMark} className="space-y-4">
              {error && <Alert type="error">{error}</Alert>}
              {success && <Alert type="success">{success}</Alert>}

              <Card className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Start Date" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
                  <Input label="End Date" type="date" value={form.endDate} min={form.startDate} onChange={(e) => set("endDate", e.target.value)} />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Block Scope</label>
                  <div className="flex gap-3">
                    {(["All Trainers", "Specific Trainer(s)"] as const).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => set("scope", s)}
                        className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${
                          form.scope === s ? "bg-brand-orange text-white border-brand-orange" : "bg-white text-slate-600 border-slate-200 hover:border-brand-orange"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {form.scope === "Specific Trainer(s)" && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Choose Trainer(s)</label>
                    <div className="flex flex-wrap gap-2">
                      {trainers.map((t) => (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => toggleTrainer(t.name)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                            form.trainers.includes(t.name)
                              ? "text-white border-transparent"
                              : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                          }`}
                          style={form.trainers.includes(t.name) ? { backgroundColor: t.color } : {}}
                        >
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Input
                  label="Reason"
                  value={form.reason}
                  onChange={(e) => set("reason", e.target.value)}
                  placeholder="e.g. Public holiday, Leave"
                />

                <Button type="submit" loading={loading} fullWidth>
                  🚫 Mark Dates
                </Button>
              </Card>
            </form>
          </div>

          {/* Existing marked dates */}
          <div>
            <h2 className="text-sm font-semibold text-slate-700 mb-3">
              Currently Marked ({markedDates.length})
            </h2>
            {markedDates.length === 0 ? (
              <Card className="p-6 text-center text-slate-400 text-sm">No blocked dates.</Card>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin pr-1">
                {markedDates
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((ev) => (
                    <Card key={ev.id} className="px-4 py-3 flex items-start justify-between gap-3 border-red-100">
                      <div>
                        <p className="text-sm font-medium text-red-700">
                          🚫 {format(new Date(ev.date), "dd MMM yyyy")}
                        </p>
                        <p className="text-xs text-slate-600 mt-0.5">
                          <span className="font-medium">For:</span> {ev.markedFor}
                        </p>
                        {ev.description && ev.description !== "Marked Date" && (
                          <p className="text-xs text-slate-500">
                            <span className="font-medium">Reason:</span> {ev.description}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnmark(ev.id)}
                        className="text-xs text-green-600 hover:text-green-800 font-medium shrink-0 transition-colors"
                      >
                        ✅ Unmark
                      </button>
                    </Card>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
