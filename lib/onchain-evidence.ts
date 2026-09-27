/**
 * Pure types, normalization, comparison and presentation logic for read-only
 * onchain evidence from ScoutEvidenceAnchor.
 *
 * Nothing here performs I/O, imports the GenLayer SDK, or touches the network,
 * so all of it is unit-testable in isolation. Live network data is treated as
 * untrusted external input: every field is shape-checked before use.
 */

import { SCOUT_ANCHOR_REFERENCE } from "@/lib/scout-anchor-config";

/** The normalized, sanitized anchor record exposed to the client. */
export interface OnchainAnchorRecord {
  anchorId: number;
  claimedDigest: string;
  contractAddress: string;
  manifestUrl: string;
  observedContractAddress: string;
  observedDigest: string;
  observedStatus: string;
  observedTransactionHash: string;
  reasonCode: string;
  recordedStatus: string;
  submitter: string;
  transactionHash: string;
  verificationState: string;
}

export type OnchainEvidenceVerdict =
  | "MATCHES_VERIFIED_REFERENCE"
  | "LIVE_RECORD_DIFFERS"
  | "NOT_VERIFIED"
  | "READ_UNAVAILABLE";

/** One field-level difference between the live record and the reference. */
export interface ReferenceDifference {
  field: string;
  label: string;
  live: string;
  expected: string;
}

export interface OnchainEvidenceComparison {
  verdict: OnchainEvidenceVerdict;
  differences: ReferenceDifference[];
}

const HEX_LITERAL = /^0x[0-9a-fA-F]+$/;
const TX_HASH = /^0x[0-9a-fA-F]{64}$/;
const ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const DIGEST = /^[0-9a-f]{64}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/**
 * Validates a raw value read from the contract into a normalized record.
 *
 * Returns `null` when the shape is not what the contract is documented to
 * return, so a malformed or unexpected network payload can never reach the UI
 * as a partially-populated "VERIFIED" record.
 */
export function normalizeAnchorRecord(raw: unknown): OnchainAnchorRecord | null {
  if (!isRecord(raw)) return null;

  const anchorId = raw.anchor_id;
  if (typeof anchorId !== "number" || !Number.isInteger(anchorId) || anchorId < 0) {
    return null;
  }

  const claimedDigest = str(raw.claimed_digest);
  const observedDigest = str(raw.observed_digest);
  const manifestUrl = str(raw.manifest_url);
  const verificationState = str(raw.verification_state);
  const recordedStatus = str(raw.recorded_status);
  const observedStatus = str(raw.observed_status);
  const submitter = str(raw.submitter);
  const reasonCode = str(raw.reason_code);
  const transactionHash = str(raw.transaction_hash);
  const observedTransactionHash = str(raw.observed_transaction_hash);
  const contractAddress = str(raw.contract_address);
  const observedContractAddress = str(raw.observed_contract_address);

  if (
    claimedDigest === null ||
    observedDigest === null ||
    manifestUrl === null ||
    verificationState === null ||
    recordedStatus === null ||
    observedStatus === null ||
    submitter === null ||
    reasonCode === null ||
    transactionHash === null ||
    observedTransactionHash === null ||
    contractAddress === null ||
    observedContractAddress === null
  ) {
    return null;
  }

  // Hex-shaped fields must actually look like hex, and hashes/addresses must
  // have the right width, otherwise a truncated or wrong field would silently
  // be reported as a plain reference mismatch.
  if (!DIGEST.test(claimedDigest) || !DIGEST.test(observedDigest)) return null;
  if (!TX_HASH.test(transactionHash) || !TX_HASH.test(observedTransactionHash)) return null;
  if (!ADDRESS.test(contractAddress) || !ADDRESS.test(observedContractAddress)) return null;
  if (!HEX_LITERAL.test(submitter)) return null;
  if (verificationState.length === 0 || manifestUrl.length === 0) return null;

  return {
    anchorId,
    claimedDigest,
    contractAddress,
    manifestUrl,
    observedContractAddress,
    observedDigest,
    observedStatus,
    observedTransactionHash,
    reasonCode,
    recordedStatus,
    submitter,
    transactionHash,
    verificationState
  };
}

/**
 * Case-insensitive comparison for `0x`-prefixed hex values.
 *
 * Hexadecimal casing never changes the represented bytes, so `0xAb…` and
 * `0xab…` are the same address or hash.
 */
export function hexSemanticallyEqual(left: string | number, right: string | number): boolean {
  if (typeof left === "string" && typeof right === "string" && HEX_LITERAL.test(left) && HEX_LITERAL.test(right)) {
    return left.toLowerCase() === right.toLowerCase();
  }
  return left === right;
}

/** Digests are compared exactly: they are lowercase hex without a `0x` prefix. */
export function digestEquals(left: string | number, right: string | number): boolean {
  return left === right;
}

const DIFFERENCE_LABELS: Array<{
  /**
   * Only fields that exist in the published reference are compared. `submitter`
   * is a live-only field and is displayed but never compared.
   */
  field: keyof typeof SCOUT_ANCHOR_REFERENCE;
  label: string;
  compare: (live: string | number, expected: string | number) => boolean;
}> = [
  { field: "anchorId", label: "Anchor ID", compare: (l, e) => l === e },
  { field: "verificationState", label: "Verification state", compare: (l, e) => l === e },
  { field: "reasonCode", label: "Reason code", compare: (l, e) => l === e },
  { field: "manifestUrl", label: "Manifest URL", compare: (l, e) => l === e },
  { field: "claimedDigest", label: "Claimed digest", compare: digestEquals },
  { field: "observedDigest", label: "Observed digest", compare: digestEquals },
  {
    field: "transactionHash",
    label: "Referenced transaction",
    compare: hexSemanticallyEqual
  },
  {
    field: "observedTransactionHash",
    label: "Observed transaction",
    compare: hexSemanticallyEqual
  },
  {
    field: "contractAddress",
    label: "Referenced contract",
    compare: hexSemanticallyEqual
  },
  {
    field: "observedContractAddress",
    label: "Observed contract",
    compare: hexSemanticallyEqual
  },
  { field: "recordedStatus", label: "Recorded status", compare: (l, e) => l === e },
  { field: "observedStatus", label: "Observed status", compare: (l, e) => l === e }
];

