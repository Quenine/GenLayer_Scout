/**
 * Regression suite for the browser DTO normalization boundary.
 *
 * The raw contract result is snake_case. The API returns the already-normalized
 * camelCase DTO. These tests pin both trust boundaries so the client can never
 * re-apply the raw-contract normalizer to an API payload, which silently
 * produced `READ_UNAVAILABLE` even on a successful server read.
 *
 * The load-bearing test is "the exact buildResponse payload survives
 * client-side validation". That is the one that would have caught the bug.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  compareAnchorToReference,
  normalizeAnchorRecord,
  normalizeOnchainAnchorApiRecord,
  type OnchainAnchorRecord
} from "@/lib/onchain-evidence";
import { buildResponse } from "@/lib/scout-anchor-reader";

/** The exact shape the deployed contract returns from `get_anchor(1)`. */
const RAW_CONTRACT_RESULT = {
  anchor_id: 1,
  claimed_digest: "b9163889a1cf1ab99cd33ae6f3783e8a7cfcb472f7896fe0b8d464c353f8ed63",
  contract_address: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1",
  manifest_url:
    "https://github.com/Quenine/GenLayer_Scout/releases/download/v0.3.1/genlayer-scout-v0.3.1-evidence-manifest.json",
  observed_contract_address: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1",
  observed_digest: "b9163889a1cf1ab99cd33ae6f3783e8a7cfcb472f7896fe0b8d464c353f8ed63",
  observed_status: "finalized",
  observed_transaction_hash: "0xea5aff36389c249e3c0aa277fb94f5f58948d28d6dae07791ef200f01525b493",
  reason_code: "",
  recorded_status: "finalized",
  submitter: "0xd8287d058da7462e80ead924a2d23bcddbe96002",
  transaction_hash: "0xea5aff36389c249e3c0aa277fb94f5f58948d28d6dae07791ef200f01525b493",
  verification_state: "VERIFIED"
} as const;

const CAMEL_CASE_FIELDS = [
  "anchorId",
  "claimedDigest",
  "contractAddress",
  "manifestUrl",
  "observedContractAddress",
  "observedDigest",
  "observedStatus",
  "observedTransactionHash",
  "reasonCode",
  "recordedStatus",
  "submitter",
  "transactionHash",
  "verificationState"
] as const;

function normalizedRecord(): OnchainAnchorRecord {
  const record = normalizeAnchorRecord(RAW_CONTRACT_RESULT);
  if (!record) throw new Error("raw contract fixture failed to normalize");
  return record;
}

describe("trust boundary: raw contract result is normalized once, server-side", () => {
  it("1. accepts a valid raw snake_case contract result", () => {
    expect(normalizeAnchorRecord(RAW_CONTRACT_RESULT)).not.toBeNull();
  });

  it("2. the normalized result exposes camelCase fields", () => {
    const record = normalizedRecord();
    for (const field of CAMEL_CASE_FIELDS) {
      expect(record, `missing ${field}`).toHaveProperty(field);
    }
    // And it carries no snake_case contract keys. (`submitter` is spelled
    // identically in both shapes, so it is not a leak signal.)
    for (const key of Object.keys(RAW_CONTRACT_RESULT).filter((k) => k.includes("_"))) {
      expect(record, `leaked raw key ${key}`).not.toHaveProperty(key);
    }
  });

  it("still rejects malformed raw contract results", () => {
    for (const field of Object.keys(RAW_CONTRACT_RESULT)) {
      const broken: Record<string, unknown> = { ...RAW_CONTRACT_RESULT };
      delete broken[field];
      expect(normalizeAnchorRecord(broken), `missing ${field}`).toBeNull();
    }
    expect(normalizeAnchorRecord({ ...RAW_CONTRACT_RESULT, anchor_id: "1" })).toBeNull();
    expect(normalizeAnchorRecord({ ...RAW_CONTRACT_RESULT, claimed_digest: 5 })).toBeNull();
    expect(normalizeAnchorRecord({ ...RAW_CONTRACT_RESULT, verification_state: "" })).toBeNull();
    expect(normalizeAnchorRecord({ ...RAW_CONTRACT_RESULT, manifest_url: "" })).toBeNull();
  });
});

