import { sha256Hex } from "@/lib/sha256";
import type {
  ContributionLane,
  ContractExperiment,
  EvidenceManifestEnvelopeV1,
  EvidenceManifestPayloadV1,
  EvidencePack
} from "@/lib/types";
import { EXPERIMENT_STATUSES } from "@/lib/types";

export const EVIDENCE_MANIFEST_FORMAT = "genlayer-scout-evidence-manifest" as const;
export const EVIDENCE_MANIFEST_VERSION = 1 as const;
export const EVIDENCE_MANIFEST_DIGEST_ALGORITHM = "sha256" as const;
export const EVIDENCE_MANIFEST_CANONICALIZATION =
  "genlayer-scout-json-sorted-keys-v1" as const;

const SUPPORTED_MANIFEST_VERSIONS = new Set<number>([1]);
const SUPPORTED_DIGEST_ALGORITHMS = new Set<string>(["sha256"]);
const SUPPORTED_CANONICALIZATIONS = new Set<string>(["genlayer-scout-json-sorted-keys-v1"]);

const TX_HASH_RE = /^0x[0-9a-f]{64}$/;
const CONTRACT_ADDRESS_RE = /^0x[0-9a-f]{40}$/;

export const MANIFEST_INSPECTION_STATUSES = ["valid", "modified", "invalid", "unsupported"] as const;
export type ManifestInspectionStatus = (typeof MANIFEST_INSPECTION_STATUSES)[number];

function canonicalizeJsonValue(value: unknown, seen?: Set<unknown>): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new TypeError("Evidence manifests cannot contain non-finite numbers.");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "bigint") {
    throw new TypeError("Evidence manifests cannot contain bigint values.");
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      if (!(i in value)) {
        throw new TypeError("Evidence manifests cannot contain sparse arrays.");
      }
    }
    return `[${value.map((item) => canonicalizeJsonValue(item, seen)).join(",")}]`;
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("Evidence manifests can contain plain JSON objects only.");
    }
    if (seen) {
      if (seen.has(value)) {
        throw new TypeError("Evidence manifests cannot contain cyclic structures.");
      }
      seen.add(value);
    }
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalizeJsonValue(record[key], seen)}`
    ).join(",")}}`;
  }
  throw new TypeError("Evidence manifests can contain JSON values only.");
}

/** Serializes JSON with object keys sorted recursively and array order preserved. */
export function canonicalizeEvidenceManifestJson(value: unknown): string {
  return canonicalizeJsonValue(value, new Set());
}

export function digestEvidenceManifestPayload(payload: EvidenceManifestPayloadV1): string {
  return sha256Hex(canonicalizeEvidenceManifestJson(payload));
}

function evidenceLinks(evidencePack: EvidencePack, experiment?: ContractExperiment): string[] {
  return [experiment?.evidenceUrl ?? "", ...evidencePack.additionalEvidenceLinks.split("\n")]
    .map((link) => link.trim())
    .filter(Boolean);
}

export function buildEvidenceManifestPayloadV1({
  evidencePack,
  contributionLane,
  experiment,
  implementationReferences: implRefs,
  createdAt
}: {
  evidencePack: EvidencePack;
  contributionLane?: ContributionLane;
  experiment?: ContractExperiment;
  implementationReferences?: {
    repositoryUrl: string;
    repositoryCommit: string;
    deploymentUrl: string;
  };
  createdAt?: string;
}): EvidenceManifestPayloadV1 {
  return {
    version: EVIDENCE_MANIFEST_VERSION,
    contributionContext: {
      category: contributionLane ? { id: contributionLane.id, name: contributionLane.name } : null,
      title: evidencePack.title,
      projectSummary: evidencePack.projectSummary,
      genLayerRelevance: evidencePack.genLayerRelevance
    },
    implementationReferences: experiment ? {
      experimentId: experiment.id,
      contractName: experiment.contractName,
      studioFileName: experiment.studioFileName,
      deployedContractAddress: experiment.deployedContractAddress,
      transactionHash: experiment.transactionHash,
      repositoryUrl: implRefs?.repositoryUrl ?? "",
      repositoryCommit: implRefs?.repositoryCommit ?? "",
      deploymentUrl: implRefs?.deploymentUrl ?? ""
    } : null,
    experimentDetails: experiment ? {
      status: experiment.status,
      notes: experiment.experimentNotes,
      createdAt: createdAt ?? experiment.createdAt,
      updatedAt: experiment.updatedAt
    } : null,
    verification: experiment?.verification ?? null,
    supportingEvidence: {
      links: evidenceLinks(evidencePack, experiment),
      whatWasTested: evidencePack.whatWasTested,
      knownLimitations: evidencePack.knownLimitations,
      nextMilestone: evidencePack.nextMilestone,
      contractAddressNotApplicableReason: evidencePack.contractAddressNotApplicableReason,
      transactionHashNotApplicableReason: evidencePack.transactionHashNotApplicableReason
    }
  };
}

