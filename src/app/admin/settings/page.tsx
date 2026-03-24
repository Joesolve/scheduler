"use client";

import { useState, useEffect } from "react";
import { PageHeader, Button, Input, Select, Alert, Card, Badge } from "@/components/ui";
import { format } from "date-fns";

type Tab = "users" | "trainers" | "lists" | "rules" | "backup" | "defaults" | "notifications" | "audit";

const TABS: { id: Tab; label: string }[] = [
  { id: "users",         label: "1) Users & Roles" },
  { id: "trainers",      label: "2) Trainers & Colors" },
  { id: "lists",         label: "3) Dropdown Lists" },
  { id: "rules",         label: "4) Blocking Rules" },
  { id: "backup",        label: "5) File / Backup" },
  { id: "defaults",      label: "6) Defaults" },
  { id: "notifications", label: "7) Notifications" },
  { id: "audit",         label: "8) Audit Log" },
];

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <div>
      <PageHeader title="⚙️ Settings" subtitle="Admin only" />
      <div className="flex">
        {/* Side tabs */}
        <nav className="w-52 shrink-0 border-r border-slate-200 bg-white min-h-screen py-4">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                tab === t.id ? "bg-brand-orange/10 text-brand-orange border-r-2 border-brand-orange" : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <div className="flex-1 p-8 overflow-y-auto">
          {tab === "users"         && <UsersTab />}
          {tab === "trainers"      && <TrainersTab />}
          {tab === "lists"         && <ListsTab />}
          {tab === "rules"         && <RulesTab />}
          {tab === "backup"        && <BackupTab />}
          {tab === "defaults"      && <DefaultsTab />}
          {tab === "notifications" && <NotificationsTab />}
          {tab === "audit"         && <AuditTab />}
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ email: "", role: "trainer", trainerName: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resetPw, setResetPw] = useState({ userId: "", pw: "" });

  useEffect(() => { loadUsers(); }, []);
  function loadUsers() { fetch("/api/users").then((r) => r.json()).then(({ users }) => setUsers(users ?? [])).catch(() => setError("Failed to load users.")); }
  function set(k: string, v: string) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault(); setError(""); setSuccess("");
    const res = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (data.success) { setSuccess("User added."); loadUsers(); setForm({ email: "", role: "trainer", trainerName: "", password: "" }); }
    else setError(data.error ?? "Failed.");
  }

  async function toggleActive(user: any) {
    await fetch(`/api/users/${user.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !user.active }) });
    loadUsers();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this user?")) return;
    await fetch(`/api/users/${id}`, { method: "DELETE" });
    loadUsers();
  }

  async function handleResetPw() {
    if (!resetPw.pw) return;
    await fetch(`/api/users/${resetPw.userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ newPassword: resetPw.pw }) });
    setResetPw({ userId: "", pw: "" });
    setSuccess("Password reset.");
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold mb-4">Add New User</h2>
        {error && <Alert type="error">{error}</Alert>}
        {success && <Alert type="success">{success}</Alert>}
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} required />
            <Select label="Role" value={form.role} onChange={(e) => set("role", e.target.value)} options={[{ value: "admin", label: "Admin" }, { value: "trainer", label: "Trainer" }, { value: "view_only", label: "View Only" }]} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Trainer Name (if trainer)" value={form.trainerName} onChange={(e) => set("trainerName", e.target.value)} />
            <Input label="Password" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} required />
          </div>
          <Button type="submit">➕ Add User</Button>
        </form>
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Existing Users</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <Card key={u.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-800">{u.email}</p>
                <div className="flex gap-1.5 mt-0.5">
                  <Badge variant={u.role === "admin" ? "orange" : "slate"}>{u.role}</Badge>
                  {u.trainerName && <Badge variant="blue">{u.trainerName}</Badge>}
                  {!u.active && <Badge variant="red">Inactive</Badge>}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {resetPw.userId === u.id ? (
                  <div className="flex gap-2">
                    <Input placeholder="New password" type="password" value={resetPw.pw} onChange={(e) => setResetPw((r) => ({ ...r, pw: e.target.value }))} className="w-32 py-1.5 text-xs" />
                    <Button onClick={handleResetPw} className="text-xs py-1.5">Save</Button>
                    <Button variant="ghost" onClick={() => setResetPw({ userId: "", pw: "" })} className="text-xs py-1.5">Cancel</Button>
                  </div>
                ) : (
                  <Button variant="ghost" onClick={() => setResetPw({ userId: u.id, pw: "" })} className="text-xs">🔑 Reset PW</Button>
                )}
                <Button variant="ghost" onClick={() => toggleActive(u)} className="text-xs">
                  {u.active ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="ghost" onClick={() => handleDelete(u.id)} className="text-xs text-red-500 hover:bg-red-50">Delete</Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Trainers Tab ─────────────────────────────────────────────────────────────
function TrainersTab() {
  const [trainers, setTrainers] = useState<any[]>([]);
  const [success, setSuccess] = useState("");
  useEffect(() => { fetch("/api/trainers").then((r) => r.json()).then(({ trainers }) => setTrainers(trainers ?? [])).catch(() => {}); }, []);

  async function save() {
    await fetch("/api/trainers", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ trainers }) });
    setSuccess("Trainers saved.");
  }

  function update(idx: number, key: string, val: unknown) {
    setTrainers((prev) => prev.map((t, i) => i === idx ? { ...t, [key]: val } : t));
  }

  function addRow() { setTrainers((prev) => [...prev, { name: "", color: "#cccccc", active: true }]); }

  return (
    <div className="max-w-xl space-y-4">
      <h2 className="text-lg font-semibold">Trainers & Colors</h2>
      {success && <Alert type="success">{success}</Alert>}
      <div className="space-y-2">
        {trainers.map((t, i) => (
          <div key={i} className="flex items-center gap-3">
            <input type="color" value={t.color} onChange={(e) => update(i, "color", e.target.value)} className="w-10 h-10 rounded cursor-pointer border border-slate-200" />
            <Input value={t.name} onChange={(e) => update(i, "name", e.target.value)} placeholder="Trainer name" className="flex-1" />
            <label className="flex items-center gap-1.5 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={t.active} onChange={(e) => update(i, "active", e.target.checked)} className="rounded" />
              Active
            </label>
            <button onClick={() => setTrainers((prev) => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        <Button variant="secondary" onClick={addRow}>+ Add Trainer</Button>
        <Button onClick={save}>💾 Save Trainers</Button>
      </div>
    </div>
  );
}

// ─── Lists Tab ────────────────────────────────────────────────────────────────
function ListsTab() {
  const CATEGORIES = ["Locations", "Sources", "Statuses", "Mediums", "Types"];
  const [items, setItems] = useState<any[]>([]);
  const [success, setSuccess] = useState("");
  useEffect(() => { fetch("/api/lists").then((r) => r.json()).then(({ items }) => setItems(items ?? [])).catch(() => {}); }, []);

  async function save() {
    await fetch("/api/lists", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    setSuccess("Lists saved.");
  }

  function addItem(cat: string) { setItems((prev) => [...prev, { category: cat, value: "", active: true, order: prev.length }]); }
  function update(idx: number, key: string, val: unknown) { setItems((prev) => prev.map((item, i) => i === idx ? { ...item, [key]: val } : item)); }
  function remove(idx: number) { setItems((prev) => prev.filter((_, i) => i !== idx)); }

  return (
    <div className="max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Dropdown Lists</h2>
      {success && <Alert type="success">{success}</Alert>}
      {CATEGORIES.map((cat) => {
        const catItems = items.filter((item) => item.category === cat);
        const catIndexes = catItems.map((item) => items.indexOf(item));
        return (
          <div key={cat}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-700">{cat}</h3>
              <button onClick={() => addItem(cat)} className="text-xs text-brand-orange hover:underline">+ Add</button>
            </div>
            <div className="space-y-1.5">
              {catIndexes.map((idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input value={items[idx].value} onChange={(e) => update(idx, "value", e.target.value)} className="flex-1" />
                  <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
                    <input type="checkbox" checked={items[idx].active} onChange={(e) => update(idx, "active", e.target.checked)} className="rounded" />
                    Active
                  </label>
                  <button onClick={() => remove(idx)} className="text-red-400 hover:text-red-600">×</button>
                </div>
              ))}
              {catItems.length === 0 && <p className="text-xs text-slate-400">No items. Add one above.</p>}
            </div>
          </div>
        );
      })}
      <Button onClick={save}>💾 Save Lists</Button>
    </div>
  );
}

// ─── Rules Tab ────────────────────────────────────────────────────────────────
function RulesTab() {
  const [rules, setRules] = useState({ only_admin_can_block: true, blocked_prevents_duplicates: true, blocked_allows_visible_events: true });
  const [success, setSuccess] = useState("");
  useEffect(() => { fetch("/api/settings").then((r) => r.json()).then(({ settings }) => setRules((prev) => ({ ...prev, ...settings.rules }))); }, []);

  async function save() {
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rules }) });
    setSuccess("Rules saved.");
  }

  return (
    <div className="max-w-md space-y-4">
      <h2 className="text-lg font-semibold">Blocking Rules</h2>
      {success && <Alert type="success">{success}</Alert>}
      <Card className="p-5 space-y-3">
        {([
          ["only_admin_can_block", "Only admins can mark / unmark dates"],
          ["blocked_prevents_duplicates", "Duplication skips blocked dates"],
          ["blocked_allows_visible_events", "Blocked dates still show other trainers' events"],
        ] as [keyof typeof rules, string][]).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={rules[key]}
              onChange={(e) => setRules((r) => ({ ...r, [key]: e.target.checked }))}
              className="rounded border-slate-300 text-brand-orange"
            />
            <span className="text-sm text-slate-700">{label}</span>
          </label>
        ))}
      </Card>
      <Button onClick={save}>💾 Save Rules</Button>
    </div>
  );
}

