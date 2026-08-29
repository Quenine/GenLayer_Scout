import type { ManifestInspectionResult } from "@/lib/evidence-manifest";
import type { EvidenceManifestEnvelopeV1, ExperimentVerification } from "@/lib/types";

export const MAX_MANIFEST_INSPECT_BYTES = 2 * 1024 * 1024;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

export function isManifestInspectFilenameAccepted(filename: string): boolean {
  const lower = filename.trim().toLowerCase();
  if (!lower.endsWith(".json")) return false;
  return /\.json$/.test(lower);
}

export function isManifestInspectSizeAccepted(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_MANIFEST_INSPECT_BYTES;
}

export type ManifestParseResult =
  | { ok: true; envelope: EvidenceManifestEnvelopeV1 }
  | { ok: false; reason: "parse-error" | "not-envelope"; message: string };

export function parseManifestInspectText(text: string): ManifestParseResult {
  if (typeof text !== "string" || text.trim().length === 0) {
    return {
      ok: false,
      reason: "parse-error",
      message: "The file is empty or contains no data."
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return {
      ok: false,
      reason: "parse-error",
      message: "The file is not valid JSON."
    };
  }

  if (!isPlainObject(parsed) || !isPlainObject(parsed.payload) || !isPlainObject(parsed.integrity)) {
    return {
      ok: false,
      reason: "not-envelope",
      message: "The file is not an Evidence Manifest v1 envelope."
    };
  }

  return { ok: true, envelope: parsed as unknown as EvidenceManifestEnvelopeV1 };
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:") return url.toString();
    return null;
  } catch {
    return null;
  }
}

export function safeExternalLink(value: unknown): string | null {
  return safeHttpsUrl(value);
}

function readString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function formatTimestamp(value: unknown): string {
  const raw = readString(value);
  if (!raw) return "Not recorded";
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return date.toLocaleString();
}

export interface ManifestDetailRow {
  label: string;
  value: string;
  link?: string;
}

export interface ManifestInspectPresentation {
  status: "valid" | "modified" | "invalid" | "unsupported";
  statusLabel: string;
  statusExplanation: string;
  safeErrors: string[];
  canShowDetails: boolean;
  digestMatch: boolean;
  recordedDigest: string;
  computedDigest: string;
  manifest: ManifestDetailRow[];
  generator: ManifestDetailRow[];
  contribution: ManifestDetailRow[];
  implementation: ManifestDetailRow[];
  experiment: ManifestDetailRow[];
  verification: ManifestDetailRow[];
  integrity: ManifestDetailRow[];
  evidence: {
    links: ManifestDetailRow[];
    whatWasTested: string;
    knownLimitations: string;
    nextMilestone: string;
  };
}

const STATUS_LABELS: Record<ManifestInspectPresentation["status"], string> = {
  valid: "Valid",
  modified: "Modified",
  invalid: "Invalid",
  unsupported: "Unsupported"
};

const STATUS_EXPLANATIONS: Record<ManifestInspectPresentation["status"], string> = {
  valid:
    "The manifest structure and internal consistency checks passed, and the payload digest matches.",
  modified:
    "The manifest is structurally valid, but its current payload does not match the recorded digest.",
  invalid:
    "The file is not a valid Evidence Manifest v1 or contains inconsistent data.",
  unsupported:
    "This appears to be a GenLayer Scout manifest, but it uses a version or integrity method this Scout release does not support."
};

function presentVerification(v: ExperimentVerification | null | undefined): ManifestDetailRow[] {
  if (!v) return [];
  return [
    { label: "Verification result", value: readString(v.result) || "None" },
    { label: "Checked at", value: formatTimestamp(v.checkedAt) },
    { label: "RPC profile", value: readString(v.rpcProfile) || "None" },
    {
      label: "RPC URL",
      value: readString(v.rpcUrl) || "None",
      link: safeHttpsUrl(v.rpcUrl) ?? undefined
    },
    { label: "Observed status", value: readString(v.observedStatus) || "None" },
    {
      label: "Status match",
      value:
        v.statusMatchesManual === null
          ? "Not determined"
          : v.statusMatchesManual
            ? "Manual status matches observed status"
            : "Manual status differs from observed status"
    }
  ];
}

