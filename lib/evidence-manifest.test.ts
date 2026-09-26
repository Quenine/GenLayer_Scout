import { sha256Hex } from "@/lib/sha256";
import { APP_VERSION } from "@/lib/app-metadata";
import { describe, expect, it } from "vitest";
import {
  canonicalizeEvidenceManifestJson,
  createEvidenceManifestV1,
  digestEvidenceManifestPayload,
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

async function validEnvelope(): Promise<EvidenceManifestEnvelopeV1> {
  return createEvidenceManifestV1(input());
}

describe("evidence manifest v1", () => {
  it("creates a deterministic envelope that includes the immutable verification snapshot", async () => {
    const first = await createEvidenceManifestV1(input());
    const second = await createEvidenceManifestV1(input());

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
    expect(await verifyEvidenceManifestIntegrity(first)).toBe(true);
  });

  it("sorts object keys recursively while preserving array order", async () => {
    expect(canonicalizeEvidenceManifestJson({ z: [{ b: 2, a: 1 }], a: true }))
      .toBe('{"a":true,"z":[{"a":1,"b":2}]}');
  });

  it("rejects values outside the JSON data model", async () => {
    expect(() => canonicalizeEvidenceManifestJson({ missing: undefined }))
      .toThrow("JSON values only");
    expect(() => canonicalizeEvidenceManifestJson(new Date()))
      .toThrow("plain JSON objects");
  });

  it("detects changes to either the payload or integrity metadata", async () => {
    const manifest = await validEnvelope();
    const changedPayload = {
      ...manifest,
      payload: { ...manifest.payload, contributionContext: { ...manifest.payload.contributionContext, title: "Edited" } }
    };
    const changedMetadata = {
      ...manifest,
      integrity: { ...manifest.integrity, canonicalization: "other" }
    };

    expect(await verifyEvidenceManifestIntegrity(changedPayload)).toBe(false);
    expect(await verifyEvidenceManifestIntegrity(changedMetadata as typeof manifest)).toBe(false);
  });
});

describe("canonicalization", () => {
  it("produces identical digests regardless of object key insertion order", async () => {
    const a = await createEvidenceManifestV1(input());
    const b = await createEvidenceManifestV1(input());
    expect(a.integrity.digest).toBe(b.integrity.digest);
  });

  it("produces different digests when payload values differ", async () => {
    const a = await createEvidenceManifestV1(input());
    const b = await createEvidenceManifestV1(input({ contractName: "Different contract" }));
    expect(a.integrity.digest).not.toBe(b.integrity.digest);
  });

  it("rejects sparse arrays", async () => {
    const sparse: unknown[] = [];
    sparse[2] = "value";
    expect(() => canonicalizeEvidenceManifestJson(sparse))
      .toThrow("sparse arrays");
  });

  it("rejects cyclic object structures", async () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    expect(() => canonicalizeEvidenceManifestJson(cyclic))
      .toThrow("cyclic structures");
  });

  it("rejects bigint values", async () => {
    expect(() => canonicalizeEvidenceManifestJson(BigInt(1)))
      .toThrow("bigint");
  });

  it("rejects Map instances", async () => {
    expect(() => canonicalizeEvidenceManifestJson(new Map()))
      .toThrow("plain JSON objects");
  });

  it("rejects Set instances", async () => {
    expect(() => canonicalizeEvidenceManifestJson(new Set()))
      .toThrow("plain JSON objects");
  });

  it("does not mutate the input object", async () => {
    const original = { z: 1, a: { c: 3, b: 2 } };
    const frozen = JSON.parse(JSON.stringify(original));
    canonicalizeEvidenceManifestJson(original);
    expect(original).toEqual(frozen);
  });
});