/**
 * Compares a live anchor record against the published v0.3.1 reference.
 *
 * A `LIVE_RECORD_DIFFERS` verdict only states that the values are not the same
 * as the published reference. It is not evidence of tampering, and this
 * function deliberately makes no such claim.
 */
export function compareAnchorToReference(
  record: OnchainAnchorRecord | null
): OnchainEvidenceComparison {
  if (!record) {
    return { verdict: "READ_UNAVAILABLE", differences: [] };
  }

  // A record that is not VERIFIED is reported separately from one that is
  // VERIFIED but disagrees with the reference.
  if (record.verificationState !== SCOUT_ANCHOR_REFERENCE.verificationState) {
    return { verdict: "NOT_VERIFIED", differences: [] };
  }

  const differences: ReferenceDifference[] = [];
  for (const rule of DIFFERENCE_LABELS) {
    const live = record[rule.field];
    const expected = SCOUT_ANCHOR_REFERENCE[rule.field];
    if (!rule.compare(live, expected)) {
      differences.push({
        field: rule.field,
        label: rule.label,
        live: String(live),
        expected: String(expected)
      });
    }
  }

  return {
    verdict: differences.length === 0 ? "MATCHES_VERIFIED_REFERENCE" : "LIVE_RECORD_DIFFERS",
    differences
  };
}

/** The sanitized payload returned by the API route. */
export interface OnchainEvidenceResponse {
  /** Always the configured deployment; never client-supplied. */
  contractAddress: string;
  anchorId: number;
  record: OnchainAnchorRecord | null;
  comparison: OnchainEvidenceComparison;
  /** True when the read itself failed or returned an unusable payload. */
  readFailed: boolean;
  /** Present only when the read failed. Safe, human-readable, no internals. */
  readError: string | null;
  /** Server-observed read time. Excluded from hydration-sensitive rendering. */
  readAt: string | null;
}

export const READ_ERROR_UNAVAILABLE =
  "The Studionet read did not complete. The published reference below is unchanged.";
export const READ_ERROR_UNEXPECTED =
  "The Studionet node returned a response this release cannot interpret. The published reference below is unchanged.";

/** Presentation metadata for a verdict. Pure and UI-free. */
export interface VerdictPresentation {
  title: string;
  tone: "match" | "differs" | "pending" | "unavailable";
  description: string;
}

export function presentVerdict(
  verdict: OnchainEvidenceVerdict,
  differences: ReferenceDifference[]
): VerdictPresentation {
  switch (verdict) {
    case "MATCHES_VERIFIED_REFERENCE":
      return {
        title: "Verified reference match",
        tone: "match",
        description:
          "Live Studionet record matches the published v0.3.1 evidence reference."
      };
    case "LIVE_RECORD_DIFFERS":
      return {
        title: "Record differs",
        tone: "differs",
        description:
          "The live record is VERIFIED but does not match the published v0.3.1 reference. This is reported as a difference from the published values, not as evidence of wrongdoing."
      };
    case "NOT_VERIFIED":
      return {
        title: "Anchor not verified",
        tone: "pending",
        description:
          "The live anchor has not settled as VERIFIED. The published reference below is unchanged."
      };
    case "READ_UNAVAILABLE":
    default:
      return {
        title: "Network read unavailable",
        tone: "unavailable",
        description: differences.length
          ? ""
          : "The live anchor state could not be read from Studionet."
      };
  }
}

/**
 * Trust-boundary text shown in the UI.
 *
 * Kept here as data so the wording is reviewable and testable, and so the UI
 * cannot quietly soften it.
 */
export const TRUST_BOUNDARY_NOTES = {
  localInspection:
    "Local manifest inspection checks the artifact's own structure and digest on this device.",
  anchorVerification:
    "During verify_anchor, GenLayer validators independently fetched the public manifest, recomputed its payload digest, compared the anchored stable fields and the saved verification snapshot, and settled the anchor state through GenLayer consensus.",
  verifiedMeans:
    "A VERIFIED anchor means the fetched manifest was supported, self-consistent, and matched the anchored claim at verification time.",
  doesNotEstablish: [
    "authorship",
    "ownership",
    "identity",
    "truthfulness of arbitrary linked evidence",
    "Portal acceptance",
    "points or rewards"
  ],
  history:
    "The settled onchain anchor record is a historical record of the consensus observation at verification time. The manifest file itself is not immutable."
} as const;

/** Fields rendered in the live-record detail table, in display order. */
export const LIVE_FIELD_ORDER: Array<{ key: keyof OnchainAnchorRecord; label: string }> = [
  { key: "verificationState", label: "Verification state" },
  { key: "claimedDigest", label: "Claimed digest" },
  { key: "observedDigest", label: "Observed digest" },
  { key: "transactionHash", label: "Referenced transaction" },
  { key: "observedTransactionHash", label: "Observed transaction" },
  { key: "contractAddress", label: "Referenced contract" },
  { key: "observedContractAddress", label: "Observed contract" },
  { key: "recordedStatus", label: "Recorded status" },
  { key: "observedStatus", label: "Observed status" },
  { key: "reasonCode", label: "Reason code" },
  { key: "submitter", label: "Submitter" }
];
