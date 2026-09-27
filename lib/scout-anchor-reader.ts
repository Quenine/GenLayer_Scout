/**
 * Server-only read adapter for the deployed ScoutEvidenceAnchor contract.
 *
 * This module is the ONLY place that imports the GenLayer SDK. It performs
 * read-only calls: there is no wallet, no account, no signing, and no
 * transaction submission anywhere in this file, by design. The v0.4 milestone
 * is a public read/evidence surface; the writes were performed separately in
 * GenLayer Studio.
 */

import { createClient } from "genlayer-js";
import { chains } from "genlayer-js";
import { TransactionHashVariant } from "genlayer-js/types";

import {
  SCOUT_ANCHOR_CHAIN_ID,
  SCOUT_ANCHOR_CONTRACT_ADDRESS,
  SCOUT_ANCHOR_ID
} from "@/lib/scout-anchor-config";
import {
  normalizeAnchorRecord,
  compareAnchorToReference,
  type OnchainAnchorRecord,
  type OnchainEvidenceResponse
} from "@/lib/onchain-evidence";

/** Public Vercel functions should fail fast rather than hang a user request. */
const READ_TIMEOUT_MS = 8000;

/**
 * Minimal structural view of the SDK client, so the adapter can be exercised
 * with a stub in tests without importing the real SDK.
 */
export interface AnchorReadClient {
  readContract(args: {
    address: `0x${string}`;
    functionName: string;
    args: unknown[];
    transactionHashVariant: TransactionHashVariant;
  }): Promise<unknown>;
}

let cachedClient: AnchorReadClient | null = null;

/**
 * An account-free read client. `createClient` with only a chain configured
 * cannot sign, so there is no key material to leak and no write path to take.
 */
function getReadClient(): AnchorReadClient {
  if (!cachedClient) {
    cachedClient = createClient({ chain: chains.studionet }) as unknown as AnchorReadClient;
  }
  return cachedClient;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("read_timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export interface ReadAnchorOptions {
  /** Injectable for tests; defaults to the account-free Studionet client. */
  client?: AnchorReadClient;
  timeoutMs?: number;
  /** Injectable clock so the response is deterministic under test. */
  now?: () => Date;
}

/**
 * Reads `get_anchor(anchorId)` from the configured deployment using finalized
 * state semantics, and normalizes the result.
 *
 * `LATEST_FINAL` means the read is resolved against finalized consensus state
 * rather than the pending/preview state, which is what an evidence surface
 * should report. It is a read-time argument only and sends no transaction.
 */
export async function readAnchorRecord(
  options: ReadAnchorOptions = {}
): Promise<{ record: OnchainAnchorRecord | null; failure: string | null }> {
  const client = options.client ?? getReadClient();
  const timeoutMs = options.timeoutMs ?? READ_TIMEOUT_MS;

  try {
    const raw = await withTimeout(
      client.readContract({
        address: SCOUT_ANCHOR_CONTRACT_ADDRESS,
        functionName: "get_anchor",
        args: [SCOUT_ANCHOR_ID],
        transactionHashVariant: TransactionHashVariant.LATEST_FINAL
      }),
      timeoutMs
    );

    const record = normalizeAnchorRecord(raw);
    if (!record) {
      return { record: null, failure: "unexpected_response" };
    }
    return { record, failure: null };
  } catch {
    // Never surface SDK internals, stack traces, or RPC error text to clients.
    return { record: null, failure: "read_failed" };
  }
}

/** Builds the sanitized API payload for a successful or failed read. */
export function buildResponse(
  outcome: { record: OnchainAnchorRecord | null; failure: string | null },
  now: () => Date = () => new Date()
): OnchainEvidenceResponse {
  const comparison = compareAnchorToReference(outcome.record);
  const readFailed = outcome.record === null;

  return {
    contractAddress: SCOUT_ANCHOR_CONTRACT_ADDRESS,
    anchorId: SCOUT_ANCHOR_ID,
    record: outcome.record,
    comparison,
    readFailed,
    readError: readFailed
      ? outcome.failure === "unexpected_response"
        ? "The Studionet node returned a response this release cannot interpret."
        : "The Studionet read did not complete."
      : null,
    readAt: now().toISOString()
  };
}

export { SCOUT_ANCHOR_CHAIN_ID };