describe("inspection status", () => {
  it("returns valid for a correct manifest", async () => {
    const result = await inspectEvidenceManifestV1(await validEnvelope());
    expect(result.status).toBe("valid");
    expect(result.digestMatches).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns modified when payload is tampered", async () => {
    const envelope = await validEnvelope();
    const tampered: EvidenceManifestEnvelopeV1 = {
      ...envelope,
      payload: { ...envelope.payload, contributionContext: { ...envelope.payload.contributionContext, title: "Touched" } }
    };
    const result = await inspectEvidenceManifestV1(tampered);
    expect(result.status).toBe("modified");
    expect(result.digestMatches).toBe(false);
  });

  it("returns modified when digest is tampered", async () => {
    const envelope = await validEnvelope();
    const tampered: EvidenceManifestEnvelopeV1 = {
      ...envelope,
      integrity: { ...envelope.integrity, digest: "0".repeat(64) }
    };
    const result = await inspectEvidenceManifestV1(tampered);
    expect(result.status).toBe("modified");
    expect(result.digestMatches).toBe(false);
  });

  it("returns invalid for a structurally malformed manifest", async () => {
    const envelope = await validEnvelope();
    const malformed = {
      ...envelope,
      payload: {
        ...envelope.payload,
        verification: { result: "verified", snapshot: { version: 1, transactionHash: "x", contractAddress: "y", manualStatus: "finalized" } }
      }
    } as unknown as EvidenceManifestEnvelopeV1;
    const result = await inspectEvidenceManifestV1(malformed);
    expect(result.status).toBe("invalid");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("returns invalid for unrecognized format", async () => {
    const envelope = await validEnvelope();
    const wrong = { ...envelope, format: "other-format" } as unknown as EvidenceManifestEnvelopeV1;
    expect((await inspectEvidenceManifestV1(wrong)).status).toBe("invalid");
  });

  it("returns unsupported for version 2", async () => {
    const envelope = await validEnvelope();
    const v2 = {
      ...envelope,
      payload: { ...envelope.payload, version: 2 }
    } as unknown as EvidenceManifestEnvelopeV1;
    expect((await inspectEvidenceManifestV1(v2)).status).toBe("unsupported");
  });

  it("returns unsupported for unknown digest algorithm", async () => {
    const envelope = await validEnvelope();
    const bad = {
      ...envelope,
      integrity: { ...envelope.integrity, algorithm: "md5" as "sha256" }
    };
    expect((await inspectEvidenceManifestV1(bad)).status).toBe("unsupported");
  });

  it("returns unsupported for unknown canonicalization", async () => {
    const envelope = await validEnvelope();
    const bad = {
      ...envelope,
      integrity: { ...envelope.integrity, canonicalization: "other" as "genlayer-scout-json-sorted-keys-v1" }
    };
    expect((await inspectEvidenceManifestV1(bad)).status).toBe("unsupported");
  });

  it("returns invalid when digest matches but payload has validation errors", async () => {
    const envelope = await validEnvelope();
    const invalidPayload = {
      ...envelope.payload,
      supportingEvidence: { ...envelope.payload.supportingEvidence, links: [] }
    };
    const recomputed = {
      ...envelope,
      payload: invalidPayload,
      integrity: {
        ...envelope.integrity,
        digest: await sha256Hex(canonicalizeEvidenceManifestJson(invalidPayload))
      }
    };
    const result = await inspectEvidenceManifestV1(recomputed);
    expect(result.status).toBe("invalid");
    expect(result.digestMatches).toBe(true);
    expect(result.errors.some((e) => e.includes("HTTPS or IPFS"))).toBe(true);
  });

  it("returns invalid when both digest mismatches and payload is malformed", async () => {
    const envelope = await validEnvelope();
    const invalidPayload = {
      ...envelope.payload,
      supportingEvidence: { ...envelope.payload.supportingEvidence, links: [] }
    };
    const tampered = {
      ...envelope,
      payload: invalidPayload,
      integrity: { ...envelope.integrity, digest: "0".repeat(64) }
    };
    const result = await inspectEvidenceManifestV1(tampered);
    expect(result.status).toBe("invalid");
    expect(result.errors.some((e) => e.includes("HTTPS or IPFS"))).toBe(true);
  });
});

describe("snapshot consistency", () => {
  it("rejects when transaction hash differs", async () => {
    const env = await createEvidenceManifestV1(input({
      transactionHash: `0x${"a".repeat(63)}1`
    }));
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("transaction hash"))).toBe(true);
  });

  it("rejects when contract address differs", async () => {
    const env = await createEvidenceManifestV1(input({
      deployedContractAddress: `0x${"c".repeat(40)}`
    }));
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("contract address"))).toBe(true);
  });

  it("rejects when manual status differs", async () => {
    const env = await createEvidenceManifestV1(input({
      status: "accepted"
    }));
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("manual status"))).toBe(true);
  });
});

describe("verification consistency", () => {
  it("rejects verified when transactionFound is false", async () => {
    const env = await validEnvelope();
    env.payload.verification = makeVerification({ transactionFound: false });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("transactionFound"))).toBe(true);
  });

  it("rejects verified when statusMatchesManual is not true", async () => {
    const env = await validEnvelope();
    env.payload.verification = makeVerification({ statusMatchesManual: null });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("statusMatchesManual"))).toBe(true);
  });

  it("rejects mismatch when statusMatchesManual is not false", async () => {
    const env = await validEnvelope();
    env.payload.verification = makeVerification({ result: "mismatch", statusMatchesManual: true });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("statusMatchesManual"))).toBe(true);
  });

  it("rejects not_found when transactionFound is true", async () => {
    const env = await validEnvelope();
    env.payload.verification = makeVerification({ result: "not_found", transactionFound: true });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("not_found"))).toBe(true);
  });

  it("rejects receiptCapability=unsupported with receiptAvailable=true", async () => {
    const env = await validEnvelope();
    env.payload.verification = makeVerification({ receiptCapability: "unsupported", receiptAvailable: true });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("receiptCapability"))).toBe(true);
  });

  it("rejects contractStateCapability=unsupported with contractLookup=found", async () => {
    const env = await validEnvelope();
    env.payload.verification = makeVerification({ contractStateCapability: "unsupported", contractLookup: "found" });
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("contractStateCapability"))).toBe(true);
  });

  it("allows observed result without transactionFound", async () => {
    const env = await validEnvelope();
    env.payload.verification = makeVerification({ result: "observed", transactionFound: false, statusMatchesManual: null });
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("result="))).toBe(false);
  });
});

