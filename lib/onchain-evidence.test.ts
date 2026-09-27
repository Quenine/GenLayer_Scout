import { describe, expect, it } from "vitest";

import {
  SCOUT_ANCHOR_ANCHOR_TX,
  SCOUT_ANCHOR_CHAIN_ID,
  SCOUT_ANCHOR_CONTRACT_ADDRESS,
  SCOUT_ANCHOR_DEPLOYMENT_TX,
  SCOUT_ANCHOR_ID,
  SCOUT_ANCHOR_MANIFEST_URL,
  SCOUT_ANCHOR_NETWORK_NAME,
  SCOUT_ANCHOR_VERIFICATION_TX,
  scoutAnchorContractUrl,
  scoutAnchorTxUrl
} from "@/lib/scout-anchor-config";
import {
  compareAnchorToReference,
  digestEquals,
  hexSemanticallyEqual,
  normalizeAnchorRecord,
  presentVerdict,
  type OnchainAnchorRecord
} from "@/lib/onchain-evidence";

/**
 * The exact record observed from the live Studionet `get_anchor(1)` read, in
 * the raw snake_case shape the contract returns.
 */
function provenRaw(): Record<string, unknown> {
  return {
    anchor_id: 1,
    claimed_digest: "b9163889a1cf1ab99cd33ae6f3783e8a7cfcb472f7896fe0b8d464c353f8ed63",
    contract_address: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1",
    manifest_url:
      "https://github.com/Quenine/GenLayer_Scout/releases/download/v0.3.1/genlayer-scout-v0.3.1-evidence-manifest.json",
    observed_contract_address: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1",
    observed_digest: "b9163889a1cf1ab99cd33ae6f3783e8a7cfcb472f7896fe0b8d464c353f8ed63",
    observed_status: "finalized",
    observed_transaction_hash:
      "0xea5aff36389c249e3c0aa277fb94f5f58948d28d6dae07791ef200f01525b493",
    reason_code: "",
    recorded_status: "finalized",
    submitter: "0xd8287d058da7462e80ead924a2d23bcddbe96002",
    transaction_hash: "0xea5aff36389c249e3c0aa277fb94f5f58948d28d6dae07791ef200f01525b493",
    verification_state: "VERIFIED"
  };
}

function provenRecord(): OnchainAnchorRecord {
  const normalized = normalizeAnchorRecord(provenRaw());
  if (!normalized) throw new Error("proven fixture failed to normalize");
  return normalized;
}

function withField(field: string, value: unknown): OnchainAnchorRecord {
  const raw = provenRaw();
  raw[field] = value;
  const normalized = normalizeAnchorRecord(raw);
  if (!normalized) throw new Error("mutated fixture failed to normalize");
  return normalized;
}