describe("trust boundary: the normalized API DTO validates independently", () => {
  it("3. the normalized camelCase result passes the API DTO validator", () => {
    expect(normalizeOnchainAnchorApiRecord(normalizedRecord())).toEqual(normalizedRecord());
  });

  it("4. a valid camelCase API VERIFIED reference record survives client validation", () => {
    const record = normalizeOnchainAnchorApiRecord(normalizedRecord());
    expect(record).not.toBeNull();
    expect(record?.verificationState).toBe("VERIFIED");
    expect(record?.reasonCode).toBe("");
    expect(record?.anchorId).toBe(1);
  });

  it("5. the validated API record produces MATCHES_VERIFIED_REFERENCE", () => {
    const record = normalizeOnchainAnchorApiRecord(normalizedRecord());
    expect(compareAnchorToReference(record).verdict).toBe("MATCHES_VERIFIED_REFERENCE");
  });

  it("6. the raw-contract normalizer is not used on the API path", () => {
    // The raw normalizer must reject the camelCase API DTO. This is what makes
    // calling it from the browser wrong, and it is why the UI needs its own
    // validator rather than a loosened raw normalizer.
    expect(normalizeAnchorRecord(normalizedRecord())).toBeNull();
    expect(normalizeAnchorRecord(RAW_CONTRACT_RESULT)).not.toBeNull();
  });

  it("7. a missing camelCase field fails safely", () => {
    for (const field of CAMEL_CASE_FIELDS) {
      const broken: Record<string, unknown> = { ...normalizedRecord() };
      delete broken[field];
      expect(normalizeOnchainAnchorApiRecord(broken), `missing ${field}`).toBeNull();
    }
  });

  it("8. a wrong camelCase digest fails safely", () => {
    for (const field of ["claimedDigest", "observedDigest"]) {
      // Malformed digests are rejected by the shape validator.
      expect(
        normalizeOnchainAnchorApiRecord({ ...normalizedRecord(), [field]: "A".repeat(64) }),
        `${field} uppercase`
      ).toBeNull();
      expect(
        normalizeOnchainAnchorApiRecord({ ...normalizedRecord(), [field]: "not-a-digest" }),
        `${field} malformed`
      ).toBeNull();
      expect(
        normalizeOnchainAnchorApiRecord({ ...normalizedRecord(), [field]: "0x" + "a".repeat(64) }),
        `${field} prefixed`
      ).toBeNull();
      expect(
        normalizeOnchainAnchorApiRecord({ ...normalizedRecord(), [field]: "a".repeat(63) }),
        `${field} short`
      ).toBeNull();
      expect(
        normalizeOnchainAnchorApiRecord({ ...normalizedRecord(), [field]: undefined }),
        `${field} absent`
      ).toBeNull();

      // A well-formed digest that simply differs from the reference is a valid
      // record, not a malformed one. Shape validation and reference comparison
      // are deliberately separate concerns.
      const differing = normalizeOnchainAnchorApiRecord({
        ...normalizedRecord(),
        [field]: "0".repeat(64)
      });
      expect(differing, `${field} well-formed but different`).not.toBeNull();
      expect(compareAnchorToReference(differing).verdict, field).toBe("LIVE_RECORD_DIFFERS");
    }
  });

  it("9. a wrong anchorId type fails safely", () => {
    for (const anchorId of ["1", 1.5, -1, null, Number.NaN, undefined]) {
      expect(normalizeOnchainAnchorApiRecord({ ...normalizedRecord(), anchorId })).toBeNull();
    }
    expect(normalizeOnchainAnchorApiRecord({ ...normalizedRecord(), anchorId: 0 })).not.toBeNull();
  });

  it("10. a malformed submitter fails safely", () => {
    for (const submitter of [
      "nobody",
      "d8287d058da7462e80ead924a2d23bcddbe96002",
      `0x${"a".repeat(39)}`,
      `0x${"a".repeat(41)}`,
      `0x${"z".repeat(40)}`,
      "0x",
      42
    ]) {
      expect(
        normalizeOnchainAnchorApiRecord({ ...normalizedRecord(), submitter }),
        String(submitter)
      ).toBeNull();
    }
    // The live 20-byte submitter must still be accepted.
    expect(
      normalizeOnchainAnchorApiRecord({
        ...normalizedRecord(),
        submitter: "0xd8287d058da7462e80ead924a2d23bcddbe96002"
      })
    ).not.toBeNull();
  });

  it("11. API DTO validation does not accept raw snake_case as the normalized shape", () => {
    expect(normalizeOnchainAnchorApiRecord(RAW_CONTRACT_RESULT)).toBeNull();
  });

  it("rejects wrong-typed camelCase fields without coercing them", () => {
    for (const field of CAMEL_CASE_FIELDS.filter((f) => f !== "anchorId")) {
      expect(
        normalizeOnchainAnchorApiRecord({ ...normalizedRecord(), [field]: 7 }),
        field
      ).toBeNull();
    }
    expect(normalizeOnchainAnchorApiRecord(null)).toBeNull();
    expect(normalizeOnchainAnchorApiRecord("VERIFIED")).toBeNull();
    expect(normalizeOnchainAnchorApiRecord([normalizedRecord()])).toBeNull();
  });
});

