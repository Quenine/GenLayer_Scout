"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  Bug,
  CalendarDays,
  Lightbulb,
  Plus,
  Trash2,
  TrendingUp
} from "lucide-react";
import { BuildLogEntryForm } from "@/components/build-log/build-log-entry-form";
import { PageHeader } from "@/components/page-header";
import { useScout } from "@/components/scout-provider";
import {
  BUILD_LOG_ENTRY_TYPES,
  type BuildLogEntryType
} from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const ENTRY_TYPE_STYLE = {
  progress: { icon: TrendingUp, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  finding: { icon: Lightbulb, color: "bg-amber-50 text-amber-700 border-amber-200" },
  bug: { icon: Bug, color: "bg-rose-50 text-rose-700 border-rose-200" },
  lesson: { icon: BookOpen, color: "bg-blue-50 text-blue-700 border-blue-200" }
} satisfies Record<BuildLogEntryType, { icon: typeof TrendingUp; color: string }>;

const SUGGESTED_FIRST_ENTRIES = [
  "First Studio deployment completed",
  "Learned Studio is a code/deployment environment, not a prompt box",
  "Created Scout v0.1.1 local-first evidence workflow",
  "Planned v0.2 Intelligent Contract verifier"
];

export default function BuildLogPage() {
  const { buildLogEntries, addBuildLogEntry, deleteBuildLogEntry } = useScout();
  const [showForm, setShowForm] = useState(false);
  const [typeFilter, setTypeFilter] = useState<BuildLogEntryType | "all">("all");

  const entries = useMemo(
    () => [...buildLogEntries]
      .filter((entry) => typeFilter === "all" || entry.type === typeFilter)
      .sort((a, b) => b.date.localeCompare(a.date)),
    [buildLogEntries, typeFilter]
  );

  return (
    <>
      <PageHeader
        eyebrow="Manual project record"
        title="Build log"
        description="Keep dated notes about Studio experiments, findings, bugs, and implementation decisions. These entries are local working notes, not Portal submissions."
        action={
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Add entry
          </button>
        }
      />

      {showForm && (
        <BuildLogEntryForm
          onSave={(entry) => {
            addBuildLogEntry(entry);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="h-fit space-y-2 lg:sticky lg:top-24" aria-label="Build log filters">
          <button
            onClick={() => setTypeFilter("all")}
            className={cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition",
              typeFilter === "all" ? "bg-ink text-white" : "text-slate-600 hover:bg-white"
            )}
          >
            All entries <span className="font-mono text-xs opacity-60">{buildLogEntries.length}</span>
          </button>
          {BUILD_LOG_ENTRY_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium capitalize transition",
                typeFilter === type ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:bg-white"
              )}
            >
              {type}
              <span className="font-mono text-xs opacity-60">
                {buildLogEntries.filter((entry) => entry.type === type).length}
              </span>
            </button>
          ))}
        </aside>

        <section className="space-y-4">
          {entries.map((entry) => {
            const config = ENTRY_TYPE_STYLE[entry.type];
            const Icon = config.icon;
            return (
              <article key={entry.id} className="card group p-5">
                <div className="flex gap-4">
                  <div className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg border", config.color)}>
                    <Icon size={16} aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-sm font-semibold">{entry.title}</h2>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-slate-500">{entry.type}</span>
                        </div>
                        <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <CalendarDays size={12} aria-hidden="true" />
                          {formatDate(`${entry.date}T12:00:00`)}
                        </p>
                      </div>
                      <button
                        onClick={() => { if (window.confirm("Delete this build log entry?")) deleteBuildLogEntry(entry.id); }}
                        className="rounded-md p-2 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-700 focus:opacity-100 group-hover:opacity-100"
                        aria-label={`Delete ${entry.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-slate-600">{entry.details}</p>
                  </div>
                </div>
              </article>
            );
          })}

          {!entries.length && (
            <div className="card px-5 py-14 text-center">
              <AlertTriangle className="mx-auto text-slate-300" size={28} />
              <p className="mt-3 text-sm font-semibold">
                {buildLogEntries.length ? "No entries in this filter" : "No build log entries yet"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {buildLogEntries.length ? "Choose another entry type." : "Add the first dated note from your current build session."}
              </p>
              {!buildLogEntries.length && (
                <div className="mx-auto mt-5 max-w-xl text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                    Suggested first entries
                  </p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {SUGGESTED_FIRST_ENTRIES.map((suggestion) => (
                      <li key={suggestion} className="rounded-lg border border-line bg-white px-3 py-2 text-xs text-slate-600">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 text-xs leading-5 text-slate-500">
                    These are prompts only. Add them manually if they match your actual work.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