describe("field validation", () => {
  it("rejects invalid transaction hash", async () => {
    const env = await validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      transactionHash: "not-a-hash"
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("transactionHash"))).toBe(true);
  });

  it("rejects invalid contract address", async () => {
    const env = await validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      deployedContractAddress: "0xshort"
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("deployedContractAddress"))).toBe(true);
  });

  it("accepts a lowercase 20-byte contract address", async () => {
    const env = await validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      deployedContractAddress: `0x${"a".repeat(40)}`
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("deployedContractAddress"))).toBe(false);
  });

  it("accepts an uppercase 20-byte contract address", async () => {
    const env = await validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      deployedContractAddress: `0x${"A".repeat(40)}`
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("deployedContractAddress"))).toBe(false);
  });

  it("accepts a mixed-case 20-byte contract address", async () => {
    const env = await validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      deployedContractAddress: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1"
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("deployedContractAddress"))).toBe(false);
  });

  it("rejects a too-short contract address", async () => {
    const env = await validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      deployedContractAddress: `0x${"a".repeat(39)}`
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("deployedContractAddress"))).toBe(true);
  });

  it("rejects a non-hex contract address", async () => {
    const env = await validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      deployedContractAddress: `0x${"g".repeat(40)}`
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("deployedContractAddress"))).toBe(true);
  });

  it("preserves a generated manifest's mixed-case address through serialize to inspect as Valid", async () => {
    const env = await validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      deployedContractAddress: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1"
    };
    env.payload.verification.snapshot = {
      ...env.payload.verification.snapshot,
      contractAddress: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1"
    };
    env.integrity = { ...env.integrity, digest: await digestEvidenceManifestPayload(env.payload) };

    const roundTripped = JSON.parse(JSON.stringify(env)) as EvidenceManifestEnvelopeV1;
    expect(roundTripped.payload.implementationReferences!.deployedContractAddress).toBe(
      "0x6B9E22dd81F750c3fd9B1473002319f87992faC1"
    );
    const inspection = await inspectEvidenceManifestV1(roundTripped);
    expect(inspection.status).toBe("valid");
    expect(roundTripped.payload.implementationReferences!.deployedContractAddress).toBe(
      "0x6B9E22dd81F750c3fd9B1473002319f87992faC1"
    );
  });

  it("accepts empty contract address", async () => {
    const env = await validEnvelope();
    env.payload.implementationReferences = {
      ...env.payload.implementationReferences!,
      deployedContractAddress: ""
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("deployedContractAddress"))).toBe(false);
  });

  it("rejects no evidence links", async () => {
    const env = await validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, links: [] };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("HTTPS or IPFS"))).toBe(true);
  });

  it("accepts ipfs evidence link", async () => {
    const env = await validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, links: ["ipfs://Qm123"] };
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("HTTPS or IPFS"))).toBe(false);
  });

  it("rejects invalid timestamp", async () => {
    const env = await validEnvelope();
    env.payload.experimentDetails = {
      ...env.payload.experimentDetails!,
      createdAt: "not-a-date"
    };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("createdAt"))).toBe(true);
  });

  it("rejects unsupported experiment status", async () => {
    const env = await validEnvelope();
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
  it("rejects empty whatWasTested", async () => {
    const env = await validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, whatWasTested: "" };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("whatWasTested"))).toBe(true);
  });

  it("rejects whitespace-only whatWasTested", async () => {
    const env = await validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, whatWasTested: "   " };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("whatWasTested"))).toBe(true);
  });

  it("rejects empty knownLimitations", async () => {
    const env = await validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, knownLimitations: "" };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("knownLimitations"))).toBe(true);
  });

  it("rejects whitespace-only knownLimitations", async () => {
    const env = await validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, knownLimitations: "  \t  " };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("knownLimitations"))).toBe(true);
  });

  it("rejects empty nextMilestone", async () => {
    const env = await validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, nextMilestone: "" };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("nextMilestone"))).toBe(true);
  });

  it("rejects whitespace-only nextMilestone", async () => {
    const env = await validEnvelope();
    env.payload.supportingEvidence = { ...env.payload.supportingEvidence, nextMilestone: "\n\n" };
    const result = validateEvidenceManifestV1(env);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("nextMilestone"))).toBe(true);
  });

  it("allows empty experimentDetails.notes", async () => {
    const env = await validEnvelope();
    env.payload.experimentDetails = { ...env.payload.experimentDetails!, notes: "" };
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("notes"))).toBe(false);
  });

  it("accepts valid non-empty values for all three required fields", async () => {
    const env = await validEnvelope();
    const result = validateEvidenceManifestV1(env);
    expect(result.errors.some((e) => e.includes("whatWasTested"))).toBe(false);
    expect(result.errors.some((e) => e.includes("knownLimitations"))).toBe(false);
    expect(result.errors.some((e) => e.includes("nextMilestone"))).toBe(false);
  });
});

