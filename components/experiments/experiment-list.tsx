"use client";

import { ExternalLink, FileImage, FlaskConical, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { StatusBadge } from "@/components/status-badge";
import type { ContractExperiment } from "@/lib/types";
import { formatDate, shorten } from "@/lib/utils";

export function ExperimentList({
  experiments,
  hasFilters,
  onDelete,
  onCreate
}: {
  experiments: ContractExperiment[];
  hasFilters: boolean;
  onDelete: (id: string) => void;
  onCreate: () => void;
}) {
  if (experiments.length === 0) {
    return (
      <EmptyState
        icon={FlaskConical}
        title={hasFilters ? "No experiments match these filters" : "No contract experiments recorded"}
        description={
          hasFilters
            ? "Clear the search or choose another observed state."
            : "Record the Studio contract file, deployment address, transaction hash, observed state, and evidence from your first test."
        }
        action={
          !hasFilters ? (
            <button className="btn-secondary" onClick={onCreate}>
              Record first experiment
            </button>
          ) : undefined
        }
      />
    );
  }

  return (
    <>
      <div className="hidden overflow-x-auto lg:block">
        <table className="w-full min-w-[1040px] text-left">
          <thead>
            <tr className="border-b border-line bg-slate-50/70 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500">
              <th className="px-5 py-3">Experiment</th>
              <th className="px-4 py-3">State</th>
              <th className="px-4 py-3">Contract address</th>
              <th className="px-4 py-3">Transaction hash</th>
              <th className="px-4 py-3">Evidence</th>
              <th className="px-4 py-3">Recorded</th>
              <th className="w-12 px-4 py-3"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {experiments.map((experiment) => (
              <tr key={experiment.id} className="group hover:bg-slate-50/60">
                <td className="max-w-xs px-5 py-4">
                  <p className="text-sm font-semibold">{experiment.contractName}</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-500">
                    {experiment.studioFileName}
                  </p>
                  {experiment.experimentNotes && (
                    <p className="mt-1.5 truncate text-xs text-slate-500">
                      {experiment.experimentNotes}
                    </p>
                  )}
                </td>
                <td className="px-4 py-4"><StatusBadge status={experiment.status} /></td>
                <td className="px-4 py-4 font-mono text-xs text-slate-600">
                  {shorten(experiment.deployedContractAddress)}
                </td>
                <td className="px-4 py-4 font-mono text-xs text-slate-600">
                  {shorten(experiment.transactionHash)}
                </td>
                <td className="px-4 py-4">
                  {experiment.evidenceUrl ? (
                    <a
                      href={experiment.evidenceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-moss-700 hover:underline"
                    >
                      <FileImage size={14} /> Open <ExternalLink size={11} />
                    </a>
                  ) : (
                    <span className="text-xs text-amber-700">Not attached</span>
                  )}
                </td>
                <td className="px-4 py-4 text-xs text-slate-500">
                  {formatDate(experiment.createdAt)}
                </td>
                <td className="px-4 py-4">
                  <button
                    onClick={() => onDelete(experiment.id)}
                    className="rounded-md p-2 text-slate-400 opacity-0 transition hover:bg-rose-50 hover:text-rose-700 focus:opacity-100 group-hover:opacity-100"
                    aria-label={`Delete ${experiment.contractName}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-line lg:hidden">
        {experiments.map((experiment) => (
          <article key={experiment.id} className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{experiment.contractName}</p>
                <p className="mt-1 truncate font-mono text-[11px] text-slate-500">
                  {experiment.studioFileName}
                </p>
              </div>
              <StatusBadge status={experiment.status} />
            </div>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-slate-400">Contract address</dt>
                <dd className="mt-1 break-all font-mono text-slate-600">{shorten(experiment.deployedContractAddress)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-slate-400">Transaction hash</dt>
                <dd className="mt-1 break-all font-mono text-slate-600">{shorten(experiment.transactionHash)}</dd>
              </div>
            </dl>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs text-slate-500">{formatDate(experiment.createdAt)}</span>
              <button
                onClick={() => onDelete(experiment.id)}
                className="rounded-md p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-700"
                aria-label={`Delete ${experiment.contractName}`}
              >
                <Trash2 size={15} />
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