describe("the exact buildResponse payload survives client-side validation", () => {
  const fixedClock = () => new Date("2026-09-27T00:00:00Z");

  it("round-trips the server response the browser actually receives", () => {
    const serverResponse = buildResponse(
      { record: normalizedRecord(), failure: null },
      fixedClock
    );

    expect(serverResponse.readFailed).toBe(false);
    expect(serverResponse.readError).toBeNull();
    expect(serverResponse.record).not.toBeNull();

    // This is precisely the step that was broken in the browser.
    const clientRecord = normalizeOnchainAnchorApiRecord(serverResponse.record);

    expect(clientRecord).not.toBeNull();
    expect(clientRecord).toEqual(normalizedRecord());
    expect(compareAnchorToReference(clientRecord).verdict).toBe("MATCHES_VERIFIED_REFERENCE");
  });

  it("still renders unavailable when the server read genuinely failed", () => {
    const serverResponse = buildResponse({ record: null, failure: "read_failed" }, fixedClock);

    expect(serverResponse.readFailed).toBe(true);
    expect(serverResponse.record).toBeNull();
    expect(normalizeOnchainAnchorApiRecord(serverResponse.record)).toBeNull();
    expect(compareAnchorToReference(null).verdict).toBe("READ_UNAVAILABLE");
  });

  it("the API never exposes raw contract field names", () => {
    const serverResponse = buildResponse(
      { record: normalizedRecord(), failure: null },
      fixedClock
    );
    for (const key of Object.keys(RAW_CONTRACT_RESULT).filter((k) => k.includes("_"))) {
      expect(serverResponse.record, `leaked ${key}`).not.toHaveProperty(key);
    }
  });
});

describe("the browser component uses the API DTO validator", () => {
  const source = readFileSync(
    path.resolve(__dirname, "..", "components", "evidence", "onchain-evidence-section.tsx"),
    "utf8"
  );

  it("imports and calls normalizeOnchainAnchorApiRecord", () => {
    expect(source).toContain("normalizeOnchainAnchorApiRecord");
    expect(source).toContain("normalizeOnchainAnchorApiRecord(body.record ?? null)");
  });

  it("does not call the raw-contract normalizer", () => {
    expect(source).not.toMatch(/\bnormalizeAnchorRecord\s*\(/);
  });
});