export function createEvidenceManifestV1(input: {
  evidencePack: EvidencePack;
  contributionLane?: ContributionLane;
  experiment?: ContractExperiment;
  implementationReferences?: {
    repositoryUrl: string;
    repositoryCommit: string;
    deploymentUrl: string;
  };
  createdAt?: string;
}): EvidenceManifestEnvelopeV1 {
  const payload = buildEvidenceManifestPayloadV1(input);
  return {
    format: EVIDENCE_MANIFEST_FORMAT,
    payload,
    integrity: {
      algorithm: EVIDENCE_MANIFEST_DIGEST_ALGORITHM,
      canonicalization: EVIDENCE_MANIFEST_CANONICALIZATION,
      digest: digestEvidenceManifestPayload(payload)
    }
  };
}

export function verifyEvidenceManifestIntegrity(envelope: EvidenceManifestEnvelopeV1): boolean {
  return envelope.format === EVIDENCE_MANIFEST_FORMAT &&
    envelope.payload.version === EVIDENCE_MANIFEST_VERSION &&
    envelope.integrity.algorithm === EVIDENCE_MANIFEST_DIGEST_ALGORITHM &&
    envelope.integrity.canonicalization === EVIDENCE_MANIFEST_CANONICALIZATION &&
    envelope.integrity.digest === digestEvidenceManifestPayload(envelope.payload);
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function isHttpsOrIpfsUrl(value: string): boolean {
  if (value.startsWith("ipfs://")) return true;
  return isHttpsUrl(value);
}

function isValidTimestamp(value: string): boolean {
  if (typeof value !== "string" || value.length === 0) return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime());
}

