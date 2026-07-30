import type { ContractExperiment, ContributionLane, EvidencePack } from "@/lib/types";

const WEAK_PLACEHOLDER_TERMS = [
  "test",
  "testing",
  "none",
  "win",
  "winner",
  "lorem",
  "placeholder",
  "demo only"
] as const;

export type ReadinessStatus = "Ready" | "Needs evidence" | "Incomplete";

export interface ReadinessItem {
  label: string;
  complete: boolean;
  kind: "narrative" | "evidence";
  detail: string;
}

export interface QualityWarning {
  field: string;
  term: string;
}

function hasText(value: string) {
  return Boolean(value.trim());
}

function hasEvidenceLinks(evidencePack: EvidencePack, experiment?: ContractExperiment) {
  return Boolean(
    experiment?.evidenceUrl.trim() || evidencePack.additionalEvidenceLinks.trim()
  );
}

export function evaluateEvidenceReadiness({
  evidencePack,
  experiment,
  contributionLane
}: {
  evidencePack: EvidencePack;
  experiment?: ContractExperiment;
  contributionLane?: ContributionLane;
}) {
  const hasContractAddress = Boolean(experiment?.deployedContractAddress.trim());
  const hasTransactionHash = Boolean(experiment?.transactionHash.trim());
  const addressCovered = hasContractAddress || hasText(evidencePack.contractAddressNotApplicableReason);
  const transactionCovered = hasTransactionHash || hasText(evidencePack.transactionHashNotApplicableReason);

  const items: ReadinessItem[] = [
    {
      label: "Title",
      complete: hasText(evidencePack.title),
      kind: "narrative",
      detail: "Use a specific contribution title."
    },
    {
      label: "Contribution category",
      complete: Boolean(contributionLane),
      kind: "narrative",
      detail: "Choose the relevant contribution category."
    },
    {
      label: "Project summary",
      complete: hasText(evidencePack.projectSummary),
      kind: "narrative",
      detail: "Describe the actual work completed."
    },
    {
      label: "GenLayer relevance",
      complete: hasText(evidencePack.genLayerRelevance),
      kind: "narrative",
      detail: "Explain why the work matters for GenLayer builders."
    },
    {
      label: "Experiment record",
      complete: Boolean(experiment),
      kind: "evidence",
      detail: "Select the experiment this report describes."
    },
    {
      label: "Contract address",
      complete: addressCovered,
      kind: "evidence",
      detail: "Provide the recorded address, or a reason when an address genuinely does not apply."
    },
    {
      label: "Transaction hash",
      complete: transactionCovered,
      kind: "evidence",
      detail: "Provide the recorded hash, or a reason when a transaction genuinely does not apply."
    },
    {
      label: "Evidence links",
      complete: hasEvidenceLinks(evidencePack, experiment),
      kind: "evidence",
      detail: "Attach screenshots, repository links, transaction output, or other evidence."
    },
    {
      label: "What was tested",
      complete: hasText(evidencePack.whatWasTested),
      kind: "narrative",
      detail: "List inputs, cases, observed outputs, and relevant states."
    },
    {
      label: "Known limitations",
      complete: hasText(evidencePack.knownLimitations),
      kind: "narrative",
      detail: "State unverified assumptions and incomplete areas."
    },
    {
      label: "Next milestone",
      complete: hasText(evidencePack.nextMilestone),
      kind: "narrative",
      detail: "Name the next concrete result."
    },
    {
      label: "Portal submission notes",
      complete: hasText(evidencePack.portalSubmissionNotes),
      kind: "narrative",
      detail: "Add reviewer context, reproduction notes, or scope boundaries."
    }
  ];

  const missingNarrative = items.some(
    (item) => item.kind === "narrative" && !item.complete
  );
  const missingEvidence = items.some(
    (item) => item.kind === "evidence" && !item.complete
  );
  const status: ReadinessStatus = missingNarrative
    ? "Incomplete"
    : missingEvidence
      ? "Needs evidence"
      : "Ready";

  return { status, items };
}

export function findEvidenceQualityWarnings(evidencePack: EvidencePack): QualityWarning[] {
  const fields = [
    ["Title", evidencePack.title],
    ["Project summary", evidencePack.projectSummary],
    ["GenLayer relevance", evidencePack.genLayerRelevance],
    ["Contract address N/A reason", evidencePack.contractAddressNotApplicableReason],
    ["Transaction hash N/A reason", evidencePack.transactionHashNotApplicableReason],
    ["What was tested", evidencePack.whatWasTested],
    ["Known limitations", evidencePack.knownLimitations],
    ["Next milestone", evidencePack.nextMilestone],
    ["Portal submission notes", evidencePack.portalSubmissionNotes]
  ] as const;

  return fields.flatMap(([field, value]) => {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return [];
    return WEAK_PLACEHOLDER_TERMS.flatMap((term) => {
      const shouldWarn = ["lorem", "placeholder", "demo only"].includes(term)
        ? normalized.includes(term)
        : normalized === term;
      return shouldWarn ? [{ field, term }] : [];
    });
  });
}
export function evidenceQualityWarningMessage(warning: QualityWarning): string {
  if (warning.field === "Next milestone") {
    return "Next milestone needs a concrete planned outcome.";
  }

  if (warning.field === "Portal submission notes") {
    return "Portal submission notes needs useful implementation or review context.";
  }

  return `${warning.field} needs a more specific entry than “${warning.term}”.`;
}
