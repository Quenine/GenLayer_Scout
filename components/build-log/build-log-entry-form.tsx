"use client";

import { X } from "lucide-react";
import { useState } from "react";
import {
  BUILD_LOG_ENTRY_TYPES,
  type BuildLogEntry,
  type BuildLogEntryType
} from "@/lib/types";
import { makeId } from "@/lib/utils";

function currentLocalDate() {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 10);
}

export function BuildLogEntryForm({
  onSave,
  onCancel
}: {
  onSave: (entry: BuildLogEntry) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    date: currentLocalDate(),
    type: "progress" as BuildLogEntryType,
    title: "",
    details: ""
  });

  function submitEntry(event: React.FormEvent) {
    event.preventDefault();
    onSave({
      id: makeId("build-log"),
      ...form,
      title: form.title.trim(),
      details: form.details.trim()
    });
  }

  return (
    <section className="card mb-6">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Add build log entry</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Record an observed result, problem, or decision while the context is fresh.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close build log form"
        >
          <X size={18} />
        </button>
      </div>
      <form onSubmit={submitEntry} className="p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="label">Date</span>
            <input
              type="date"
              className="field"
              required
              value={form.date}
              onChange={(event) => setForm({ ...form, date: event.target.value })}
            />
          </label>
          <label>
            <span className="label">Entry type</span>
            <select
              className="field capitalize"
              value={form.type}
              onChange={(event) =>
                setForm({ ...form, type: event.target.value as BuildLogEntryType })
              }
            >
              {BUILD_LOG_ENTRY_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label className="md:col-span-2">
            <span className="label">Title *</span>
            <input
              className="field"
              required
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Specific result or issue"
            />
          </label>
          <label className="md:col-span-2">
            <span className="label">Details *</span>
            <textarea
              className="field min-h-32 resize-y"
              required
              value={form.details}
              onChange={(event) => setForm({ ...form, details: event.target.value })}
              placeholder="Context, observed behavior, evidence location, and next action."
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary">Save entry</button>
        </div>
      </form>
    </section>
  );
}