function validateManifestPayload(payload: EvidenceManifestPayloadV1): string[] {
  const errors: string[] = [];

  if (payload.version !== 1) {
    errors.push("Payload version must be 1.");
  }

  if (typeof payload.contributionContext !== "object" || payload.contributionContext === null) {
    errors.push("contributionContext is required.");
  } else {
    const ctx = payload.contributionContext;
    if (ctx.category !== null) {
      if (typeof ctx.category !== "object" || typeof ctx.category.id !== "string" || typeof ctx.category.name !== "string") {
        errors.push("contributionContext.category must be null or {id, name}.");
      }
    }
    if (typeof ctx.title !== "string") {
      errors.push("contributionContext.title must be a string.");
    }
    if (typeof ctx.projectSummary !== "string") {
      errors.push("contributionContext.projectSummary must be a string.");
    }
    if (typeof ctx.genLayerRelevance !== "string") {
      errors.push("contributionContext.genLayerRelevance must be a string.");
    }
  }

  if (payload.implementationReferences !== null) {
    const impl = payload.implementationReferences;
    if (typeof impl !== "object") {
      errors.push("implementationReferences must be null or an object.");
    } else {
      if (typeof impl.experimentId !== "string") {
        errors.push("implementationReferences.experimentId must be a string.");
      }
      if (typeof impl.contractName !== "string") {
        errors.push("implementationReferences.contractName must be a string.");
      }
      if (typeof impl.studioFileName !== "string") {
        errors.push("implementationReferences.studioFileName must be a string.");
      }
      if (typeof impl.transactionHash !== "string" || !TX_HASH_RE.test(impl.transactionHash)) {
        errors.push("implementationReferences.transactionHash must be a valid 32-byte hex hash.");
      }
      if (typeof impl.deployedContractAddress !== "string") {
        errors.push("implementationReferences.deployedContractAddress must be a string.");
      } else if (impl.deployedContractAddress.length > 0 && !CONTRACT_ADDRESS_RE.test(impl.deployedContractAddress)) {
        errors.push("implementationReferences.deployedContractAddress must be a valid 20-byte hex address.");
      }
    }
  }

  if (payload.experimentDetails !== null) {
    const details = payload.experimentDetails;
    if (typeof details !== "object") {
      errors.push("experimentDetails must be null or an object.");
    } else {
      if (!EXPERIMENT_STATUSES.includes(details.status as typeof EXPERIMENT_STATUSES[number])) {
        errors.push(`experimentDetails.status must be one of: ${EXPERIMENT_STATUSES.join(", ")}.`);
      }
      if (!isValidTimestamp(details.createdAt)) {
        errors.push("experimentDetails.createdAt must be a valid ISO 8601 timestamp.");
      }
      if (!isValidTimestamp(details.updatedAt)) {
        errors.push("experimentDetails.updatedAt must be a valid ISO 8601 timestamp.");
      }
    }
  }

  if (payload.verification !== null) {
    const v = payload.verification;
    if (typeof v !== "object") {
      errors.push("verification must be null or an object.");
    } else {
      if (typeof v.result !== "string") {
        errors.push("verification.result is required.");
      }
      if (typeof v.transactionFound !== "boolean") {
        errors.push("verification.transactionFound must be a boolean.");
      }
      if (typeof v.receiptAvailable !== "boolean") {
        errors.push("verification.receiptAvailable must be a boolean.");
      }
      if (typeof v.statusMatchesManual !== "boolean" && v.statusMatchesManual !== null) {
        errors.push("verification.statusMatchesManual must be a boolean or null.");
      }
      if (typeof v.contractLookup !== "string") {
        errors.push("verification.contractLookup is required.");
      }
    }
  }

  if (typeof payload.supportingEvidence !== "object" || payload.supportingEvidence === null) {
    errors.push("supportingEvidence is required.");
  } else {
    const se = payload.supportingEvidence;
    if (!Array.isArray(se.links)) {
      errors.push("supportingEvidence.links must be an array.");
    } else {
      const hasValidLink = se.links.some((link) => typeof link === "string" && isHttpsOrIpfsUrl(link));
      if (!hasValidLink) {
        errors.push("supportingEvidence.links must contain at least one HTTPS or IPFS URL.");
      }
    }
    const requiredTextFields = ["whatWasTested", "knownLimitations", "nextMilestone"] as const;
    for (const field of requiredTextFields) {
      const value = se[field];
      if (typeof value !== "string" || value.trim().length === 0) {
        errors.push(`supportingEvidence.${field} must be a non-empty string.`);
      }
    }
  }

  return errors.filter(Boolean) as string[];
}

function validateSnapshotConsistency(
  payload: EvidenceManifestPayloadV1
): string[] {
  const errors: string[] = [];
  const impl = payload.implementationReferences;
  const verification = payload.verification;

  if (impl && verification && verification.snapshot) {
    const snap = verification.snapshot;
    if (impl.transactionHash !== snap.transactionHash) {
      errors.push("Verification snapshot transaction hash differs from experiment transaction hash.");
    }
    if (impl.deployedContractAddress !== snap.contractAddress) {
      errors.push("Verification snapshot contract address differs from experiment contract address.");
    }
    if (payload.experimentDetails && payload.experimentDetails.status !== snap.manualStatus) {
      errors.push("Verification snapshot manual status differs from experiment recorded status.");
    }
  }

  return errors;
}

