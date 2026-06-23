"use client";

import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  FileWarning,
  FlaskConical,
  Plus,
  Target
} from "lucide-react";
import { DataBackupPanel } from "@/components/data-backup-panel";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { useScout } from "@/components/scout-provider";
import { CopyableValue } from "@/components/shared/copyable-value";
import { StatusBadge } from "@/components/status-badge";
import { StorageWarning } from "@/components/storage-warning";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { calculateDashboardSummary } from "@/lib/dashboard";
import { formatDate, formatPoints } from "@/lib/utils";

export default function DashboardPage() {
  const {
    experiments,
    contributionLanes,
    buildLogEntries,
    storageWarning,
    resetWorkspace
  } = useScout();
  const summary = calculateDashboardSummary(experiments, contributionLanes);
  const activeLanes = contributionLanes
    .filter((lane) => lane.status !== "watching")
    .slice(0, 4);
  const summaryCards = [
    {
      label: "Experiments tracked",
      value: summary.experimentsTracked,
      detail: "Manual Studio experiment records",
      icon: FlaskConical,
      iconClassName: "bg-moss-50 text-moss-700"
    },
    {
      label: "Finalized transactions",
      value: summary.finalizedTransactions,
      detail: "Marked finalized by the builder",
      icon: CheckCircle2,
      iconClassName: "bg-emerald-50 text-emerald-700"
    },
    {
      label: "Missing evidence links",
      value: summary.experimentsMissingEvidence,
      detail: "Non-failed experiments without a URL",
      icon: FileWarning,
      iconClassName: "bg-amber-50 text-amber-700"
    },
    {
      label: "Broad point-range lanes",
      value: summary.highOpportunityLanes,
      detail: "Reference maximum of 1,500 points or more",
      icon: Target,
      iconClassName: "bg-violet-50 text-violet-700"
    }
  ];

  return (
    <>
      <PageHeader
        eyebrow="Local workspace overview"
        title="GenLayer builder record"
        description="A manual workspace for Studio contract experiments, evidence links, contribution planning, and Portal submission drafts. No network data is fetched or verified."
        action={
          <Link href="/runs" className="btn-primary">
            <Plus size={16} /> Record experiment
          </Link>
        }
      />

      {storageWarning && <StorageWarning message={storageWarning} />}

      <section className="card mb-6 border-moss-200 bg-moss-50/60 p-5">
        <h2 className="text-sm font-semibold text-ink">First-use notes</h2>
        <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-3">
          <p>
            <span className="font-semibold text-ink">Local-first:</span> records stay in this browser until you export, import, or reset them.
          </p>
          <p>
            <span className="font-semibold text-ink">Manual tracking:</span> copy contract files, addresses, hashes, states, and evidence from Studio runs.
          </p>
          <p>
            <span className="font-semibold text-ink">Portal prep:</span> use Scout to keep contribution notes and generate cleaner submission Markdown.
          </p>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => <SummaryCard key={card.label} {...card} />)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold">Recent contract experiments</h2>
              <p className="mt-0.5 text-xs text-slate-500">Latest manually entered Studio records</p>
            </div>
            <Link href="/runs" className="flex items-center gap-1.5 text-xs font-semibold text-moss-700 hover:text-moss-900">
              Open ledger <ArrowRight size={14} />
            </Link>
          </div>
          {experiments.length ? (
            <div className="divide-y divide-line">
              {experiments.slice(0, 5).map((experiment) => (
                <div key={experiment.id} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold">{experiment.contractName}</p>
                      <StatusBadge status={experiment.status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-slate-500">
                      <span className="break-all">{experiment.studioFileName}</span>
                      <span>{formatDate(experiment.createdAt)}</span>
                    </div>
                  </div>
                  <div className="min-w-0 text-left sm:max-w-56 sm:text-right">
                    <CopyableValue label="transaction hash" value={experiment.transactionHash} />
                    <p className={`mt-1 text-[11px] font-medium ${experiment.evidenceUrl ? "text-emerald-700" : "text-amber-700"}`}>
                      {experiment.evidenceUrl ? "Evidence link attached" : "Evidence link not attached"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={FlaskConical}
              title="No contract experiments recorded"
              description="Start with a Studio contract file and add deployment details only when you have observed them."
              action={<Link href="/runs" className="btn-secondary">Open experiment ledger</Link>}
            />
          )}
        </section>

        <section className="card overflow-hidden">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-semibold">Active contribution lanes</h2>
            <p className="mt-0.5 text-xs text-slate-500">Categories marked exploring, building, or submitted</p>
          </div>
          {activeLanes.length ? (
            <div className="divide-y divide-line">
              {activeLanes.map((lane) => (
                <div key={lane.id} className="flex items-start justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="text-sm font-semibold">{lane.name}</p>
                    <p className="mt-1 font-mono text-[11px] text-slate-500">
                      {formatPoints(lane.minimumPoints)}-{formatPoints(lane.maximumPoints)} pts reference
                    </p>
                  </div>
                  <span className="rounded-full bg-moss-50 px-2.5 py-1 text-[10px] font-semibold capitalize text-moss-700">{lane.status}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Target}
              title="No active lanes marked"
              description="Use planning states to record which Portal contribution categories you are considering."
            />
          )}
          <Link href="/opportunities" className="flex items-center justify-center gap-2 border-t border-line px-5 py-3.5 text-xs font-semibold text-moss-700 hover:bg-moss-50">
            Review contribution lanes <ArrowRight size={14} />
          </Link>
        </section>
      </div>

      <section className="card mt-6 overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold">Latest build notes</h2>
            <p className="mt-0.5 text-xs text-slate-500">Dated progress, findings, bugs, and lessons</p>
          </div>
          <Link href="/build-log" className="text-xs font-semibold text-moss-700 hover:text-moss-900">Open build log</Link>
        </div>
        {buildLogEntries.length ? (
          <div className="divide-y divide-line">
            {buildLogEntries.slice(0, 3).map((entry) => (
              <div key={entry.id} className="flex gap-4 px-5 py-4">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-moss-500" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{entry.title}</p>
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-slate-500">{entry.type}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">{entry.details}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={FileWarning}
            title="No build notes yet"
            description="Record specific findings and bugs as you test; they are easier to turn into evidence later."
          />
        )}
      </section>

      <DataBackupPanel />

      <div className="mt-6 flex flex-col gap-3 rounded-lg border border-line bg-white p-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <p>All workspace data is manually entered and stored only in this browser.</p>
        <button
          type="button"
          className="text-left text-xs font-semibold text-rose-700 hover:underline sm:text-right"
          onClick={() => {
            if (window.confirm("Clear all experiments, build notes, planning states, and the evidence draft?")) {
              resetWorkspace();
            }
          }}
        >
          Reset local workspace
        </button>
      </div>
    </>
  );
}