describe("onchain evidence reference comparison", () => {
  it("reports MATCHES_VERIFIED_REFERENCE for the exact proven record", () => {
    const comparison = compareAnchorToReference(provenRecord());
    expect(comparison.verdict).toBe("MATCHES_VERIFIED_REFERENCE");
    expect(comparison.differences).toEqual([]);
  });

  it("reports NOT_VERIFIED when the live verification_state is not VERIFIED", () => {
    for (const state of ["ANCHORED", "MISMATCH", "INVALID", "UNAVAILABLE", "verifie"]) {
      const comparison = compareAnchorToReference(withField("verification_state", state));
      expect(comparison.verdict).toBe("NOT_VERIFIED");
    }
  });

  it("reports LIVE_RECORD_DIFFERS when a VERIFIED record carries a non-empty reason_code", () => {
    const comparison = compareAnchorToReference(withField("reason_code", "DIGEST_MISMATCH"));
    expect(comparison.verdict).toBe("LIVE_RECORD_DIFFERS");
    expect(comparison.differences.map((d) => d.field)).toContain("reasonCode");
  });

  it("reports LIVE_RECORD_DIFFERS on a claimed digest mismatch", () => {
    const wrong = "0".repeat(64);
    const comparison = compareAnchorToReference(withField("claimed_digest", wrong));
    expect(comparison.verdict).toBe("LIVE_RECORD_DIFFERS");
    expect(comparison.differences.map((d) => d.field)).toContain("claimedDigest");
  });

  it("reports LIVE_RECORD_DIFFERS on an observed digest mismatch", () => {
    const comparison = compareAnchorToReference(withField("observed_digest", "f".repeat(64)));
    expect(comparison.verdict).toBe("LIVE_RECORD_DIFFERS");
    expect(comparison.differences.map((d) => d.field)).toContain("observedDigest");
  });

  it("reports LIVE_RECORD_DIFFERS on a transaction mismatch", () => {
    for (const field of ["transaction_hash", "observed_transaction_hash"]) {
      const comparison = compareAnchorToReference(withField(field, `0x${"1".repeat(64)}`));
      expect(comparison.verdict).toBe("LIVE_RECORD_DIFFERS");
    }
  });

  it("reports LIVE_RECORD_DIFFERS on an address mismatch", () => {
    for (const field of ["contract_address", "observed_contract_address"]) {
      const comparison = compareAnchorToReference(withField(field, `0x${"2".repeat(40)}`));
      expect(comparison.verdict).toBe("LIVE_RECORD_DIFFERS");
    }
  });

  it("reports LIVE_RECORD_DIFFERS on a recorded status mismatch", () => {
    const comparison = compareAnchorToReference(withField("recorded_status", "consensus"));
    expect(comparison.verdict).toBe("LIVE_RECORD_DIFFERS");
    expect(comparison.differences.map((d) => d.field)).toContain("recordedStatus");
  });

  it("reports LIVE_RECORD_DIFFERS on an observed status mismatch", () => {
    const comparison = compareAnchorToReference(withField("observed_status", "accepted"));
    expect(comparison.verdict).toBe("LIVE_RECORD_DIFFERS");
    expect(comparison.differences.map((d) => d.field)).toContain("observedStatus");
  });

  it("reports LIVE_RECORD_DIFFERS on a manifest URL or anchor id mismatch", () => {
    expect(
      compareAnchorToReference(withField("manifest_url", "https://example.test/other.json")).verdict
    ).toBe("LIVE_RECORD_DIFFERS");
    expect(compareAnchorToReference(withField("anchor_id", 2)).verdict).toBe(
      "LIVE_RECORD_DIFFERS"
    );
  });

  it("matches semantically when hex casing differs but bytes are identical", () => {
    const record = withField("contract_address", "0x6b9e22dd81f750c3fd9b1473002319f87992fac1");
    const record2 = withField(
      "observed_contract_address",
      "0x6B9E22DD81F750C3FD9B1473002319F87992FAC1"
    );
    const record3 = withField(
      "transaction_hash",
      "0xEA5AFF36389C249E3C0AA277FB94F5F58948D28D6DAE07791EF200F01525B493"
    );

    expect(compareAnchorToReference(record).verdict).toBe("MATCHES_VERIFIED_REFERENCE");
    expect(compareAnchorToReference(record2).verdict).toBe("MATCHES_VERIFIED_REFERENCE");
    expect(compareAnchorToReference(record3).verdict).toBe("MATCHES_VERIFIED_REFERENCE");
  });

  it("still detects a real mismatch when casing also differs", () => {
    const comparison = compareAnchorToReference(
      withField("transaction_hash", "0xEA5AFF36389C249E3C0AA277FB94F5F58948D28D6DAE07791EF200F01525B494")
    );
    expect(comparison.verdict).toBe("LIVE_RECORD_DIFFERS");
  });

  it("reports READ_UNAVAILABLE when there is no record", () => {
    expect(compareAnchorToReference(null).verdict).toBe("READ_UNAVAILABLE");
  });

  it("does not describe a difference as tampering", () => {
    const presentation = presentVerdict("LIVE_RECORD_DIFFERS", []);
    expect(presentation.tone).toBe("differs");
    expect(presentation.description).toMatch(/not as evidence of wrongdoing/i);
    expect(presentation.description).not.toMatch(/tamper|fraud|attack/i);
  });
});

describe("hex comparison helpers", () => {
  it("compares 0x-prefixed hex case-insensitively", () => {
    expect(hexSemanticallyEqual("0xAbCd", "0xaBcD")).toBe(true);
    expect(hexSemanticallyEqual("0xAbCd", "0xabcd")).toBe(true);
    expect(hexSemanticallyEqual("0xAbCd", "0xabce")).toBe(false);
  });

  it("falls back to exact comparison for non-hex values", () => {
    expect(hexSemanticallyEqual("VERIFIED", "VERIFIED")).toBe(true);
    expect(hexSemanticallyEqual("VERIFIED", "verified")).toBe(false);
  });

  it("compares digests exactly, without case folding", () => {
    expect(digestEquals("b9163889", "b9163889")).toBe(true);
    expect(digestEquals("b9163889", "B9163889")).toBe(false);
  });
});

