import { describe, expect, it } from "vitest";
import { createEmptyWorkspace } from "@/lib/seed-data";
import { buildEvidencePackMarkdown } from "@/lib/evidence-report";
const workspace = createEmptyWorkspace();
const experiment = { id: "e", contractName: "Scout contract", studioFileName: "scout.py", deployedContractAddress: "0xabc", transactionHash: "0xhash", status: "finalized" as const, experimentNotes: "", evidenceUrl: "", portalSubmissionNotes: "", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
describe("evidence report", () => {
  it("includes the manual note and selected experiment details", () => { const text = buildEvidencePackMarkdown({ evidencePack: workspace.evidencePack, experiment }); expect(text).toContain("Manual evidence note"); expect(text).toContain("Scout contract"); expect(text).toContain("0xhash"); });
  it("includes verification when present", () => { const verification = { source: "genlayer-rpc" as const, rpcUrl: "https://rpc", checkedAt: "2026-01-01", transactionFound: true, receiptAvailable: false, observedStatus: "FINALIZED", observedStatusCode: null, statusMatchesManual: true, observedContractAddress: "", addressMatchesManual: null, result: "verified" as const, errorMessage: "" }; expect(buildEvidencePackMarkdown({ evidencePack: workspace.evidencePack, experiment: { ...experiment, verification } })).toContain("## Read-only verification"); });
  it("includes a no-experiment note", () => { expect(buildEvidencePackMarkdown({ evidencePack: workspace.evidencePack })).toContain("No experiment selected"); });
});
