import type {
  ContractLookupResult,
  ExperimentStatus,
  ExperimentVerification,
  RpcCapability,
  RpcProfile,
  TransactionStatusDialect
} from "@/lib/types";

export const RPC_PRESETS = {
  studionet: "https://studio.genlayer.com/api",
  bradbury: "https://rpc-bradbury.genlayer.com",
  asimov: "https://rpc-asimov.genlayer.com"
} as const;

export type CustomCompatibilityMode = "object" | "auto";

const RPC_TIMEOUT_MS = 12_000;
type UnknownRecord = Record<string, unknown>;
type RpcParams = Array<string | UnknownRecord>;

interface VerifyInput {
  rpcUrl: string;
  rpcProfile: RpcProfile;
  customCompatibilityMode?: CustomCompatibilityMode;
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
  params: RpcParams
): Promise<RpcResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RPC_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error("HTTP_ERROR");
    }

    try {
      const payload = await response.json() as unknown;
      if (!isRecord(payload)) {
        throw new Error("INVALID_JSON_RPC");
      }
      return payload as RpcResponse;
    } catch (error) {
      if (error instanceof Error && error.message === "INVALID_JSON_RPC") {
        throw error;
      }
      throw new Error("INVALID_JSON");
    }
  } finally {
    clearTimeout(timeout);
  }
}

function initialDialect(profile: RpcProfile): TransactionStatusDialect {
  return profile === "studionet" ? "positional" : "object";
}

function createBaseVerification(input: VerifyInput): ExperimentVerification {
  const unsupported = input.rpcProfile === "studionet";
  return {
    source: "genlayer-rpc",
    rpcUrl: input.rpcUrl.trim(),
    rpcProfile: input.rpcProfile,
    transactionStatusDialect: initialDialect(input.rpcProfile),
    receiptCapability: unsupported ? "unsupported" : "not_checked",
    contractStateCapability: unsupported ? "unsupported" : "not_checked",
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

function statusParams(
  dialect: TransactionStatusDialect,
  transactionHash: string
): RpcParams {
  return dialect === "positional"
    ? [transactionHash]
    : [{ txId: transactionHash }];
}

function eligibleForPositionalRetry(reply: RpcResponse): boolean {
  return reply.error?.code === -32602 || reply.error?.code === -32603;
}

async function lookupStatus(
  input: VerifyInput,
  transactionHash: string
): Promise<{ reply: RpcResponse; dialect: TransactionStatusDialect }> {
  const dialect = initialDialect(input.rpcProfile);
  const reply = await rpc(
    input.rpcUrl.trim(),
    "gen_getTransactionStatus",
    statusParams(dialect, transactionHash)
  );

  if (
    input.rpcProfile === "custom" &&
    input.customCompatibilityMode === "auto" &&
    dialect === "object" &&
    eligibleForPositionalRetry(reply)
  ) {
    return {
      reply: await rpc(input.rpcUrl.trim(), "gen_getTransactionStatus", [
        transactionHash
      ]),
      dialect: "positional"
    };
  }

  return { reply, dialect };
}

async function lookupReceipt(
  rpcUrl: string,
  transactionHash: string
): Promise<{
  receiptCapability: RpcCapability;
  receiptAvailable: boolean;
  observedRecipient: string;
}> {
  try {
    const reply = await rpc(rpcUrl, "gen_getTransactionReceipt", [
      { txId: transactionHash }
    ]);

    if (reply.error?.code === -32601) {
      return {
        receiptCapability: "unsupported",
        receiptAvailable: false,
        observedRecipient: ""
      };
    }

    if (reply.error) {
      return {
        receiptCapability: "unavailable",
        receiptAvailable: false,
        observedRecipient: ""
      };
    }

    return {
      receiptCapability: "available",
      receiptAvailable: reply.result !== null && reply.result !== undefined,
      observedRecipient: findString(reply.result, ["recipient", "to"])
    };
  } catch {
    return {
      receiptCapability: "unavailable",
      receiptAvailable: false,
      observedRecipient: ""
    };
  }
}

async function lookupContract(
  rpcUrl: string,
  manualContractAddress: string
): Promise<{
  contractStateCapability: RpcCapability;
  contractLookup: ContractLookupResult;
  contractStateResult: string;
}> {
  if (!manualContractAddress) {
    return {
      contractStateCapability: "not_checked",
      contractLookup: "not_checked",
      contractStateResult: ""
    };
  }

  try {
    const reply = await rpc(rpcUrl, "gen_getContractState", [
      { address: manualContractAddress }
    ]);

    if (reply.error?.code === -32601) {
      return {
        contractStateCapability: "unsupported",
        contractLookup: "not_checked",
        contractStateResult: ""
      };
    }

    if (isNotFound(reply)) {
      return {
        contractStateCapability: "available",
        contractLookup: "not_found",
        contractStateResult: ""
      };
    }

    if (reply.error || typeof reply.result !== "string") {
      return {
        contractStateCapability: "unavailable",
        contractLookup: "unavailable",
        contractStateResult: ""
      };
    }

    return {
      contractStateCapability: "available",
      contractLookup: "found",
      contractStateResult: reply.result
    };
  } catch {
    return {
      contractStateCapability: "unavailable",
      contractLookup: "unavailable",
      contractStateResult: ""
    };
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

  if (!/^0x[a-fA-F0-9]{64}$/.test(transactionHash)) {
    return {
      ...base,
      errorMessage: "Transaction hash must be a 32-byte 0x-prefixed hexadecimal value."
    };
  }

  if (
    manualContractAddress &&
    !/^0x[a-fA-F0-9]{40}$/.test(manualContractAddress)
  ) {
    return {
      ...base,
      errorMessage: "Contract address must be a 20-byte 0x-prefixed hexadecimal value."
    };
  }

  try {
    const status = await lookupStatus(input, transactionHash);

    if (isNotFound(status.reply)) {
      return {
        ...base,
        transactionStatusDialect: status.dialect,
        result: "not_found",
        errorMessage: "The transaction was not found by this RPC endpoint."
      };
    }

    if (status.reply.error || status.reply.result === undefined) {
      return {
        ...base,
        transactionStatusDialect: status.dialect,
        result: "unavailable",
        errorMessage: "The transaction status lookup was unavailable."
      };
    }

    const observed = readStatus(status.reply.result);
    const comparable = comparableStatus(observed.raw);
    const statusMatchesManual = comparable
      ? comparable === input.manualStatus
      : null;
    const optionalMethods = input.rpcProfile === "studionet"
      ? {
          receiptCapability: "unsupported" as const,
          receiptAvailable: false,
          observedRecipient: "",
          contractStateCapability: "unsupported" as const,
          contractLookup: "not_checked" as const,
          contractStateResult: ""
        }
      : {
          ...(await lookupReceipt(base.rpcUrl, transactionHash)),
          ...(await lookupContract(base.rpcUrl, manualContractAddress))
        };

    return {
      ...base,
      ...optionalMethods,
      transactionFound: true,
      transactionStatusDialect: status.dialect,
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