// ─── Backup Tab ───────────────────────────────────────────────────────────────
function BackupTab() {
  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"append" | "replace">("append");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; sheet: string } | null>(null);
  const [error, setError] = useState("");

  async function handleImport() {
    if (!file) return;
    setError("");
    setResult(null);
    setImporting(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("mode", mode);
      const res = await fetch("/api/events/import", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Import failed.");
      else setResult({ created: data.created, skipped: data.skipped, sheet: data.sheet });
    } catch {
      setError("Upload failed. Check your connection and try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-6">
      <h2 className="text-lg font-semibold">File / Backup</h2>

      {/* Export */}
      <Card className="p-5 space-y-2">
        <h3 className="text-sm font-semibold text-slate-700">Export Data</h3>
        <p className="text-xs text-slate-500">Download all events as an Excel file.</p>
        <a href="/api/events/export" className="inline-block mt-1">
          <Button variant="secondary">⬇️ Download All Events (Excel)</Button>
        </a>
      </Card>

      {/* Import */}
      <Card className="p-5 space-y-4">
        <h3 className="text-sm font-semibold text-slate-700">Import Events from Excel</h3>
        <p className="text-xs text-slate-500">
          Upload your <code className="bg-slate-100 px-1 rounded">.xlsx</code> file. Events are read from the
          &ldquo;Events&rdquo; sheet (or the first sheet if none named Events). Required column: <strong>Date</strong>.
        </p>

        {error && <Alert type="error">{error}</Alert>}
        {result && (
          <Alert type="success">
            Imported from sheet &ldquo;{result.sheet}&rdquo;: <strong>{result.created}</strong> events created
            {result.skipped > 0 && `, ${result.skipped} rows skipped`}.
          </Alert>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Excel File (.xlsx / .xls)</label>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(""); }}
            className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-600 mb-2">Import Mode</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="importMode" value="append" checked={mode === "append"} onChange={() => setMode("append")} className="text-brand-orange" />
              Append — add to existing events
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input type="radio" name="importMode" value="replace" checked={mode === "replace"} onChange={() => setMode("replace")} className="text-brand-orange" />
              Replace — delete all, then import
            </label>
          </div>
          {mode === "replace" && (
            <p className="text-xs text-red-500 mt-1">⚠️ This will permanently delete all existing events before importing.</p>
          )}
        </div>

        <Button onClick={handleImport} loading={importing} disabled={!file}>
          ⬆️ Import Events
        </Button>
      </Card>
    </div>
  );
}

// ─── Defaults Tab ─────────────────────────────────────────────────────────────
function DefaultsTab() {
  const [lists, setLists] = useState<Record<string, string[]>>({});
  const [defaults, setDefaults] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(({ settings }) => {
      setLists(settings.lists);
      setDefaults(settings.defaults);
    });
  }, []);

  async function save() {
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ defaults }) });
    setSuccess("Defaults saved.");
  }

  function opts(arr: string[]) { return arr.map((v) => ({ value: v, label: v })); }

  return (
    <div className="max-w-sm space-y-4">
      <h2 className="text-lg font-semibold">Defaults</h2>
      {success && <Alert type="success">{success}</Alert>}
      <Card className="p-5 space-y-3">
        {[
          ["default_status", "Default Status", "Statuses"],
          ["default_medium", "Default Medium", "Mediums"],
          ["default_source", "Default Source", "Sources"],
          ["default_location", "Default Location", "Locations"],
          ["default_type", "Default Type", "Types"],
        ].map(([key, label, listKey]) => (
          <Select
            key={key}
            label={label}
            value={defaults[key] ?? ""}
            onChange={(e) => setDefaults((d) => ({ ...d, [key]: e.target.value }))}
            options={opts(lists[listKey] ?? [])}
          />
        ))}
      </Card>
      <Button onClick={save}>💾 Save Defaults</Button>
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────
function NotificationsTab() {
  const [notif, setNotif] = useState({ notify_on_new_event: false, notify_on_edit: false, notify_on_block: false, notification_emails: "" });
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then(({ settings }) => {
      const n = (settings as any).notifications ?? {};
      setNotif({
        notify_on_new_event: n.notify_on_new_event === "true",
        notify_on_edit: n.notify_on_edit === "true",
        notify_on_block: n.notify_on_block === "true",
        notification_emails: n.notification_emails ?? "",
      });
    });
  }, []);

  async function save() {
    await fetch("/api/settings", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ notifications: notif }) });
    setSuccess("Saved.");
  }

  return (
    <div className="max-w-sm space-y-4">
      <h2 className="text-lg font-semibold">Notifications</h2>
      {success && <Alert type="success">{success}</Alert>}
      <Card className="p-5 space-y-3">
        {([ ["notify_on_new_event", "Notify on new event"], ["notify_on_edit", "Notify on edit"], ["notify_on_block", "Notify on block date"] ] as [keyof typeof notif, string][]).map(([key, label]) => (
          <label key={key} className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={!!notif[key]} onChange={(e) => setNotif((n) => ({ ...n, [key]: e.target.checked }))} className="rounded" />
            <span className="text-sm text-slate-700">{label}</span>
          </label>
        ))}
        <Input
          label="Notification Emails (comma-separated)"
          value={notif.notification_emails}
          onChange={(e) => setNotif((n) => ({ ...n, notification_emails: e.target.value }))}
          placeholder="a@example.com, b@example.com"
        />
      </Card>
      <Button onClick={save}>💾 Save</Button>
    </div>
  );
}

// ─── Audit Tab ────────────────────────────────────────────────────────────────
function AuditTab() {
  const [logs, setLogs] = useState<any[]>([]);
  useEffect(() => { fetch("/api/audit").then((r) => r.json()).then(({ logs }) => setLogs(logs ?? [])).catch(() => {}); }, []);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Audit Log</h2>
      <Card className="overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {["Timestamp", "User", "Action", "Details"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-xs font-mono text-slate-500 whitespace-nowrap">{format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss")}</td>
                <td className="px-4 py-2.5 text-xs text-slate-700">{log.user}</td>
                <td className="px-4 py-2.5 text-xs font-medium text-slate-800">{log.action}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