function validateVerificationConsistency(
  payload: EvidenceManifestPayloadV1
): string[] {
  const errors: string[] = [];
  const v = payload.verification;

  if (!v) return errors;

  if (v.result === "verified") {
    if (v.transactionFound !== true) {
      errors.push("result=verified requires transactionFound=true.");
    }
    if (v.statusMatchesManual !== true) {
      errors.push("result=verified requires statusMatchesManual=true.");
    }
  }

  if (v.result === "mismatch") {
    if (v.statusMatchesManual !== false) {
      errors.push("result=mismatch requires statusMatchesManual=false.");
    }
  }

  if (v.result === "not_found") {
    if (v.transactionFound === true) {
      errors.push("result=not_found requires transactionFound=false.");
    }
  }

  if (v.receiptCapability === "unsupported" && v.receiptAvailable === true) {
    errors.push("receiptCapability=unsupported requires receiptAvailable=false.");
  }

  if (v.contractStateCapability === "unsupported" && v.contractLookup === "found") {
    errors.push("contractStateCapability=unsupported requires contractLookup != found.");
  }

  return errors;
}

export interface ManifestValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEvidenceManifestV1(
  envelope: EvidenceManifestEnvelopeV1
): ManifestValidationResult {
  const errors: string[] = [
    ...validateManifestPayload(envelope.payload),
    ...validateSnapshotConsistency(envelope.payload),
    ...validateVerificationConsistency(envelope.payload)
  ];

  return { valid: errors.length === 0, errors };
}

export interface ManifestInspectionResult {
  status: ManifestInspectionStatus;
  digestMatches: boolean;
  validation: ManifestValidationResult;
  computedDigest: string;
  errors: string[];
}

export function inspectEvidenceManifestV1(
  envelope: EvidenceManifestEnvelopeV1
): ManifestInspectionResult {
  if (envelope.format !== EVIDENCE_MANIFEST_FORMAT) {
    return {
      status: "invalid",
      digestMatches: false,
      validation: { valid: false, errors: ["Unrecognized manifest format."] },
      computedDigest: "",
      errors: ["Unrecognized manifest format."]
    };
  }

  if (!SUPPORTED_MANIFEST_VERSIONS.has(envelope.payload.version)) {
    return {
      status: "unsupported",
      digestMatches: false,
      validation: { valid: false, errors: [`Unsupported manifest version: ${envelope.payload.version}.`] },
      computedDigest: "",
      errors: [`Unsupported manifest version: ${envelope.payload.version}.`]
    };
  }

  if (!SUPPORTED_DIGEST_ALGORITHMS.has(envelope.integrity.algorithm)) {
    return {
      status: "unsupported",
      digestMatches: false,
      validation: { valid: false, errors: [`Unsupported digest algorithm: ${envelope.integrity.algorithm}.`] },
      computedDigest: "",
      errors: [`Unsupported digest algorithm: ${envelope.integrity.algorithm}.`]
    };
  }

  if (!SUPPORTED_CANONICALIZATIONS.has(envelope.integrity.canonicalization)) {
    return {
      status: "unsupported",
      digestMatches: false,
      validation: { valid: false, errors: [`Unsupported canonicalization: ${envelope.integrity.canonicalization}.`] },
      computedDigest: "",
      errors: [`Unsupported canonicalization: ${envelope.integrity.canonicalization}.`]
    };
  }

  const validation = validateEvidenceManifestV1(envelope);
  const computedDigest = digestEvidenceManifestPayload(envelope.payload);
  const digestMatches = computedDigest === envelope.integrity.digest;

  if (!validation.valid) {
    return {
      status: "invalid",
      digestMatches,
      validation,
      computedDigest,
      errors: validation.errors
    };
  }

  if (!digestMatches) {
    return {
      status: "modified",
      digestMatches: false,
      validation,
      computedDigest,
      errors: ["Digest does not match. Payload or integrity metadata has been modified."]
    };
  }

  return {
    status: "valid",
    digestMatches: true,
    validation,
    computedDigest,
    errors: []
  };
}
