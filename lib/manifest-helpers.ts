import type { ContractExperiment, ContributionLane, EvidencePack } from "@/lib/types";

export interface ManifestInput {
  evidencePack: EvidencePack;
  contributionLane?: ContributionLane;
  experiment?: ContractExperiment;
  implementationReferences?: {
    repositoryUrl: string;
    repositoryCommit: string;
    deploymentUrl: string;
  };
  createdAt?: string;
}

export function mapScoutToManifestInput({
  evidencePack,
  experiment,
  contributionLane,
  repositoryUrl,
  repositoryCommit,
  deploymentUrl,
  createdAt
}: {
  evidencePack: EvidencePack;
  experiment?: ContractExperiment;
  contributionLane?: ContributionLane;
  repositoryUrl: string;
  repositoryCommit: string;
  deploymentUrl: string;
  createdAt: string;
}): ManifestInput {
  return {
    evidencePack,
    experiment,
    contributionLane,
    implementationReferences: {
      repositoryUrl,
      repositoryCommit,
      deploymentUrl
    },
    createdAt
  };
}

export interface ManifestPrerequisiteError {
  field: string;
  message: string;
}

export function validateManifestPrerequisites({
  experiment,
  evidencePack,
  repositoryUrl,
  repositoryCommit,
  deploymentUrl
}: {
  experiment?: ContractExperiment;
  evidencePack: EvidencePack;
  repositoryUrl: string;
  repositoryCommit: string;
  deploymentUrl: string;
}): ManifestPrerequisiteError[] {
  const errors: ManifestPrerequisiteError[] = [];

  if (!experiment) {
    errors.push({ field: "experiment", message: "Select a contract experiment." });
  } else if (!experiment.verification) {
    errors.push({ field: "experiment", message: "Run RPC verification on the selected experiment first." });
  }

  if (!evidencePack.title.trim()) {
    errors.push({ field: "title", message: "Enter a contribution title." });
  }
  if (!evidencePack.projectSummary.trim()) {
    errors.push({ field: "projectSummary", message: "Enter a project summary." });
  }
  if (!evidencePack.genLayerRelevance.trim()) {
    errors.push({ field: "genLayerRelevance", message: "Enter GenLayer relevance." });
  }
  if (!evidencePack.whatWasTested.trim()) {
    errors.push({ field: "whatWasTested", message: "Enter what was tested." });
  }
  if (!evidencePack.knownLimitations.trim()) {
    errors.push({ field: "knownLimitations", message: "Enter known limitations." });
  }
  if (!evidencePack.nextMilestone.trim()) {
    errors.push({ field: "nextMilestone", message: "Enter next milestone." });
  }

  if (!repositoryUrl.trim()) {
    errors.push({ field: "repositoryUrl", message: "Enter the repository URL." });
  }
  if (!repositoryCommit.trim()) {
    errors.push({ field: "repositoryCommit", message: "Enter the full commit SHA." });
  }
  if (!deploymentUrl.trim()) {
    errors.push({ field: "deploymentUrl", message: "Enter the deployment URL." });
  }

  if (experiment) {
    const links = [
      experiment.evidenceUrl,
      ...evidencePack.additionalEvidenceLinks.split("\n").map((l) => l.trim())
    ].filter(Boolean);
    const hasValidLink = links.some((link) => {
      if (link.startsWith("ipfs://")) return true;
      try { return new URL(link).protocol === "https:"; } catch { return false; }
    });
    if (!hasValidLink) {
      errors.push({ field: "links", message: "Add at least one HTTPS or IPFS evidence link." });
    }
  }

  return errors;
}

export function sanitizeManifestFilename(title: string, digestPrefix: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  const safeSlug = slug || "manifest";
  const safeDigest = digestPrefix.replace(/[^a-f0-9]/g, "").slice(0, 8);
  return `genlayer-scout-${safeSlug}-${safeDigest}.manifest.json`;
}