export function presentManifestInspection(
  envelope: EvidenceManifestEnvelopeV1,
  result: ManifestInspectionResult
): ManifestInspectPresentation {
  const status = result.status;
  const payload = envelope.payload;
  const canShowDetails =
    status === "valid" ||
    (status === "modified" && result.validation.valid === true);

  const digestMatch = status === "valid";

  const rows: ManifestInspectPresentation = {
    status,
    statusLabel: STATUS_LABELS[status],
    statusExplanation: STATUS_EXPLANATIONS[status],
    safeErrors: result.errors,
    canShowDetails,
    digestMatch,
    recordedDigest: envelope.integrity?.digest
      ? readString(envelope.integrity.digest)
      : "Not recorded",
    computedDigest: result.computedDigest || "Not recomputed",
    manifest: [
      { label: "Format", value: `${readString(envelope.format) || "Unknown"} v${payload.version}` }
    ],
    generator: [],
    contribution: [],
    implementation: [],
    experiment: [],
    verification: [],
    integrity: [],
    evidence: { links: [], whatWasTested: "", knownLimitations: "", nextMilestone: "" }
  };

  if (!canShowDetails) return rows;

  const generator = payload.generator;
  if (generator && typeof generator.name === "string" && generator.name === "GenLayer Scout") {
    rows.generator = [
      {
        label: "Generator",
        value: generator.version ? `GenLayer Scout v${generator.version}` : "GenLayer Scout"
      }
    ];
  } else {
    rows.generator = [{ label: "Generator", value: "Not recorded" }];
  }

  const ctx = payload.contributionContext;
  rows.contribution = [
    {
      label: "Title",
      value: ctx?.category?.name ? `${readString(ctx.title)} (${ctx.category.name})` : readString(ctx.title) || "Not recorded"
    },
    {
      label: "Category",
      value: ctx?.category?.name ? ctx.category.name : "None"
    },
    { label: "Summary", value: readString(ctx?.projectSummary) || "Not recorded" }
  ];

  const impl = payload.implementationReferences;
  rows.implementation = [
    { label: "Repository URL", value: readString(impl?.repositoryUrl) || "Not recorded", link: safeHttpsUrl(impl?.repositoryUrl) ?? undefined },
    { label: "Repository commit", value: readString(impl?.repositoryCommit) || "Not recorded" },
    { label: "Deployment URL", value: readString(impl?.deploymentUrl) || "Not recorded", link: safeHttpsUrl(impl?.deploymentUrl) ?? undefined }
  ];

  const details = payload.experimentDetails;
  rows.experiment = [
    { label: "Contract name", value: readString(impl?.contractName) || "Not recorded" },
    { label: "Transaction hash", value: readString(impl?.transactionHash) || "Not recorded" },
    { label: "Contract address", value: readString(impl?.deployedContractAddress) || "Not recorded" },
    { label: "Recorded status", value: readString(details?.status) || "Not recorded" }
  ];

  rows.verification = presentVerification(payload.verification ?? undefined);

  rows.integrity = [
    { label: "Recorded SHA-256 digest", value: rows.recordedDigest },
    { label: "Recomputed SHA-256 digest", value: rows.computedDigest },
    { label: "Digest match", value: digestMatch ? "Match" : "Mismatch" }
  ];

  const se = payload.supportingEvidence;
  rows.evidence.whatWasTested = readString(se?.whatWasTested);
  rows.evidence.knownLimitations = readString(se?.knownLimitations);
  rows.evidence.nextMilestone = readString(se?.nextMilestone);
  if (Array.isArray(se?.links)) {
    rows.evidence.links = se.links
      .filter((link): link is string => typeof link === "string")
      .map((link: string) => ({
        label: "Evidence link",
        value: link,
        link: safeHttpsUrl(link) ?? undefined
      }));
  }

  return rows;
}
