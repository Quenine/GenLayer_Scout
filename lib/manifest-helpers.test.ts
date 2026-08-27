import { describe, expect, it } from "vitest";
import {
  mapScoutToManifestInput,
  sanitizeManifestFilename,
  validateManifestPrerequisites
} from "@/lib/manifest-helpers";
import type { ContractExperiment, EvidencePack } from "@/lib/types";

const HASH = `0x${"a".repeat(64)}`;
const ADDRESS = `0x${"b".repeat(40)}`;

function makeExperiment(overrides: Partial<ContractExperiment> = {}): ContractExperiment {
  return {
    id: "experiment-1",
    contractName: "Faucet contract",
    studioFileName: "faucet.py",
    deployedContractAddress: ADDRESS,
    transactionHash: HASH,
    status: "finalized",
    experimentNotes: "Tested faucet lifecycle.",
    evidenceUrl: "https://example.test/result",
    portalSubmissionNotes: "",
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    verification: {
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
      errorMessage: ""
    },
    ...overrides
  };
}

function makeEvidencePack(overrides: Partial<EvidencePack> = {}): EvidencePack {
  return {
    experimentId: "experiment-1",
    contributionCategoryId: "projects",
    title: "Faucet",
    projectSummary: "A test faucet.",
    genLayerRelevance: "Useful for testing.",
    contractAddressNotApplicableReason: "",
    transactionHashNotApplicableReason: "",
    whatWasTested: "Faucet withdrawal.",
    knownLimitations: "No rate limiting.",
    nextMilestone: "Add rate limiting.",
    additionalEvidenceLinks: "https://example.test/logs",
    portalSubmissionNotes: "",
    ...overrides
  };
}

const VALID_IMPL_REFS = {
  repositoryUrl: "https://github.com/owner/repo",
  repositoryCommit: "a".repeat(40),
  deploymentUrl: "https://faucet.vercel.app"
};

describe("mapScoutToManifestInput", () => {
  it("maps all Scout data fields into the manifest input shape", () => {
    const experiment = makeExperiment();
    const evidencePack = makeEvidencePack();
    const contributionLane = { id: "projects", name: "Projects", minimumPoints: 20, maximumPoints: 4000, pioneerOpportunity: false, status: "building" as const };

    const result = mapScoutToManifestInput({
      evidencePack,
      experiment,
      contributionLane,
      repositoryUrl: VALID_IMPL_REFS.repositoryUrl,
      repositoryCommit: VALID_IMPL_REFS.repositoryCommit,
      deploymentUrl: VALID_IMPL_REFS.deploymentUrl,
      createdAt: "2026-08-10T12:00:00.000Z"
    });

    expect(result.evidencePack).toBe(evidencePack);
    expect(result.experiment).toBe(experiment);
    expect(result.contributionLane).toBe(contributionLane);
    expect(result.implementationReferences).toEqual(VALID_IMPL_REFS);
    expect(result.createdAt).toBe("2026-08-10T12:00:00.000Z");
  });

  it("reuses the same evidence link parsing as the Markdown report", () => {
    const experiment = makeExperiment({ evidenceUrl: "https://studio.example.com/result" });
    const evidencePack = makeEvidencePack({
      additionalEvidenceLinks: "https://example.test/repo\nhttps://example.test/logs"
    });

    const result = mapScoutToManifestInput({
      evidencePack,
      experiment,
      repositoryUrl: VALID_IMPL_REFS.repositoryUrl,
      repositoryCommit: VALID_IMPL_REFS.repositoryCommit,
      deploymentUrl: VALID_IMPL_REFS.deploymentUrl,
      createdAt: "2026-08-10T12:00:00.000Z"
    });

    expect(result.evidencePack.additionalEvidenceLinks).toContain("https://example.test/repo");
    expect(result.experiment?.evidenceUrl).toBe("https://studio.example.com/result");
  });
});

