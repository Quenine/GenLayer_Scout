/**
 * Immutable public reference data for the hosted ScoutEvidenceAnchor
 * deployment on GenLayer Studionet.
 *
 * Everything in this file is public, static, and safe to import from a client
 * component. It contains *reference* values only. The live anchor record is
 * never read from here: it comes from the server-side contract reader so the
 * UI can never present a hardcoded state as if it were network evidence.
 *
 * The contract itself lives in `contracts/scout_evidence_anchor.py` and is not
 * modified by this milestone. Scout only reads from it.
 */

export const SCOUT_ANCHOR_NETWORK_NAME = "GenLayer Studionet";
export const SCOUT_ANCHOR_CHAIN_ID = 61999;
export const SCOUT_ANCHOR_RPC_URL = "https://studio.genlayer.com/api";
export const SCOUT_ANCHOR_EXPLORER_BASE = "https://explorer-studio.genlayer.com";

/** The deployed, read-only ScoutEvidenceAnchor contract. */
export const SCOUT_ANCHOR_CONTRACT_ADDRESS =
  "0x246813806cD01d17f2995DAF9e0aCC1DaC31c488";

/** The single anchor published for the v0.3.1 evidence manifest. */
export const SCOUT_ANCHOR_ID = 1;

export const SCOUT_ANCHOR_MANIFEST_URL =
  "https://github.com/Quenine/GenLayer_Scout/releases/download/v0.3.1/genlayer-scout-v0.3.1-evidence-manifest.json";

/** Transaction that deployed ScoutEvidenceAnchor. */
export const SCOUT_ANCHOR_DEPLOYMENT_TX =
  "0xb73260af0e5ae5b1e4729dc5017bb8241763097e812d258573cb09fb5e677412";

/** Transaction that called `anchor_manifest` for anchor 1. */
export const SCOUT_ANCHOR_ANCHOR_TX =
  "0xf34788da4e73e1b46af966c6cdc51132f24ead45f7415da2625261c5c7e8836a";

/** Transaction whose consensus settled `verify_anchor` to VERIFIED. */
export const SCOUT_ANCHOR_VERIFICATION_TX =
  "0x39c0e897be9f5be5614330c028a2103eb5d2bcafa5e7c8090e6311fbd25df876";

/**
 * The published v0.3.1 reference the live record is compared against.
 *
 * These are the values recorded at publication time. A live record that
 * differs is reported as differing, never as proof of wrongdoing.
 */
export const SCOUT_ANCHOR_REFERENCE = {
  anchorId: SCOUT_ANCHOR_ID,
  verificationState: "VERIFIED",
  reasonCode: "",
  manifestUrl: SCOUT_ANCHOR_MANIFEST_URL,
  claimedDigest: "b9163889a1cf1ab99cd33ae6f3783e8a7cfcb472f7896fe0b8d464c353f8ed63",
  observedDigest: "b9163889a1cf1ab99cd33ae6f3783e8a7cfcb472f7896fe0b8d464c353f8ed63",
  transactionHash: "0xea5aff36389c249e3c0aa277fb94f5f58948d28d6dae07791ef200f01525b493",
  observedTransactionHash:
    "0xea5aff36389c249e3c0aa277fb94f5f58948d28d6dae07791ef200f01525b493",
  contractAddress: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1",
  observedContractAddress: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1",
  recordedStatus: "finalized",
  observedStatus: "finalized"
} as const;

/** Explorer deep link for an address. Verified against the live explorer. */
export function scoutAnchorContractUrl(): string {
  return `${SCOUT_ANCHOR_EXPLORER_BASE}/address/${SCOUT_ANCHOR_CONTRACT_ADDRESS}`;
}

/** Explorer deep link for a transaction, using the `/tx/<hash>` form. */
export function scoutAnchorTxUrl(hash: string): string {
  return `${SCOUT_ANCHOR_EXPLORER_BASE}/tx/${hash}`;
}

export const SCOUT_ANCHOR_REFERENCE_URLS = {
  contract: scoutAnchorContractUrl(),
  deploymentTx: scoutAnchorTxUrl(SCOUT_ANCHOR_DEPLOYMENT_TX),
  anchorTx: scoutAnchorTxUrl(SCOUT_ANCHOR_ANCHOR_TX),
  verificationTx: scoutAnchorTxUrl(SCOUT_ANCHOR_VERIFICATION_TX)
} as const;
