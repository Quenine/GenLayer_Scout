import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  canonicalizeEvidenceManifestJson,
  createEvidenceManifestV1,
  digestEvidenceManifestPayload,
  inspectEvidenceManifestV1,
  verifyEvidenceManifestIntegrity
} from "@/lib/evidence-manifest";
import { createEmptyWorkspace } from "@/lib/seed-data";
import type { EvidenceManifestEnvelopeV1 } from "@/lib/types";

const FIXTURE_DIR = path.resolve(__dirname, "..", "tests", "fixtures", "evidence-manifest");

/**
 * Golden digests for the ScoutEvidenceAnchor fixtures. These are the external
 * contract-side reference values, established with Node's `node:crypto` and
 * reproduced independently by `contracts/scout_evidence_anchor.py`. They are
 * hard-coded on purpose: the point of this suite is to detect drift between the
 * browser implementation, Node, and the contract, so nothing here may be
 * derived from Scout's own hash function.
 */
const GOLDEN_DIGESTS: Record<string, string> = {
  "verified.json": "041c5603ac42c99de7a0331f2e0f09ba0467b7963b76cab5aecfe9a6ddda8321",
  "mixed-case.json": "8d4913e76c34ee7e62441a2203e4b904f04841810a9d331b9600e6e7b50ca48f",
  "unicode.json": "ad7aff059bd82f8a8145b64d025ea22cf94dc389939b46d7af8d6f92f8ba7c60",
  "no-experiment.json": "36accee46c1cb91aff429ccfbc7edd168ff8e4cc86bd7cb8cecf67e5bf45d9ef"
};

/**
 * The digest Scout v0.3.0 actually published for `verified.json` with its
 * defective hand-rolled SHA-256. The contract pins the same value in
 * `test_non_standard_sha256_digest_is_rejected`.
 */
const BROKEN_V030_DIGEST =
  "946544e1b7ed34791c216e16390a81b718dd4e938050653a9f5eab8246d11ac8";

function loadFixture(name: string): EvidenceManifestEnvelopeV1 {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, name), "utf8")) as EvidenceManifestEnvelopeV1;
}

describe("Evidence Manifest digests match the ScoutEvidenceAnchor golden vectors", () => {
  for (const [name, expected] of Object.entries(GOLDEN_DIGESTS)) {
    it(`${name} canonical payload hashes to the contract-side golden digest`, async () => {
      const envelope = loadFixture(name);
      const canonical = canonicalizeEvidenceManifestJson(envelope.payload);

      // The canonical bytes are ordinary UTF-8, so node:crypto must agree.
      expect(createHash("sha256").update(canonical, "utf8").digest("hex")).toBe(expected);
      expect(await digestEvidenceManifestPayload(envelope.payload)).toBe(expected);

      // The fixture's recorded digest is that same standard value.
      expect(envelope.integrity.digest).toBe(expected);
    });
  }

  it("agrees with node:crypto on the UTF-8 bytes of the canonical payload", async () => {
    for (const name of Object.keys(GOLDEN_DIGESTS)) {
      const envelope = loadFixture(name);
      const canonical = canonicalizeEvidenceManifestJson(envelope.payload);
      const scoutDigest = await digestEvidenceManifestPayload(envelope.payload);
      const nodeDigest = createHash("sha256")
        .update(Buffer.from(canonical, "utf8"))
        .digest("hex");

      expect(scoutDigest).toBe(nodeDigest);
    }
  });

  it("hashes only the payload, leaving format and integrity outside the digest", async () => {
    const envelope = loadFixture("verified.json");
    const baseline = await digestEvidenceManifestPayload(envelope.payload);

    const withDifferentFormat = await digestEvidenceManifestPayload(envelope.payload);
    expect(withDifferentFormat).toBe(baseline);

    // Reordering keys in the source object must not change the digest.
    const reordered = Object.fromEntries(
      Object.entries(envelope.payload).reverse()
    ) as EvidenceManifestEnvelopeV1["payload"];
    expect(await digestEvidenceManifestPayload(reordered)).toBe(baseline);
  });
});

