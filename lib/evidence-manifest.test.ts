import { sha256Hex } from "@/lib/sha256";
import { describe, expect, it } from "vitest";
import {
  canonicalizeEvidenceManifestJson,
  createEvidenceManifestV1,
  inspectEvidenceManifestV1,
  validateEvidenceManifestV1,
  verifyEvidenceManifestIntegrity
} from "@/lib/evidence-manifest";
import { createEmptyWorkspace } from "@/lib/seed-data";
import type { ContractExperiment, EvidenceManifestEnvelopeV1, ExperimentVerification } from "@/lib/types";

const HASH = `0x${"a".repeat(64)}`;
const ADDRESS = `0x${"b".repeat(40)}`;

function makeVerification(overrides: Partial<ExperimentVerification> = {}): ExperimentVerification {
  return {
    snapshot: { version: 1, transactionHash: HASH, contractAddress: ADDRESS, manualStatus: "finalized" },
    source: "genlayer-rpc",
    rpcUrl: "https://studio.genlayer.com/api",
    rpcProfile: "studionet",
    transactionStatusDialect: "positional",
    receiptCapability: "unsupported",
    contractStateCapability: "unsupported",
    checkedAt: "2026-08-01T00:00:00.000Z",
    transactionFound: true,
    receiptAvailable: false,
    observedStatus: "FINALIZED",
    observedStatusCode: null,
    statusMatchesManual: true,
    observedRecipient: "",
    contractLookup: "not_checked",
    contractStateResult: "",
    result: "verified",
    errorMessage: "",
    ...overrides
  };
}

function makeExperiment(overrides: Partial<ContractExperiment> = {}): ContractExperiment {
  return {
    id: "experiment-1",
    contractName: "Manifest contract",
    studioFileName: "manifest.py",
    deployedContractAddress: ADDRESS,
    transactionHash: HASH,
    status: "finalized",
    experimentNotes: "Checked final lifecycle status.",
    evidenceUrl: "https://example.test/result",
    portalSubmissionNotes: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    verification: makeVerification(),
    ...overrides
  };
}

function input(experimentOverrides?: Partial<ContractExperiment>) {
  const workspace = createEmptyWorkspace();
  return {
    evidencePack: {
      ...workspace.evidencePack,
      title: "Evidence Manifest",
      projectSummary: "Portable evidence record.",
      genLayerRelevance: "Preserves verification context.",
      whatWasTested: "Lifecycle status.",
      knownLimitations: "None currently identified.",
      nextMilestone: "Portal submission.",
      additionalEvidenceLinks: " https://example.test/repository \nhttps://example.test/test-log "
    },
    contributionLane: { ...workspace.contributionLanes[0], status: "building" as const },
    experiment: makeExperiment(experimentOverrides)
  };
}

function validEnvelope(): EvidenceManifestEnvelopeV1 {
  return createEvidenceManifestV1(input());
}

describe("evidence manifest v1", () => {
  it("creates a deterministic envelope that includes the immutable verification snapshot", () => {
    const first = createEvidenceManifestV1(input());
    const second = createEvidenceManifestV1(input());

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      format: "genlayer-scout-evidence-manifest",
      payload: {
        version: 1,
        verification: { snapshot: makeVerification().snapshot },
        supportingEvidence: {
          links: [
            "https://example.test/result",
            "https://example.test/repository",
            "https://example.test/test-log"
          ]
        }
      },
      integrity: {
        algorithm: "sha256",
        canonicalization: "genlayer-scout-json-sorted-keys-v1"
      }
    });
    expect(first.integrity.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(verifyEvidenceManifestIntegrity(first)).toBe(true);
  });

  it("sorts object keys recursively while preserving array order", () => {
    expect(canonicalizeEvidenceManifestJson({ z: [{ b: 2, a: 1 }], a: true }))
      .toBe('{"a":true,"z":[{"a":1,"b":2}]}');
  });

  it("rejects values outside the JSON data model", () => {
    expect(() => canonicalizeEvidenceManifestJson({ missing: undefined }))
      .toThrow("JSON values only");
    expect(() => canonicalizeEvidenceManifestJson(new Date()))
      .toThrow("plain JSON objects");
  });

  it("detects changes to either the payload or integrity metadata", () => {
    const manifest = validEnvelope();
    const changedPayload = {
      ...manifest,
      payload: { ...manifest.payload, contributionContext: { ...manifest.payload.contributionContext, title: "Edited" } }
    };
    const changedMetadata = {
      ...manifest,
      integrity: { ...manifest.integrity, canonicalization: "other" }
    };

    expect(verifyEvidenceManifestIntegrity(changedPayload)).toBe(false);
    expect(verifyEvidenceManifestIntegrity(changedMetadata as typeof manifest)).toBe(false);
  });
});

