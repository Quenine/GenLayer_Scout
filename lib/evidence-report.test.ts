import { describe, expect, it } from "vitest";
import { createEmptyWorkspace } from "@/lib/seed-data";
import { buildEvidencePackMarkdown } from "@/lib/evidence-report";
import type { ContractExperiment, ExperimentVerification } from "@/lib/types";

const workspace = createEmptyWorkspace();
const experiment: ContractExperiment = {
  id: "e",
  contractName: "Scout contract",
  studioFileName: "scout.py",
  deployedContractAddress: "0xabc",
  transactionHash: "0xhash",
  status: "finalized",
  experimentNotes: "",
  evidenceUrl: "",
  portalSubmissionNotes: "",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01"
};
const verification: ExperimentVerification = {
  source: "genlayer-rpc",
  rpcUrl: "https://rpc",
  rpcProfile: "custom",
  transactionStatusDialect: "object",
  receiptCapability: "available",
  contractStateCapability: "available",
  checkedAt: "2026-01-01",
  transactionFound: true,
  receiptAvailable: true,
  observedStatus: "FINALIZED",
  observedStatusCode: null,
  statusMatchesManual: true,
  observedRecipient: "0xrecipient",
  contractLookup: "found",
  contractStateResult: "0x",
  result: "verified",
  errorMessage: ""
};

describe("evidence report", () => {
  it("includes the manual note and selected experiment details", () => {
    const text = buildEvidencePackMarkdown({
      evidencePack: workspace.evidencePack,
      experiment
    });

    expect(text).toContain("Manual evidence note");
    expect(text).toContain("Scout contract");
    expect(text).toContain("0xhash");
  });

  it("reports recipient and contract lookup without conflating them", () => {
    const text = buildEvidencePackMarkdown({
      evidencePack: workspace.evidencePack,
      experiment: { ...experiment, verification }
    });

    expect(text).toContain("## Read-only verification");
    expect(text).toContain("RPC profile:** custom");
    expect(text).toContain("transaction-status dialect:** object");
    expect(text).toContain("Receipt capability:** available");
    expect(text).toContain("Contract-state capability:** available");
    expect(text).toContain("Receipt recipient:** 0xrecipient");
    expect(text).toContain("not proof of the deployed contract address");
    expect(text).toContain("Contract-state lookup:** found");
    expect(text).toContain("does not prove authorship or contract behavior");
  });

  it("includes a no-experiment note", () => {
    const text = buildEvidencePackMarkdown({
      evidencePack: workspace.evidencePack
    });

    expect(text).toContain("No experiment selected");
  });
});