describe("golden fixtures are accepted as Valid Scout manifests", () => {
  for (const name of ["verified.json", "unicode.json", "no-experiment.json"]) {
    it(`${name} inspects as valid with the corrected digest`, async () => {
      const envelope = loadFixture(name);
      const roundTripped = JSON.parse(JSON.stringify(envelope)) as EvidenceManifestEnvelopeV1;

      expect(await verifyEvidenceManifestIntegrity(roundTripped)).toBe(true);
      const inspection = await inspectEvidenceManifestV1(roundTripped);
      expect(inspection.status).toBe("valid");
      expect(inspection.digestMatches).toBe(true);
      expect(inspection.computedDigest).toBe(GOLDEN_DIGESTS[name]);
    });
  }

  it("returns Modified when a payload character changes without a digest update", async () => {
    const envelope = loadFixture("verified.json");
    const originalTitle = envelope.payload.contributionContext.title;
    const tampered = JSON.parse(JSON.stringify(envelope)) as EvidenceManifestEnvelopeV1;
    tampered.payload.contributionContext.title = `${originalTitle.slice(0, -1)}${
      originalTitle.endsWith(".") ? "!" : "."
    }`;

    expect(tampered.integrity.digest).toBe(GOLDEN_DIGESTS["verified.json"]);
    expect(tampered.payload.contributionContext.title).not.toBe(originalTitle);
    expect(await verifyEvidenceManifestIntegrity(tampered)).toBe(false);

    const inspection = await inspectEvidenceManifestV1(tampered);
    expect(inspection.status).toBe("modified");
    expect(inspection.digestMatches).toBe(false);
    expect(inspection.computedDigest).not.toBe(GOLDEN_DIGESTS["verified.json"]);
  });
});

describe("regression: the defective Scout v0.3.0 digest is not accepted", () => {
  it("does not treat the v0.3.0 digest as the correct SHA-256 of verified.json", async () => {
    const envelope = loadFixture("verified.json");

    expect(BROKEN_V030_DIGEST).not.toBe(GOLDEN_DIGESTS["verified.json"]);
    expect(await digestEvidenceManifestPayload(envelope.payload)).not.toBe(BROKEN_V030_DIGEST);
    expect(await digestEvidenceManifestPayload(envelope.payload)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("reports a v0.3.0 manifest carrying the defective digest as Modified", async () => {
    const legacy = loadFixture("verified.json");
    legacy.integrity = { ...legacy.integrity, digest: BROKEN_V030_DIGEST };

    expect(await verifyEvidenceManifestIntegrity(legacy)).toBe(false);
    const inspection = await inspectEvidenceManifestV1(legacy);
    expect(inspection.status).toBe("modified");
    expect(inspection.computedDigest).toBe(GOLDEN_DIGESTS["verified.json"]);
  });

  it("does not accept both algorithms under the sha256 label", async () => {
    const envelope = loadFixture("verified.json");
    const legacy = loadFixture("verified.json");
    legacy.integrity = { ...legacy.integrity, digest: BROKEN_V030_DIGEST };

    // The algorithm field still says "sha256" for both, so only the digest
    // distinguishes them, and exactly one of them can verify.
    expect(legacy.integrity.algorithm).toBe(envelope.integrity.algorithm);
    expect(legacy.integrity.algorithm).toBe("sha256");
    expect(await verifyEvidenceManifestIntegrity(envelope)).toBe(true);
    expect(await verifyEvidenceManifestIntegrity(legacy)).toBe(false);
  });
});

describe("generated manifests are standard SHA-256 from end to end", () => {
  function generatedInput() {
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
        additionalEvidenceLinks: "https://example.test/repository"
      },
      contributionLane: { ...workspace.contributionLanes[0], status: "building" as const },
      experiment: {
        id: "experiment-1",
        contractName: "Manifest contract",
        studioFileName: "manifest.py",
        deployedContractAddress: `0x${"b".repeat(40)}`,
        transactionHash: `0x${"a".repeat(64)}`,
        status: "finalized" as const,
        experimentNotes: "Checked final lifecycle status.",
        evidenceUrl: "https://example.test/result",
        portalSubmissionNotes: "",
        createdAt: "2026-08-01T00:00:00.000Z",
        updatedAt: "2026-08-01T00:00:00.000Z"
      }
    };
  }

  it("generates, serializes, and inspects as Valid with a node:crypto digest", async () => {
    const envelope = await createEvidenceManifestV1(generatedInput());
    const canonical = canonicalizeEvidenceManifestJson(envelope.payload);

    expect(envelope.integrity.digest).toBe(
      createHash("sha256").update(canonical, "utf8").digest("hex")
    );

    const roundTripped = JSON.parse(JSON.stringify(envelope)) as EvidenceManifestEnvelopeV1;
    const inspection = await inspectEvidenceManifestV1(roundTripped);
    expect(inspection.status).toBe("valid");
    expect(inspection.digestMatches).toBe(true);
  });
});
