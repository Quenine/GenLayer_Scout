import type {
  ContractLookupResult,
  ExperimentStatus,
  ExperimentVerification
} from "@/lib/types";

export const RPC_PRESETS = {
  studionet: "https://studio.genlayer.com/api",
  bradbury: "https://rpc-bradbury.genlayer.com",
  asimov: "https://rpc-asimov.genlayer.com"
} as const;

const RPC_TIMEOUT_MS = 12_000;
type UnknownRecord = Record<string, unknown>;

interface VerifyInput {
  rpcUrl: string;
  transactionHash: string;
  manualStatus: ExperimentStatus;
  manualContractAddress: string;
}

interface RpcError {
  code?: number;
  message?: string;
}

interface RpcResponse {
  jsonrpc?: string;
  id?: number;
  result?: unknown;
  error?: RpcError;
}

interface ObservedStatus {
  raw: string;
  code: number | null;
}

function isRecord(value: unknown): value is UnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function findString(value: unknown, keys: string[]): string {
  if (!isRecord(value)) {
    return "";
  }

  for (const key of keys) {
    if (typeof value[key] === "string") {
      return value[key];
    }
  }

  return "";
}

function readStatus(value: unknown): ObservedStatus {
  if (typeof value === "string") {
    return { raw: value, code: null };
  }

  if (typeof value === "number") {
    return { raw: String(value), code: value };
  }

  if (!isRecord(value)) {
    return { raw: "", code: null };
  }

  const nested = isRecord(value.status)
    ? value.status
    : isRecord(value.transactionStatus)
      ? value.transactionStatus
      : null;
  const raw =
    findString(value, ["status", "transactionStatus", "state", "name"]) ||
    findString(nested, ["status", "state", "name"]);
  const codeCandidate =
    value.statusCode ?? value.code ?? (nested ? nested.code : undefined);

  return {
    raw,
    code: typeof codeCandidate === "number" ? codeCandidate : null
  };
}

function comparableStatus(raw: string): ExperimentStatus | null {
  const normalized = raw.trim().toUpperCase();

  if (normalized === "ACCEPTED") {
    return "accepted";
  }

  if (normalized === "FINALIZED") {
    return "finalized";
  }

  if (["FAILED", "CANCELED", "CANCELLED"].includes(normalized)) {
    return "failed";
  }

  return null;
}

function isNotFound(reply: RpcResponse): boolean {
  const message = reply.error?.message?.toLowerCase() ?? "";

  return (
    reply.result === null ||
    reply.error?.code === -32001 ||
    message.includes("not found") ||
    message.includes("unknown transaction") ||
    message.includes("unknown contract")
  );
}

function validateRpcUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:"
      ? null
      : "RPC URL must use http or https.";
  } catch {
    return "Enter a valid http or https RPC URL.";
  }
}

function safeRequestError(error: unknown): string {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "The RPC request timed out after 12 seconds.";
  }

  return "The RPC request could not be completed.";
}

async function rpc(
  url: string,
  method: string,
  params: UnknownRecord[]
): Promise<RpcResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method,
        params
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("HTTP_ERROR");
    }

    try {
      return (await response.json()) as RpcResponse;
    } catch {
      throw new Error("INVALID_JSON");
    }
  } finally {
    clearTimeout(timeout);
  }
}

function createBaseVerification(input: VerifyInput): ExperimentVerification {
  return {
    source: "genlayer-rpc",
    rpcUrl: input.rpcUrl.trim(),
    checkedAt: new Date().toISOString(),
    transactionFound: false,
    receiptAvailable: false,
    observedStatus: "",
    observedStatusCode: null,
    statusMatchesManual: null,
    observedRecipient: "",
    contractLookup: "not_checked",
    contractStateResult: "",
    result: "manual_only",
    errorMessage: ""
  };
}

async function lookupReceipt(
  rpcUrl: string,
  transactionHash: string
): Promise<Pick<ExperimentVerification, "receiptAvailable" | "observedRecipient">> {
  try {
    const reply = await rpc(rpcUrl, "gen_getTransactionReceipt", [
      { txId: transactionHash }
    ]);

    if (reply.error || reply.result === null || reply.result === undefined) {
      return { receiptAvailable: false, observedRecipient: "" };
    }

    return {
      receiptAvailable: true,
      observedRecipient: findString(reply.result, ["recipient", "to"])
    };
  } catch {
    return { receiptAvailable: false, observedRecipient: "" };
  }
}

async function lookupContract(
  rpcUrl: string,
  manualContractAddress: string
): Promise<{
  contractLookup: ContractLookupResult;
  contractStateResult: string;
}> {
  if (!manualContractAddress) {
    return { contractLookup: "not_checked", contractStateResult: "" };
  }

  try {
    const reply = await rpc(rpcUrl, "gen_getContractState", [
      { address: manualContractAddress }
    ]);

    if (isNotFound(reply)) {
      return { contractLookup: "not_found", contractStateResult: "" };
    }

    if (reply.error || typeof reply.result !== "string") {
      return { contractLookup: "unavailable", contractStateResult: "" };
    }

    return {
      contractLookup: "found",
      contractStateResult: reply.result
    };
  } catch {
    return { contractLookup: "unavailable", contractStateResult: "" };
  }
}

function resultFromComparison(statusMatchesManual: boolean | null) {
  if (statusMatchesManual === false) {
    return "mismatch" as const;
  }

  if (statusMatchesManual === true) {
    return "verified" as const;
  }

  return "observed" as const;
}

export async function verifyGenLayerTransaction(
  input: VerifyInput
): Promise<ExperimentVerification> {
  const base = createBaseVerification(input);
  const transactionHash = input.transactionHash.trim();
  const manualContractAddress = input.manualContractAddress.trim();
  const urlError = validateRpcUrl(base.rpcUrl);

  if (urlError) {
    return { ...base, errorMessage: urlError };
  }

  if (!transactionHash.startsWith("0x")) {
    return {
      ...base,
      errorMessage: "Transaction hash must start with 0x."
    };
  }

  try {
    const statusReply = await rpc(base.rpcUrl, "gen_getTransactionStatus", [
      { txId: transactionHash }
    ]);

    if (isNotFound(statusReply)) {
      return {
        ...base,
        result: "not_found",
        errorMessage: "The transaction was not found by this RPC endpoint."
      };
    }

    if (statusReply.error) {
      return {
        ...base,
        result: "unavailable",
        errorMessage: "The transaction status lookup was unavailable."
      };
    }

    const observed = readStatus(statusReply.result);
    const comparable = comparableStatus(observed.raw);
    const statusMatchesManual = comparable
      ? comparable === input.manualStatus
      : null;
    const [receipt, contract] = await Promise.all([
      lookupReceipt(base.rpcUrl, transactionHash),
      lookupContract(base.rpcUrl, manualContractAddress)
    ]);

    return {
      ...base,
      ...receipt,
      ...contract,
      transactionFound: true,
      observedStatus: observed.raw || "Available (status label not returned)",
      observedStatusCode: observed.code,
      statusMatchesManual,
      result: resultFromComparison(statusMatchesManual)
    };
  } catch (error) {
    return {
      ...base,
      result: "unavailable",
      errorMessage: safeRequestError(error)
    };
  }
}
