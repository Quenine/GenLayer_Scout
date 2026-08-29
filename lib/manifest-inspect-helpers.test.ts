import { describe, expect, it } from "vitest";
import {
  MAX_MANIFEST_INSPECT_BYTES,
  isManifestInspectFilenameAccepted,
  isManifestInspectSizeAccepted,
  parseManifestInspectText,
  presentManifestInspection,
  safeExternalLink
} from "@/lib/manifest-inspect-helpers";
import { inspectEvidenceManifestV1 } from "@/lib/evidence-manifest";
import type { EvidenceManifestEnvelopeV1 } from "@/lib/types";

const HASH = `0x${"a".repeat(64)}`;
const ADDRESS = `0x${"b".repeat(40)}`;

function makeEnvelope(): EvidenceManifestEnvelopeV1 {
  return {
    format: "genlayer-scout-evidence-manifest",
    payload: {
      version: 1,
      generator: { name: "GenLayer Scout", version: "0.2.1" },
      contributionContext: {
        category: { id: "projects", name: "Projects" },
        title: "Faucet",
        projectSummary: "A test faucet.",
        genLayerRelevance: "Useful for testing."
      },
      implementationReferences: {
        experimentId: "experiment-1",
        contractName: "Faucet contract",
        studioFileName: "faucet.py",
        deployedContractAddress: ADDRESS,
        transactionHash: HASH,
        repositoryUrl: "https://github.com/owner/repo",
        repositoryCommit: "a".repeat(40),
        deploymentUrl: "https://faucet.vercel.app"
      },
      experimentDetails: {
        status: "finalized",
        notes: "",
        createdAt: "2026-08-10T12:00:00.000Z",
        updatedAt: "2026-08-10T12:00:00.000Z"
      },
      verification: {
        snapshot: { version: 1, transactionHash: HASH, contractAddress: ADDRESS, manualStatus: "finalized" },
        source: "genlayer-rpc",
        rpcUrl: "https://studio.genlayer.com/api",
        rpcProfile: "studionet",
        transactionStatusDialect: "positional",
        receiptCapability: "unsupported",
        contractStateCapability: "unsupported",
        checkedAt: "2026-08-10T12:00:00.000Z",
        transactionFound: true,
        receiptAvailable: false,
        observedStatus: "FINALIZED",
        observedStatusCode: null,
        statusMatchesManual: true,
        observedRecipient: "",
        contractLookup: "not_checked",
        contractStateResult: "",
        result: "verified",
        errorMessage: ""
      },
      supportingEvidence: {
        links: ["https://example.test/result", "ipfs://bafybeigr"],
        whatWasTested: "Faucet withdrawal.",
        knownLimitations: "No rate limiting.",
        nextMilestone: "Add rate limiting.",
        contractAddressNotApplicableReason: "",
        transactionHashNotApplicableReason: ""
      }
    },
    integrity: {
      algorithm: "sha256",
      canonicalization: "genlayer-scout-json-sorted-keys-v1",
      digest: "placeholder"
    }
  };
}

describe("isManifestInspectFilenameAccepted", () => {
  it("accepts .json files", () => {
    expect(isManifestInspectFilenameAccepted("manifest.json")).toBe(true);
    expect(isManifestInspectFilenameAccepted("evidence.manifest.json")).toBe(true);
    expect(isManifestInspectFilenameAccepted("result.JSON")).toBe(true);
  });

  it("rejects unrelated filenames", () => {
    expect(isManifestInspectFilenameAccepted("notes.txt")).toBe(false);
    expect(isManifestInspectFilenameAccepted("manifest.json.backup")).toBe(false);
    expect(isManifestInspectFilenameAccepted("")).toBe(false);
    expect(isManifestInspectFilenameAccepted("manifest")).toBe(false);
  });
});

