import { afterEach, describe, expect, it, vi } from "vitest";
import {
  RPC_PRESETS,
  verifyGenLayerTransaction
} from "@/lib/genlayer-verifier";

const TEST_TRANSACTION_HASH = `0x${"a".repeat(64)}`;
const TEST_CONTRACT_ADDRESS = `0x${"b".repeat(40)}`;
const baseInput = {
  rpcUrl: RPC_PRESETS.bradbury,
  rpcProfile: "bradbury" as const,
  transactionHash: TEST_TRANSACTION_HASH,
  manualStatus: "finalized" as const,
  manualContractAddress: TEST_CONTRACT_ADDRESS
};

function reply(payload: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(payload), {
      status,
      headers: { "content-type": "application/json" }
    })
  );
}

function requestBody(fetchMock: ReturnType<typeof vi.fn>, index: number) {
  const init = fetchMock.mock.calls[index][1] as RequestInit;
  return JSON.parse(String(init.body)) as unknown;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("verifyGenLayerTransaction", () => {
  it("uses Studionet positional status parameters and skips unsupported methods", async () => {
    const fetchMock = vi.fn(() => reply({ result: "FINALIZED" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyGenLayerTransaction({
      ...baseInput,
      rpcUrl: RPC_PRESETS.studionet,
      rpcProfile: "studionet"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestBody(fetchMock, 0)).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "gen_getTransactionStatus",
      params: [TEST_TRANSACTION_HASH]
    });
    expect(result).toMatchObject({
      result: "verified",
      rpcProfile: "studionet",
      transactionStatusDialect: "positional",
      receiptCapability: "unsupported",
      contractStateCapability: "unsupported"
    });
  });

  it("uses documented object parameters for an object-form profile", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => reply({ result: "FINALIZED" }))
      .mockImplementationOnce(() => reply({ result: { recipient: "0xrecipient" } }))
      .mockImplementationOnce(() => reply({ result: "0x" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyGenLayerTransaction(baseInput);

    expect(requestBody(fetchMock, 0)).toMatchObject({
      method: "gen_getTransactionStatus",
      params: [{ txId: TEST_TRANSACTION_HASH }]
    });
    expect(requestBody(fetchMock, 1)).toMatchObject({
      method: "gen_getTransactionReceipt",
      params: [{ txId: TEST_TRANSACTION_HASH }]
    });
    expect(requestBody(fetchMock, 2)).toMatchObject({
      method: "gen_getContractState",
      params: [{ address: TEST_CONTRACT_ADDRESS }]
    });
    expect(result).toMatchObject({
      result: "verified",
      transactionStatusDialect: "object",
      receiptCapability: "available",
      contractStateCapability: "available"
    });
  });

  it("classifies -32601 optional methods as unsupported", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => reply({ result: "FINALIZED" }))
        .mockImplementationOnce(() =>
          reply({ error: { code: -32601, message: "Method not found" } })
        )
        .mockImplementationOnce(() =>
          reply({ error: { code: -32601, message: "Method not found" } })
        )
    );

    const result = await verifyGenLayerTransaction(baseInput);

    expect(result.result).toBe("verified");
    expect(result.receiptCapability).toBe("unsupported");
    expect(result.contractStateCapability).toBe("unsupported");
  });

  it("retries custom Auto status positionally after an eligible object failure", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() =>
        reply({ error: { code: -32603, message: "database detail" } })
      )
      .mockImplementationOnce(() => reply({ result: "FINALIZED" }))
      .mockImplementationOnce(() =>
        reply({ error: { code: -32601, message: "Method not found" } })
      )
      .mockImplementationOnce(() =>
        reply({ error: { code: -32601, message: "Method not found" } })
      );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyGenLayerTransaction({
      ...baseInput,
      rpcUrl: "https://custom.test",
      rpcProfile: "custom",
      customCompatibilityMode: "auto"
    });

    expect(requestBody(fetchMock, 0)).toMatchObject({
      method: "gen_getTransactionStatus",
      params: [{ txId: TEST_TRANSACTION_HASH }]
    });
    expect(requestBody(fetchMock, 1)).toMatchObject({
      method: "gen_getTransactionStatus",
      params: [TEST_TRANSACTION_HASH]
    });
    expect(result.result).toBe("verified");
    expect(result.transactionStatusDialect).toBe("positional");
  });

  it("does not retry custom object mode", async () => {
    const fetchMock = vi.fn(() =>
      reply({ error: { code: -32603, message: "sensitive SQL and stack" } })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyGenLayerTransaction({
      ...baseInput,
      rpcUrl: "https://custom.test",
      rpcProfile: "custom",
      customCompatibilityMode: "object"
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requestBody(fetchMock, 0)).toMatchObject({
      method: "gen_getTransactionStatus",
      params: [{ txId: TEST_TRANSACTION_HASH }]
    });
    expect(result.result).toBe("unavailable");
    expect(result.errorMessage).toBe("The transaction status lookup was unavailable.");
    expect(result.errorMessage).not.toContain("SQL");
    expect(result.errorMessage).not.toContain("stack");
  });

  it("returns mismatch for a safely comparable status mismatch", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => reply({ result: "ACCEPTED" }))
        .mockImplementationOnce(() => reply({ result: null }))
        .mockImplementationOnce(() => reply({ result: null }))
    );

    expect((await verifyGenLayerTransaction(baseInput)).result).toBe("mismatch");
  });

  it("returns observed for PENDING and preserves raw status and code", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() =>
          reply({ result: { status: "PENDING", statusCode: 1 } })
        )
        .mockImplementationOnce(() => reply({ result: null }))
        .mockImplementationOnce(() => reply({ result: null }))
    );

    const result = await verifyGenLayerTransaction(baseInput);

    expect(result.result).toBe("observed");
    expect(result.observedStatus).toBe("PENDING");
    expect(result.observedStatusCode).toBe(1);
  });

  it("rejects invalid transaction and optional contract addresses before RPC", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const badHash = await verifyGenLayerTransaction({
      ...baseInput,
      transactionHash: "0x1234"
    });
    const badAddress = await verifyGenLayerTransaction({
      ...baseInput,
      manualContractAddress: "0x1234"
    });

    expect(badHash.errorMessage).toBe(
      "Transaction hash must be a 32-byte 0x-prefixed hexadecimal value."
    );
    expect(badAddress.errorMessage).toBe(
      "Contract address must be a 20-byte 0x-prefixed hexadecimal value."
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("never exposes raw HTTP response bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(() => reply({ database: "secret" }, 500)));

    const result = await verifyGenLayerTransaction(baseInput);

    expect(result.result).toBe("unavailable");
    expect(result.errorMessage).toBe("The RPC request could not be completed.");
    expect(result.errorMessage).not.toContain("secret");
  });
});