describe("malformed live payload handling", () => {
  it("rejects non-object payloads", () => {
    for (const raw of [null, undefined, 42, "anchor", true, [1, 2, 3]]) {
      expect(normalizeAnchorRecord(raw)).toBeNull();
    }
  });

  it("rejects payloads missing required fields", () => {
    for (const field of [
      "anchor_id",
      "claimed_digest",
      "observed_digest",
      "manifest_url",
      "verification_state",
      "recorded_status",
      "observed_status",
      "submitter",
      "reason_code",
      "transaction_hash",
      "observed_transaction_hash",
      "contract_address",
      "observed_contract_address"
    ]) {
      const raw = provenRaw();
      delete raw[field];
      expect(normalizeAnchorRecord(raw), `missing ${field}`).toBeNull();
    }
  });

  it("rejects wrong-typed fields", () => {
    expect(normalizeAnchorRecord({ ...provenRaw(), anchor_id: "1" })).toBeNull();
    expect(normalizeAnchorRecord({ ...provenRaw(), reason_code: 0 })).toBeNull();
    expect(normalizeAnchorRecord({ ...provenRaw(), verification_state: null })).toBeNull();
    expect(normalizeAnchorRecord({ ...provenRaw(), manifest_url: 7 })).toBeNull();
  });

  it("rejects malformed or wrong-width hex values", () => {
    expect(normalizeAnchorRecord({ ...provenRaw(), claimed_digest: "nothex" })).toBeNull();
    expect(normalizeAnchorRecord({ ...provenRaw(), claimed_digest: "A".repeat(64) })).toBeNull();
    expect(normalizeAnchorRecord({ ...provenRaw(), transaction_hash: "0xabc" })).toBeNull();
    expect(normalizeAnchorRecord({ ...provenRaw(), contract_address: `0x${"a".repeat(41)}` })).toBeNull();
    expect(normalizeAnchorRecord({ ...provenRaw(), submitter: "nobody" })).toBeNull();
  });

  it("rejects an invalid anchor id", () => {
    for (const id of [-1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(normalizeAnchorRecord({ ...provenRaw(), anchor_id: id })).toBeNull();
    }
  });

  it("never produces a record with a non-VERIFIED state labelled as verified", () => {
    const record = normalizeAnchorRecord({ ...provenRaw(), verification_state: "" });
    expect(record).toBeNull();
  });
});

describe("deployment and reference constants are exact", () => {
  it("pins the hosted Studionet deployment metadata", () => {
    expect(SCOUT_ANCHOR_NETWORK_NAME).toBe("GenLayer Studionet");
    expect(SCOUT_ANCHOR_CHAIN_ID).toBe(61999);
    expect(SCOUT_ANCHOR_CONTRACT_ADDRESS).toBe(
      "0x246813806cD01d17f2995DAF9e0aCC1DaC31c488"
    );
    expect(SCOUT_ANCHOR_ID).toBe(1);
  });

  it("pins the three known transaction hashes", () => {
    expect(SCOUT_ANCHOR_DEPLOYMENT_TX).toBe(
      "0xb73260af0e5ae5b1e4729dc5017bb8241763097e812d258573cb09fb5e677412"
    );
    expect(SCOUT_ANCHOR_ANCHOR_TX).toBe(
      "0xf34788da4e73e1b46af966c6cdc51132f24ead45f7415da2625261c5c7e8836a"
    );
    expect(SCOUT_ANCHOR_VERIFICATION_TX).toBe(
      "0x39c0e897be9f5be5614330c028a2103eb5d2bcafa5e7c8090e6311fbd25df876"
    );
  });

  it("pins the published manifest URL and expected digest", () => {
    expect(SCOUT_ANCHOR_MANIFEST_URL).toBe(
      "https://github.com/Quenine/GenLayer_Scout/releases/download/v0.3.1/genlayer-scout-v0.3.1-evidence-manifest.json"
    );
    expect(
      compareAnchorToReference(provenRecord()).verdict
    ).toBe("MATCHES_VERIFIED_REFERENCE");
  });

  it("builds explorer links using the verified /tx and /address forms", () => {
    expect(scoutAnchorContractUrl()).toBe(
      "https://explorer-studio.genlayer.com/address/0x246813806cD01d17f2995DAF9e0aCC1DaC31c488"
    );
    expect(scoutAnchorTxUrl(SCOUT_ANCHOR_VERIFICATION_TX)).toBe(
      "https://explorer-studio.genlayer.com/tx/0x39c0e897be9f5be5614330c028a2103eb5d2bcafa5e7c8090e6311fbd25df876"
    );
  });
});