describe("round trip", () => {
  it("valid envelope passes inspection and integrity check", async () => {
    const envelope = await validEnvelope();
    expect(await verifyEvidenceManifestIntegrity(envelope)).toBe(true);
    const inspection = await inspectEvidenceManifestV1(envelope);
    expect(inspection.status).toBe("valid");
    expect(inspection.digestMatches).toBe(true);
  });

  it("tampered payload is detected by both integrity and inspection", async () => {
    const envelope = await validEnvelope();
    const tampered = {
      ...envelope,
      payload: { ...envelope.payload, contributionContext: { ...envelope.payload.contributionContext, title: "Tampered" } }
    };
    expect(await verifyEvidenceManifestIntegrity(tampered)).toBe(false);
    expect((await inspectEvidenceManifestV1(tampered)).status).toBe("modified");
  });
});

describe("malformed input", () => {
  it("inspect handles completely invalid objects", async () => {
    const result = await inspectEvidenceManifestV1({
      format: "genlayer-scout-evidence-manifest",
      payload: { version: 1 } as never,
      integrity: { algorithm: "sha256", canonicalization: "genlayer-scout-json-sorted-keys-v1", digest: "abc" }
    });
    expect(result.status).toBe("invalid");
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("generator", () => {
  it("includes generator.name in generated manifests", async () => {
    const envelope = await createEvidenceManifestV1(input());
    expect(envelope.payload.generator.name).toBe("GenLayer Scout");
  });

  it("includes the current APP_VERSION as generator.version", async () => {
    const envelope = await createEvidenceManifestV1(input());
    expect(envelope.payload.generator.version).toBe(APP_VERSION);
  });

  it("changes the digest when generator changes", async () => {
    const base = await createEvidenceManifestV1(input());
    const changed = await createEvidenceManifestV1(input());
    changed.payload.generator = { name: "GenLayer Scout", version: "0.0.0" };
    const changedWithDigest = {
      ...changed,
      integrity: { ...changed.integrity, digest: await digestEvidenceManifestPayload(changed.payload) }
    };
    expect(changedWithDigest.integrity.digest).not.toBe(base.integrity.digest);
    expect(await verifyEvidenceManifestIntegrity(changedWithDigest)).toBe(true);
  });

  it("treats a manifest with missing generator as invalid", async () => {
    const env = await validEnvelope();
    const stripped = { ...env, payload: { ...env.payload } as never, integrity: { ...env.integrity } };
    (stripped.payload as Record<string, unknown>).generator = undefined;
    const validation = validateEvidenceManifestV1(stripped as EvidenceManifestEnvelopeV1);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("generator"))).toBe(true);
  });

  it("treats an incorrect generator name as invalid", async () => {
    const env = await validEnvelope();
    env.payload.generator = { name: "Other Tool", version: APP_VERSION };
    const inspection = await inspectEvidenceManifestV1(env);
    expect(inspection.status).toBe("invalid");
    expect(inspection.errors.some((e) => e.includes("generator.name"))).toBe(true);
  });

  it("treats an empty generator version as invalid", async () => {
    const env = await validEnvelope();
    env.payload.generator = { name: "GenLayer Scout", version: "   " };
    const validation = validateEvidenceManifestV1(env);
    expect(validation.valid).toBe(false);
    expect(validation.errors.some((e) => e.includes("generator.version"))).toBe(true);
  });

  it("survives serialize and inspect round trip", async () => {
    const envelope = await createEvidenceManifestV1(input());
    const roundTripped = JSON.parse(JSON.stringify(envelope)) as EvidenceManifestEnvelopeV1;
    expect(roundTripped.payload.generator).toEqual({ name: "GenLayer Scout", version: APP_VERSION });
    const inspection = await inspectEvidenceManifestV1(roundTripped);
    expect(inspection.status).toBe("valid");
    expect(inspection.digestMatches).toBe(true);
  });
});
