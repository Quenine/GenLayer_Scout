import { describe, expect, it } from "vitest";
import { reconcileExperimentVerification } from "@/lib/experiment-verification";
import type { ContractExperiment, ExperimentVerification } from "@/lib/types";

const HASH = `0x${"a".repeat(64)}`;
const OTHER_HASH = `0x${"c".repeat(64)}`;
const ADDRESS = `0x${"b".repeat(40)}`;
const OTHER_ADDRESS = `0x${"d".repeat(40)}`;

const verification: ExperimentVerification = {
  snapshot: {
    version: 1,
    transactionHash: HASH,
    contractAddress: ADDRESS,
    manualStatus: "finalized"
  },
  source: "genlayer-rpc",
  rpcUrl: "https://studio.genlayer.com/api",
  rpcProfile: "studionet",
  transactionStatusDialect: "positional",
  receiptCapability: "unsupported",
  contractStateCapability: "unsupported",
  checkedAt: "2026-07-30T00:00:00.000Z",
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
};

const experiment: ContractExperiment = {
  id: "experiment-1",
  contractName: "Contract",
  studioFileName: "contract.py",
  deployedContractAddress: ADDRESS,
  transactionHash: HASH,
  status: "finalized",
  experimentNotes: "notes",
  evidenceUrl: "https://example.test/evidence",
  portalSubmissionNotes: "review notes",
  createdAt: "2026-07-30T00:00:00.000Z",
  updatedAt: "2026-07-30T00:00:00.000Z",
  verification
};

describe("reconcileExperimentVerification", () => {
  it("invalidates verification after a transaction-hash edit", () => {
    const result = reconcileExperimentVerification(experiment, {
      ...experiment,
      transactionHash: OTHER_HASH
    });
    expect(result.verification).toBeUndefined();
  });

  it("invalidates verification after a contract-address edit", () => {
    const result = reconcileExperimentVerification(experiment, {
      ...experiment,
      deployedContractAddress: OTHER_ADDRESS
    });
    expect(result.verification).toBeUndefined();
  });

  it("invalidates verification after a manual-status edit", () => {
    const result = reconcileExperimentVerification(experiment, {
      ...experiment,
      status: "accepted"
    });
    expect(result.verification).toBeUndefined();
  });

  it("preserves verification for non-relevant edits", () => {
    const result = reconcileExperimentVerification(experiment, {
      ...experiment,
      contractName: "Renamed",
      studioFileName: "renamed.py",
      experimentNotes: "updated",
      evidenceUrl: "https://example.test/new",
      portalSubmissionNotes: "updated review notes"
    });
    expect(result.verification).toBe(verification);
  });

  it("compares trimmed verification inputs", () => {
    const result = reconcileExperimentVerification(experiment, {
      ...experiment,
      transactionHash: ` ${HASH} `,
      deployedContractAddress: ` ${ADDRESS} `
    });
    expect(result.verification).toBe(verification);
  });

  it("attaches a new verification when relevant fields are unchanged", () => {
    const current = { ...experiment, verification: undefined };
    const result = reconcileExperimentVerification(current, {
      ...current,
      verification
    });
    expect(result.verification).toBe(verification);
  });
});