describe("isManifestInspectSizeAccepted", () => {
  it("accepts non-empty sizes at the boundary", () => {
    expect(isManifestInspectSizeAccepted(1)).toBe(true);
    expect(isManifestInspectSizeAccepted(MAX_MANIFEST_INSPECT_BYTES)).toBe(true);
  });

  it("rejects empty and oversized files", () => {
    expect(isManifestInspectSizeAccepted(0)).toBe(false);
    expect(isManifestInspectSizeAccepted(MAX_MANIFEST_INSPECT_BYTES + 1)).toBe(false);
    expect(isManifestInspectSizeAccepted(-1)).toBe(false);
  });
});

describe("parseManifestInspectText", () => {
  it("parses a valid manifest envelope", () => {
    const result = parseManifestInspectText(JSON.stringify(makeEnvelope()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.envelope.format).toBe("genlayer-scout-evidence-manifest");
    }
  });

  it("rejects empty text", () => {
    const result = parseManifestInspectText("");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("parse-error");
  });

  it("rejects invalid JSON", () => {
    const result = parseManifestInspectText("{ not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("parse-error");
  });

  it("rejects non-envelope JSON", () => {
    const result = parseManifestInspectText(JSON.stringify({ foo: 1 }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("not-envelope");
  });
});

describe("safeExternalLink", () => {
  it("returns https URLs", () => {
    expect(safeExternalLink("https://example.test/a")).toBeTruthy();
  });

  it("rejects non-https schemes and junk", () => {
    expect(safeExternalLink("javascript:alert(1)")).toBeNull();
    expect(safeExternalLink("http://example.test")).toBeNull();
    expect(safeExternalLink("not a url")).toBeNull();
    expect(safeExternalLink("ipfs://bafybeigr")).toBeNull();
    expect(safeExternalLink(123)).toBeNull();
  });
});

describe("presentManifestInspection", () => {
  it("presents a valid manifest with details and correct explanation", () => {
    const text = JSON.stringify(makeEnvelope());
    const parsed = parseManifestInspectText(text);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const result = inspectEvidenceManifestV1(parsed.envelope);

    // Fix the stub digest so the envelope is genuinely valid.
    const envelope = makeEnvelope();
    envelope.integrity.digest = result.computedDigest;
    const validResult = inspectEvidenceManifestV1(envelope);

    const presentation = presentManifestInspection(envelope, validResult);
    expect(presentation.status).toBe("valid");
    expect(presentation.statusLabel).toBe("Valid");
    expect(presentation.canShowDetails).toBe(true);
    expect(presentation.digestMatch).toBe(true);
    expect(presentation.integrity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Digest match", value: "Match" })
      ])
    );
    expect(presentation.contribution).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Title" })
      ])
    );
  });

  it("presents a modified manifest without calling it valid", () => {
    const envelope = makeEnvelope();
    const parsed = parseManifestInspectText(JSON.stringify(envelope));
    if (!parsed.ok) return;

    // Force a digest mismatch to a structurally valid payload.
    envelope.integrity.digest = "0".repeat(64);
    const modified = inspectEvidenceManifestV1(envelope);

    const presentation = presentManifestInspection(envelope, modified);
    expect(presentation.status).toBe("modified");
    expect(presentation.statusLabel).toBe("Modified");
    expect(presentation.canShowDetails).toBe(true);
    expect(presentation.digestMatch).toBe(false);
    expect(presentation.integrity).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Digest match", value: "Mismatch" })
      ])
    );
  });

  it("hides nested details for a structurally invalid manifest", () => {
    const base = makeEnvelope();
    const invalidEnvelope: EvidenceManifestEnvelopeV1 = {
      ...base,
      payload: {
        ...base.payload,
        contributionContext: {
          ...(base.payload.contributionContext as object),
          title: 123
        } as EvidenceManifestEnvelopeV1["payload"]["contributionContext"]
      }
    };
    const result = inspectEvidenceManifestV1(invalidEnvelope);
    expect(result.status).toBe("invalid");

    const presentation = presentManifestInspection(invalidEnvelope, result);
    expect(presentation.canShowDetails).toBe(false);
    expect(presentation.contribution).toHaveLength(0);
    expect(presentation.safeErrors.length).toBeGreaterThan(0);
  });
});
