import { afterEach, describe, expect, it, vi } from "vitest";
import { reconcileExperimentVerification } from "@/lib/experiment-verification";
import { buildEvidencePackMarkdown } from "@/lib/evidence-report";
import {
  RPC_PRESETS,
  verifyGenLayerTransaction
} from "@/lib/genlayer-verifier";
import { createEmptyWorkspace } from "@/lib/seed-data";
import type { ContractExperiment } from "@/lib/types";

const CHECKED_HASH = `0x${"1".repeat(64)}`;
const EDITED_HASH = `0x${"2".repeat(64)}`;
const CHECKED_ADDRESS = `0x${"3".repeat(40)}`;

function rpcReply(payload: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" }
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verification integrity check-to-export", () => {
  it("exports the checked snapshot and removes it after a relevant edit", async () => {
    vi.stubGlobal("fetch", vi.fn(() => rpcReply({ result: "FINALIZED" })));
    const initial: ContractExperiment = {
      id: "integrity-check",
      contractName: "Integrity example",
      studioFileName: "integrity.py",
      deployedContractAddress: CHECKED_ADDRESS,
      transactionHash: CHECKED_HASH,
      status: "finalized",
      experimentNotes: "",
      evidenceUrl: "",
      portalSubmissionNotes: "",
      createdAt: "2026-07-30T00:00:00.000Z",
      updatedAt: "2026-07-30T00:00:00.000Z"
    };
    const verification = await verifyGenLayerTransaction({
      rpcUrl: RPC_PRESETS.studionet,
      rpcProfile: "studionet",
      transactionHash: initial.transactionHash,
      manualContractAddress: initial.deployedContractAddress,
      manualStatus: initial.status
    });
    const checked = reconcileExperimentVerification(initial, {
      ...initial,
      verification
    });
    const evidencePack = createEmptyWorkspace().evidencePack;
    const checkedReport = buildEvidencePackMarkdown({
      evidencePack,
      experiment: checked
    });

    expect(checkedReport).toContain(`Checked transaction hash:** ${CHECKED_HASH}`);
    expect(checkedReport).toContain(`Checked contract address:** ${CHECKED_ADDRESS}`);
    expect(checkedReport).toContain("Checked manual status:** finalized");
    expect(checkedReport).toContain("Observed status:** FINALIZED");
    expect(checkedReport).toContain("Result:** Verified");

    const edited = reconcileExperimentVerification(checked, {
      ...checked,
      transactionHash: EDITED_HASH
    });
    expect(edited.verification).toBeUndefined();

    const editedReport = buildEvidencePackMarkdown({
      evidencePack,
      experiment: edited
    });
    expect(editedReport).not.toContain("## Verification snapshot");
    expect(editedReport).not.toContain(CHECKED_HASH);
    expect(editedReport).not.toContain("Observed status:** FINALIZED");
    expect(editedReport).not.toContain("Result:** Verified");
  });
});
