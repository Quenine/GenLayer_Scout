import { describe, expect, it } from "vitest";
import { createEmptyWorkspace } from "@/lib/seed-data";
import {
  loadWorkspace,
  parseBackupFile,
  SCOUT_STORAGE_KEY
} from "@/lib/storage";
import type { ExperimentVerification } from "@/lib/types";

const experiment = {
  id: "e1",
  contractName: "Contract",
  studioFileName: "contract.py",
  deployedContractAddress: "0xabc",
  transactionHash: "0xhash",
  status: "finalized" as const,
  experimentNotes: "notes",
  evidenceUrl: "",
  portalSubmissionNotes: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z"
};

const verification: ExperimentVerification = {
  source: "genlayer-rpc",
  rpcUrl: "https://rpc",
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
  it("parses current backups and experiments without verification", () => {
    const workspace = {
      ...createEmptyWorkspace(),
      experiments: [experiment]
    };
    const parsed = parseBackupFile(
      JSON.stringify({ app: "GenLayer Scout", workspace })
    );

    expect(parsed.workspace?.experiments[0]).toMatchObject(experiment);
  });

  it("rejects malformed JSON and invalid schemas", () => {
    expect(parseBackupFile("{").workspace).toBeNull();
    expect(
      parseBackupFile(JSON.stringify({ schemaVersion: 99 })).workspace
    ).toBeNull();
  });

  it("accepts valid verification and drops invalid verification", () => {
    const valid = parseBackupFile(
      JSON.stringify({
        ...createEmptyWorkspace(),
        experiments: [{ ...experiment, verification }]
      })
    ).workspace;
    const invalid = parseBackupFile(
      JSON.stringify({
        ...createEmptyWorkspace(),
        experiments: [{ ...experiment, verification: { nope: true } }]
      })
    ).workspace;

    expect(valid?.experiments[0].verification).toEqual(verification);
    expect(invalid?.experiments[0].verification).toBeUndefined();
  });

  it("migrates the former receipt address field without treating it as contract proof", () => {
    const formerVerification = {
      ...verification,
      observedRecipient: undefined,
      observedContractAddress: "0xrecipient",
      addressMatchesManual: true,
      contractLookup: undefined,
      contractStateResult: undefined
    };
    const parsed = parseBackupFile(
      JSON.stringify({
        ...createEmptyWorkspace(),
        experiments: [{ ...experiment, verification: formerVerification }]
      })
    ).workspace;

    expect(parsed?.experiments[0].verification).toMatchObject({
      observedRecipient: "0xrecipient",
      contractLookup: "not_checked",
      contractStateResult: ""
    });
    expect(parsed?.experiments[0].verification).not.toHaveProperty(
      "addressMatchesManual"
    );
  });

  it("downgrades a legacy overclaimed verified observation", () => {
    const parsed = parseBackupFile(
      JSON.stringify({
        ...createEmptyWorkspace(),
        experiments: [{
          ...experiment,
          verification: {
            ...verification,
            observedStatus: "PENDING",
            statusMatchesManual: null,
            result: "verified"
          }
        }]
      })
    ).workspace;

    expect(parsed?.experiments[0].verification?.result).toBe("observed");
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
