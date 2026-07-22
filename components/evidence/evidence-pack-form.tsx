"use client";

import { CheckCircle2, Info } from "lucide-react";
import type {
  ContractExperiment,
  ContributionLane,
  EvidencePack
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function EvidencePackForm({
  evidencePack,
  experiments,
  contributionLanes,
  onChange
}: {
  evidencePack: EvidencePack;
  experiments: ContractExperiment[];
  contributionLanes: ContributionLane[];
  onChange: (evidencePack: EvidencePack) => void;
}) {
  const selectedExperiment = experiments.find(
    (item) => item.id === evidencePack.experimentId
  );

  function update<K extends keyof EvidencePack>(key: K, value: EvidencePack[K]) {
    onChange({ ...evidencePack, [key]: value });
  }

  function selectExperiment(experimentId: string) {
    const experiment = experiments.find((item) => item.id === experimentId);
    onChange({
      ...evidencePack,
      experimentId,
      title: evidencePack.title || experiment?.contractName || "",
      portalSubmissionNotes:
        evidencePack.portalSubmissionNotes || experiment?.portalSubmissionNotes || ""
    });
  }

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold">Evidence pack fields</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          The current draft is saved in this browser. Selecting an experiment pulls its deployment evidence into the Markdown preview.
        </p>
      </div>
      <div className="space-y-5 p-5">
        <label>
          <span className="label">Title</span>
          <input
            className="field"
            value={evidencePack.title}
            onChange={(event) => update("title", event.target.value)}
            placeholder="Specific contribution or milestone title"
          />
        </label>
        <label>
          <span className="label">Contribution category</span>
          <select
            className="field"
            value={evidencePack.contributionCategoryId}
            onChange={(event) =>
              update("contributionCategoryId", event.target.value)
            }
          >
            <option value="">Select a category</option>
            {contributionLanes.map((lane) => (
              <option key={lane.id} value={lane.id}>{lane.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span className="label">Generate from contract experiment</span>
          <select
            className="field"
            value={evidencePack.experimentId}
            onChange={(event) => selectExperiment(event.target.value)}
          >
            <option value="">No contract experiment selected</option>
            {experiments.map((experiment) => (
              <option key={experiment.id} value={experiment.id}>
                {experiment.contractName} - {experiment.status}
              </option>
            ))}
          </select>
          {!experiments.length && (
            <span className="mt-1.5 block text-[11px] text-amber-700">
              Record a contract experiment first if this submission includes deployment evidence.
            </span>
          )}
        </label>

        {selectedExperiment ? (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
            <div className="flex gap-3">
              <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-700" />
              <div>
                <p className="font-semibold">Experiment details included in Markdown</p>
                <p className="mt-1 text-xs leading-5">
                  Scout will include the contract name, Studio file, address, hash, observed state, recorded date, and evidence URL from this local experiment record.
                </p>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div><dt className="font-semibold">Contract</dt><dd>{selectedExperiment.contractName}</dd></div>
                  <div><dt className="font-semibold">File</dt><dd className="break-all font-mono">{selectedExperiment.studioFileName}</dd></div>
                  <div><dt className="font-semibold">State</dt><dd>{selectedExperiment.status}</dd></div>
                  <div><dt className="font-semibold">Recorded</dt><dd>{formatDate(selectedExperiment.createdAt)}</dd></div>
                  <div className="sm:col-span-2"><dt className="font-semibold">Evidence URL</dt><dd className="break-all">{selectedExperiment.evidenceUrl || "Not recorded"}</dd></div>
                </dl>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <Info size={17} className="mt-0.5 shrink-0 text-amber-700" />
            <p>No experiment selected. This evidence pack will not include Studio deployment details.</p>
          </div>
        )}

        <label>
          <span className="label">Project summary</span>
          <textarea
            className="field min-h-24 resize-y"
            value={evidencePack.projectSummary}
            onChange={(event) => update("projectSummary", event.target.value)}
            placeholder="What was built, tested, researched, or documented?"
          />
        </label>
        <label>
          <span className="label">GenLayer relevance</span>
          <textarea
            className="field min-h-24 resize-y"
            value={evidencePack.genLayerRelevance}
            onChange={(event) => update("genLayerRelevance", event.target.value)}
            placeholder="Which GenLayer builder problem, workflow, or knowledge gap does this address?"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="label">If no contract address, explain why</span>
            <textarea
              className="field min-h-20 resize-y"
              value={evidencePack.contractAddressNotApplicableReason}
              onChange={(event) =>
                update("contractAddressNotApplicableReason", event.target.value)
              }
              placeholder="Example: research-only submission; no deployment evidence claimed."
            />
          </label>
          <label>
            <span className="label">If no transaction hash, explain why</span>
            <textarea
              className="field min-h-20 resize-y"
              value={evidencePack.transactionHashNotApplicableReason}
              onChange={(event) =>
                update("transactionHashNotApplicableReason", event.target.value)
              }
              placeholder="Example: documentation-only contribution; no transaction produced."
            />
          </label>
        </div>
        <label>
          <span className="label">Screenshots and evidence links</span>
          <textarea
            className="field min-h-20 resize-y font-mono text-xs"
            value={evidencePack.additionalEvidenceLinks}
            onChange={(event) =>
              update("additionalEvidenceLinks", event.target.value)
            }
            placeholder={"https://...\nhttps://..."}
          />
          <span className="mt-1.5 block text-[11px] text-slate-500">
            One URL per line. The selected experiment evidence URL is added automatically.
          </span>
        </label>
        <label>
          <span className="label">What was tested</span>
          <textarea
            className="field min-h-24 resize-y"
            value={evidencePack.whatWasTested}
            onChange={(event) => update("whatWasTested", event.target.value)}
            placeholder="Inputs, test cases, observed outputs, and transaction states."
          />
        </label>
        <label>
          <span className="label">Known limitations</span>
          <textarea
            className="field min-h-24 resize-y"
            value={evidencePack.knownLimitations}
            onChange={(event) => update("knownLimitations", event.target.value)}
            placeholder="Incomplete work, narrow coverage, or claims that remain unverified."
          />
        </label>
        <label>
          <span className="label">Next milestone</span>
          <textarea
            className="field min-h-20 resize-y"
            value={evidencePack.nextMilestone}
            onChange={(event) => update("nextMilestone", event.target.value)}
            placeholder="The next concrete result, not a broad aspiration."
          />
        </label>
        <label>
          <span className="label">Portal submission notes</span>
          <textarea
            className="field min-h-24 resize-y"
            value={evidencePack.portalSubmissionNotes}
            onChange={(event) => update("portalSubmissionNotes", event.target.value)}
            placeholder="Reviewer context, reproduction steps, dependencies, or scope boundaries."
          />
        </label>
      </div>
    </section>
  );
}
