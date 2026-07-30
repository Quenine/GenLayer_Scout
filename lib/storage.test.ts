import { describe, expect, it } from "vitest";
import { createEmptyWorkspace } from "@/lib/seed-data";
import { loadWorkspace, parseBackupFile, SCOUT_STORAGE_KEY } from "@/lib/storage";
import type { ContractExperiment, ExperimentVerification } from "@/lib/types";

const HASH = `0x${"a".repeat(64)}`;
const OTHER_HASH = `0x${"c".repeat(64)}`;
const ADDRESS = `0x${"b".repeat(40)}`;

const experiment: ContractExperiment = {
  id: "e1",
  contractName: "Contract",
  studioFileName: "contract.py",
  deployedContractAddress: ADDRESS,
  transactionHash: HASH,
  status: "finalized",
  experimentNotes: "notes",
  evidenceUrl: "",
  portalSubmissionNotes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

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
  checkedAt: "2026-01-01T00:00:00.000Z",
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

function backupWith(candidate: ContractExperiment) {
  return JSON.stringify({
    app: "GenLayer Scout",
    workspace: {
      ...createEmptyWorkspace(),
      experiments: [candidate]
    }
  });
}

function createStorage(initial: Record<string, string>): Storage {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
    clear: () => values.clear(),
    key: () => null,
    get length() {
      return values.size;
    }
  } as Storage;
}

describe("storage", () => {
  it("parses current experiments without verification", () => {
    expect(parseBackupFile(backupWith(experiment)).workspace?.experiments[0])
      .toMatchObject(experiment);
  });

  it("rejects malformed JSON and invalid schemas", () => {
    expect(parseBackupFile("{").workspace).toBeNull();
    expect(parseBackupFile(JSON.stringify({ schemaVersion: 99 })).workspace)
      .toBeNull();
  });

  it("drops legacy verification without a snapshot", () => {
    const legacyVerification = { ...verification } as Partial<ExperimentVerification>;
    delete legacyVerification.snapshot;
    const parsed = parseBackupFile(backupWith({
      ...experiment,
      verification: legacyVerification as ExperimentVerification
    })).workspace;
    expect(parsed?.experiments[0].verification).toBeUndefined();
  });

  it("drops verification whose snapshot differs from the experiment", () => {
    const parsed = parseBackupFile(backupWith({
      ...experiment,
      verification: {
        ...verification,
        snapshot: { ...verification.snapshot, transactionHash: OTHER_HASH }
      }
    })).workspace;
    expect(parsed?.experiments[0].verification).toBeUndefined();
  });

  it("preserves a matching snapshot through backup parsing and import", () => {
    const parsed = parseBackupFile(backupWith({
      ...experiment,
      verification
    })).workspace;
    expect(parsed?.experiments[0].verification).toEqual(verification);
  });

  it("drops malformed verification while retaining the experiment", () => {
    const parsed = parseBackupFile(backupWith({
      ...experiment,
      verification: { nope: true } as unknown as ExperimentVerification
    })).workspace;
    expect(parsed?.experiments[0].verification).toBeUndefined();
  });

  it("migrates legacy workspace data, drops demos, and preserves fields", () => {
    const storage = createStorage({
      "genlayer-scout-v0.1": JSON.stringify({
        runs: [
          { id: "run-demo-1", status: "finalized" },
          {
            id: "legacy",
            contractName: "Kept",
            fileName: "kept.py",
            deployedAddress: "0x1",
            transactionHash: "0x2",
            status: "accepted",
            notes: "preserved",
            evidenceUrl: "url",
            createdAt: "2025-01-01"
          }
        ]
      })
    });
    const result = loadWorkspace(storage);
    expect(result.workspace.experiments).toHaveLength(1);
    expect(result.workspace.experiments[0]).toMatchObject({
      id: "legacy",
      contractName: "Kept",
      studioFileName: "kept.py",
      experimentNotes: "preserved"
    });
    expect(storage.getItem(SCOUT_STORAGE_KEY)).toBeNull();
  });
});