describe("canonicalization", () => {
  it("produces identical digests regardless of object key insertion order", () => {
    const a = createEvidenceManifestV1(input());
    const b = createEvidenceManifestV1(input());
    expect(a.integrity.digest).toBe(b.integrity.digest);
  });

  it("produces different digests when payload values differ", () => {
    const a = createEvidenceManifestV1(input());
    const b = createEvidenceManifestV1(input({ contractName: "Different contract" }));
    expect(a.integrity.digest).not.toBe(b.integrity.digest);
  });

  it("rejects sparse arrays", () => {
    const sparse: unknown[] = [];
    sparse[2] = "value";
    expect(() => canonicalizeEvidenceManifestJson(sparse))
      .toThrow("sparse arrays");
  });

  it("rejects cyclic object structures", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(() => canonicalizeEvidenceManifestJson(cyclic))
      .toThrow("cyclic structures");
  });

  it("rejects bigint values", () => {
    expect(() => canonicalizeEvidenceManifestJson(BigInt(1)))
      .toThrow("bigint");
  });

  it("rejects Map instances", () => {
    expect(() => canonicalizeEvidenceManifestJson(new Map()))
      .toThrow("plain JSON objects");
  });

  it("rejects Set instances", () => {
    expect(() => canonicalizeEvidenceManifestJson(new Set()))
      .toThrow("plain JSON objects");
  });

  it("does not mutate the input object", () => {
    const original = { z: 1, a: { c: 3, b: 2 } };
    const frozen = JSON.parse(JSON.stringify(original));
    canonicalizeEvidenceManifestJson(original);
    expect(original).toEqual(frozen);
  });
});

