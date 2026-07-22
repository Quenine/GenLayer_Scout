"use client";

import { Info } from "lucide-react";
import { EvidencePackForm } from "@/components/evidence/evidence-pack-form";
import { EvidencePackPreview } from "@/components/evidence/evidence-pack-preview";
import { EvidenceReadinessChecklist } from "@/components/evidence/evidence-readiness-checklist";
import { PageHeader } from "@/components/page-header";
import { useScout } from "@/components/scout-provider";
import { buildEvidencePackMarkdown } from "@/lib/evidence-report";

export default function EvidencePage() {
  const {
    experiments,
    contributionLanes,
    evidencePack,
    updateEvidencePack
  } = useScout();
  const selectedExperiment = experiments.find(
    (experiment) => experiment.id === evidencePack.experimentId
  );
  const selectedContributionLane = contributionLanes.find(
    (lane) => lane.id === evidencePack.contributionCategoryId
  );
  const markdown = buildEvidencePackMarkdown({
    evidencePack,
    experiment: selectedExperiment,
    contributionLane: selectedContributionLane
  });
  const fileName = (evidencePack.title || "genlayer-evidence-pack")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  return (
    <>
      <PageHeader
        eyebrow="Portal submission preparation"
        title="Evidence pack"
        description="Assemble manually tracked experiment details and contribution notes into a plain Markdown report. Verify every field against the original Studio evidence before submitting it anywhere."
      />

      <div className="mb-5 flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
        <Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="leading-6">
          Scout only formats local records. It does not read from Studio, check a transaction,
          or submit to the GenLayer Portal.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-6">
          <EvidenceReadinessChecklist
            evidencePack={evidencePack}
            experiment={selectedExperiment}
            contributionLane={selectedContributionLane}
          />
          <EvidencePackForm
            evidencePack={evidencePack}
            experiments={experiments}
            contributionLanes={contributionLanes}
            onChange={updateEvidencePack}
          />
        </div>
        <EvidencePackPreview markdown={markdown} fileName={fileName} />
      </div>
    </>
  );
}