describe("validateManifestPrerequisites", () => {
  it("returns no errors when all prerequisites are met", () => {
    const errors = validateManifestPrerequisites({
      experiment: makeExperiment(),
      evidencePack: makeEvidencePack(),
      ...VALID_IMPL_REFS
    });
    expect(errors).toHaveLength(0);
  });

  it("reports missing experiment", () => {
    const errors = validateManifestPrerequisites({
      experiment: undefined,
      evidencePack: makeEvidencePack(),
      ...VALID_IMPL_REFS
    });
    expect(errors.some((e) => e.field === "experiment")).toBe(true);
  });

  it("reports missing verification", () => {
    const errors = validateManifestPrerequisites({
      experiment: makeExperiment({ verification: undefined }),
      evidencePack: makeEvidencePack(),
      ...VALID_IMPL_REFS
    });
    expect(errors.some((e) => e.field === "experiment" && e.message.includes("verification"))).toBe(true);
  });

  it("reports missing repository URL", () => {
    const errors = validateManifestPrerequisites({
      experiment: makeExperiment(),
      evidencePack: makeEvidencePack(),
      repositoryUrl: "",
      repositoryCommit: VALID_IMPL_REFS.repositoryCommit,
      deploymentUrl: VALID_IMPL_REFS.deploymentUrl
    });
    expect(errors.some((e) => e.field === "repositoryUrl")).toBe(true);
  });

  it("reports missing commit SHA", () => {
    const errors = validateManifestPrerequisites({
      experiment: makeExperiment(),
      evidencePack: makeEvidencePack(),
      repositoryUrl: VALID_IMPL_REFS.repositoryUrl,
      repositoryCommit: "",
      deploymentUrl: VALID_IMPL_REFS.deploymentUrl
    });
    expect(errors.some((e) => e.field === "repositoryCommit")).toBe(true);
  });

  it("reports missing deployment URL", () => {
    const errors = validateManifestPrerequisites({
      experiment: makeExperiment(),
      evidencePack: makeEvidencePack(),
      repositoryUrl: VALID_IMPL_REFS.repositoryUrl,
      repositoryCommit: VALID_IMPL_REFS.repositoryCommit,
      deploymentUrl: ""
    });
    expect(errors.some((e) => e.field === "deploymentUrl")).toBe(true);
  });

  it("reports missing evidence links", () => {
    const errors = validateManifestPrerequisites({
      experiment: makeExperiment({ evidenceUrl: "" }),
      evidencePack: makeEvidencePack({ additionalEvidenceLinks: "" }),
      ...VALID_IMPL_REFS
    });
    expect(errors.some((e) => e.field === "links")).toBe(true);
  });

  it("reports missing required evidence pack fields", () => {
    const errors = validateManifestPrerequisites({
      experiment: makeExperiment(),
      evidencePack: makeEvidencePack({ title: "", whatWasTested: "", knownLimitations: "" }),
      ...VALID_IMPL_REFS
    });
    expect(errors.some((e) => e.field === "title")).toBe(true);
    expect(errors.some((e) => e.field === "whatWasTested")).toBe(true);
    expect(errors.some((e) => e.field === "knownLimitations")).toBe(true);
  });
});

describe("sanitizeManifestFilename", () => {
  it("produces a stable filename using title and digest prefix", () => {
    const name = sanitizeManifestFilename("Faucet Contract", "a1b2c3d4e5f6");
    expect(name).toBe("genlayer-scout-faucet-contract-a1b2c3d4.manifest.json");
  });

  it("sanitizes unsafe filename characters", () => {
    const name = sanitizeManifestFilename("My Project (v2.0)!", "abcd1234");
    expect(name).toMatch(/^[a-z0-9-]+\.manifest\.json$/);
    const slug = name.replace(/^genlayer-scout-/, "").replace(/-abcd1234\.manifest\.json$/, "");
    expect(slug).not.toMatch(/[()!.]/);
  });

  it("uses fallback slug for empty title", () => {
    const name = sanitizeManifestFilename("", "abcd1234");
    expect(name).toBe("genlayer-scout-manifest-abcd1234.manifest.json");
  });

  it("truncates long titles to 60 characters", () => {
    const longTitle = "a".repeat(100);
    const name = sanitizeManifestFilename(longTitle, "abcd1234");
    const slug = name.replace("genlayer-scout-", "").replace("-abcd1234.manifest.json", "");
    expect(slug.length).toBeLessThanOrEqual(60);
  });
});
