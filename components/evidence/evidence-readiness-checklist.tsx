"use client";

import { AlertTriangle, CheckCircle2, Circle, Info } from "lucide-react";
import type { ContractExperiment, ContributionLane, EvidencePack } from "@/lib/types";
import {
  evaluateEvidenceReadiness,
  evidenceQualityWarningMessage,
  findEvidenceQualityWarnings
} from "@/lib/evidence-quality";
import { cn } from "@/lib/utils";

const STATUS_LABEL = {
  Ready: "Complete",
  "Needs evidence": "Evidence missing",
  Incomplete: "Details missing"
} as const;

const STATUS_STYLE = {
  Ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Needs evidence": "border-amber-200 bg-amber-50 text-amber-800",
  Incomplete: "border-rose-200 bg-rose-50 text-rose-800"
};

export function EvidenceReadinessChecklist({
  evidencePack,
  experiment,
  contributionLane
}: {
  evidencePack: EvidencePack;
  experiment?: ContractExperiment;
  contributionLane?: ContributionLane;
}) {
  const readiness = evaluateEvidenceReadiness({
    evidencePack,
    experiment,
    contributionLane
  });
  const warnings = findEvidenceQualityWarnings(evidencePack);

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">Evidence completeness</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Checks whether the report contains the core context and supporting evidence needed to stand on its own.
          </p>
        </div>
        <span className={cn("rounded-full border px-3 py-1 text-xs font-semibold", STATUS_STYLE[readiness.status])}>
          {STATUS_LABEL[readiness.status]}
        </span>
      </div>

      <div className="divide-y divide-line">
        {readiness.items.map((item) => (
          <div key={item.label} className="flex gap-3 px-5 py-3">
            {item.complete ? (
              <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={16} />
            ) : (
              <Circle className="mt-0.5 shrink-0 text-slate-300" size={16} />
            )}
            <div>
              <p className="text-sm font-medium text-ink">{item.label}</p>
              {!item.complete && (
                <p className="mt-0.5 text-xs leading-5 text-slate-500">{item.detail}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {warnings.length > 0 && (
        <div className="border-t border-amber-200 bg-amber-50 px-5 py-4">
          <div className="flex gap-3">
            <AlertTriangle className="mt-0.5 shrink-0 text-amber-700" size={17} />
            <div>
              <p className="text-sm font-semibold text-amber-900">Content checks</p>
              <p className="mt-1 text-xs leading-5 text-amber-900">
                Some entries are too brief or generic to be useful in an exported report.
              </p>
              <ul className="mt-2 space-y-1 text-xs text-amber-900">
                {warnings.map((warning) => (
                  <li key={`${warning.field}-${warning.term}`}>
                    {evidenceQualityWarningMessage(warning)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-3 border-t border-line bg-slate-50 px-5 py-3 text-xs leading-5 text-slate-600">
        <Info size={15} className="mt-0.5 shrink-0" />
        <p>
          Complete means the required report fields are present. It does not alter or strengthen the underlying verification result.
        </p>
      </div>
    </section>
  );
}