describe("inspection status", () => {
  it("returns valid for a correct manifest", () => {
    const result = inspectEvidenceManifestV1(validEnvelope());
    expect(result.status).toBe("valid");
    expect(result.digestMatches).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns modified when payload is tampered", () => {
    const envelope = validEnvelope();
    const tampered: EvidenceManifestEnvelopeV1 = {
      ...envelope,
      payload: { ...envelope.payload, contributionContext: { ...envelope.payload.contributionContext, title: "Touched" } }
    };
    const result = inspectEvidenceManifestV1(tampered);
    expect(result.status).toBe("modified");
    expect(result.digestMatches).toBe(false);
  });

  it("returns modified when digest is tampered", () => {
    const envelope = validEnvelope();
    const tampered: EvidenceManifestEnvelopeV1 = {
      ...envelope,
      integrity: { ...envelope.integrity, digest: "0".repeat(64) }
    };
    const result = inspectEvidenceManifestV1(tampered);
    expect(result.status).toBe("modified");
    expect(result.digestMatches).toBe(false);
  });

  it("returns invalid for a structurally malformed manifest", () => {
    const envelope = validEnvelope();
    const malformed = {
      ...envelope,
      payload: {
        ...envelope.payload,
        verification: { result: "verified", snapshot: { version: 1, transactionHash: "x", contractAddress: "y", manualStatus: "finalized" } }
      }
    } as unknown as EvidenceManifestEnvelopeV1;
    const result = inspectEvidenceManifestV1(malformed);
    expect(result.status).toBe("invalid");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns invalid for unrecognized format", () => {
    const envelope = validEnvelope();
    const wrong = { ...envelope, format: "other-format" } as unknown as EvidenceManifestEnvelopeV1;
    expect(inspectEvidenceManifestV1(wrong).status).toBe("invalid");
  });

  it("returns unsupported for version 2", () => {
    const envelope = validEnvelope();
    const v2 = {
      ...envelope,
      payload: { ...envelope.payload, version: 2 }
    } as unknown as EvidenceManifestEnvelopeV1;
    expect(inspectEvidenceManifestV1(v2).status).toBe("unsupported");
  });

  it("returns unsupported for unknown digest algorithm", () => {
    const envelope = validEnvelope();
    const bad = {
      ...envelope,
      integrity: { ...envelope.integrity, algorithm: "md5" as "sha256" }
    };
    expect(inspectEvidenceManifestV1(bad).status).toBe("unsupported");
  });

  it("returns unsupported for unknown canonicalization", () => {
    const envelope = validEnvelope();
    const bad = {
      ...envelope,
      integrity: { ...envelope.integrity, canonicalization: "other" as "genlayer-scout-json-sorted-keys-v1" }
    };
    expect(inspectEvidenceManifestV1(bad).status).toBe("unsupported");
  });

  it("returns invalid when digest matches but payload has validation errors", () => {
    const envelope = validEnvelope();
    const invalidPayload = {
      ...envelope.payload,
      supportingEvidence: { ...envelope.payload.supportingEvidence, links: [] }
    };
    const recomputed = {
      ...envelope,
      payload: invalidPayload,
      integrity: {
        ...envelope.integrity,
        digest: sha256Hex(canonicalizeEvidenceManifestJson(invalidPayload))
      }
    };
    const result = inspectEvidenceManifestV1(recomputed);
    expect(result.status).toBe("invalid");
    expect(result.digestMatches).toBe(true);
    expect(result.errors.some((e) => e.includes("HTTPS or IPFS"))).toBe(true);
  });

  it("returns invalid when both digest mismatches and payload is malformed", () => {
    const envelope = validEnvelope();
    const invalidPayload = {
      ...envelope.payload,
      supportingEvidence: { ...envelope.payload.supportingEvidence, links: [] }
    };
    const tampered = {
      ...envelope,
      payload: invalidPayload,
      integrity: { ...envelope.integrity, digest: "0".repeat(64) }
    };
    const result = inspectEvidenceManifestV1(tampered);
    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("HTTPS or IPFS"))).toBe(true);
  });
});

describe("snapshot consistency", () => {
  it("rejects when transaction hash differs", () => {
    const env = createEvidenceManifestV1(input({
      transactionHash: `0x${"a".repeat(63)}1`
    }));
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("transaction hash"))).toBe(true);
  });

  it("rejects when contract address differs", () => {
    const env = createEvidenceManifestV1(input({
      deployedContractAddress: `0x${"c".repeat(40)}`
    }));
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("contract address"))).toBe(true);
  });

  it("rejects when manual status differs", () => {
    const env = createEvidenceManifestV1(input({
      status: "accepted"
    }));
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("manual status"))).toBe(true);
  });
});

describe("verification consistency", () => {
  it("rejects verified when transactionFound is false", () => {
    const env = validEnvelope();
    env.payload.verification = makeVerification({ transactionFound: false });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("transactionFound"))).toBe(true);
  });

  it("rejects verified when statusMatchesManual is not true", () => {
    const env = validEnvelope();
    env.payload.verification = makeVerification({ statusMatchesManual: null });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("statusMatchesManual"))).toBe(true);
  });

  it("rejects mismatch when statusMatchesManual is not false", () => {
    const env = validEnvelope();
    env.payload.verification = makeVerification({ result: "mismatch", statusMatchesManual: true });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("statusMatchesManual"))).toBe(true);
  });

  it("rejects not_found when transactionFound is true", () => {
    const env = validEnvelope();
    env.payload.verification = makeVerification({ result: "not_found", transactionFound: true });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("not_found"))).toBe(true);
  });

  it("rejects receiptCapability=unsupported with receiptAvailable=true", () => {
    const env = validEnvelope();
    env.payload.verification = makeVerification({ receiptCapability: "unsupported", receiptAvailable: true });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("receiptCapability"))).toBe(true);
  });

  it("rejects contractStateCapability=unsupported with contractLookup=found", () => {
    const env = validEnvelope();
    env.payload.verification = makeVerification({ contractStateCapability: "unsupported", contractLookup: "found" });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("contractStateCapability"))).toBe(true);
  });

  it("allows observed result without transactionFound", () => {
    const env = validEnvelope();
    env.payload.verification = makeVerification({ result: "observed", transactionFound: false, statusMatchesManual: null });
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("result="))).toBe(false);
  });
});

describe("field validation", () => {
  it("rejects invalid transaction hash", () => {
    const env = validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      transactionHash: "not-a-hash"
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("transactionHash"))).toBe(true);
  });

  it("rejects invalid contract address", () => {
    const env = validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      deployedContractAddress: "0xshort"
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("deployedContractAddress"))).toBe(true);
  });

  it("accepts empty contract address", () => {
    const env = validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      deployedContractAddress: ""
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("deployedContractAddress"))).toBe(false);
  });

  it("rejects no evidence links", () => {
    const env = validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, links: [] };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("HTTPS or IPFS"))).toBe(true);
  });

  it("accepts ipfs evidence link", () => {
    const env = validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, links: ["ipfs://Qm123"] };
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("HTTPS or IPFS"))).toBe(false);
  });

  it("rejects invalid timestamp", () => {
    const env = validEnvelope();
    env.payload.experimentDetails = {
      ...env.payload.experimentDetails!,
      createdAt: "not-a-date"
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("createdAt"))).toBe(true);
  });

  it("rejects unsupported experiment status", () => {
    const env = validEnvelope();
    env.payload.experimentDetails = {
      ...env.payload.experimentDetails!,
      status: "bogus" as "finalized"
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("status"))).toBe(true);
  });
});

describe("required supporting evidence text fields", () => {
  it("rejects empty whatWasTested", () => {
    const env = validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, whatWasTested: "" };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("whatWasTested"))).toBe(true);
  });

  it("rejects whitespace-only whatWasTested", () => {
    const env = validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, whatWasTested: "   " };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("whatWasTested"))).toBe(true);
  });

  it("rejects empty knownLimitations", () => {
    const env = validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, knownLimitations: "" };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("knownLimitations"))).toBe(true);
  });

  it("rejects whitespace-only knownLimitations", () => {
    const env = validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, knownLimitations: "  \t  " };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("knownLimitations"))).toBe(true);
  });

  it("rejects empty nextMilestone", () => {
    const env = validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, nextMilestone: "" };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("nextMilestone"))).toBe(true);
  });

  it("rejects whitespace-only nextMilestone", () => {
    const env = validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, nextMilestone: "\n\n" };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("nextMilestone"))).toBe(true);
  });

  it("allows empty experimentDetails.notes", () => {
    const env = validEnvelope();
    env.payload.experimentDetails = { ...env.payload.experimentDetails!, notes: "" };
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("notes"))).toBe(false);
  });

  it("accepts valid non-empty values for all three required fields", () => {
    const env = validEnvelope();
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("whatWasTested"))).toBe(false);
    expect(result.errors.some((e) => e.includes("knownLimitations"))).toBe(false);
    expect(result.errors.some((e) => e.includes("nextMilestone"))).toBe(false);
  });
});

describe("round trip", () => {
  it("valid envelope passes inspection and integrity check", () => {
    const envelope = validEnvelope();
    expect(verifyEvidenceManifestIntegrity(envelope)).toBe(true);
    const inspection = inspectEvidenceManifestV1(envelope);
    expect(inspection.status).toBe("valid");
    expect(inspection.digestMatches).toBe(true);
  });

  it("tampered payload is detected by both integrity and inspection", () => {
    const envelope = validEnvelope();
    const tampered = {
      ...envelope,
      payload: { ...envelope.payload, contributionContext: { ...envelope.payload.contributionContext, title: "Tampered" } }
    };
    expect(verifyEvidenceManifestIntegrity(tampered)).toBe(false);
    expect(inspectEvidenceManifestV1(tampered).status).toBe("modified");
  });
});

describe("malformed input", () => {
  it("inspect handles completely invalid objects", () => {
    const result = inspectEvidenceManifestV1({
      format: "genlayer-scout-evidence-manifest",
      payload: { version: 1 } as never,
      integrity: { algorithm: "sha256", canonicalization: "genlayer-scout-json-sorted-keys-v1", digest: "abc" }
    });
    expect(result.status).toBe("invalid");
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
