import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyGenLayerTransaction } from "@/lib/genlayer-verifier";

const input = {
  rpcUrl: "https://rpc.test",
  transactionHash: "0xhash",
  manualStatus: "finalized" as const,
  manualContractAddress: "0xabc"
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
  it("sends exact JSON-RPC bodies and verifies a FINALIZED match", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => reply({ result: "FINALIZED" }))
      .mockImplementationOnce(() => reply({ result: { recipient: "0xrecipient" } }))
      .mockImplementationOnce(() => reply({ result: "0x" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyGenLayerTransaction(input);

    expect(requestBody(fetchMock, 0)).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "gen_getTransactionStatus",
      params: [{ txId: "0xhash" }]
    });
    expect(requestBody(fetchMock, 1)).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "gen_getTransactionReceipt",
      params: [{ txId: "0xhash" }]
    });
    expect(requestBody(fetchMock, 2)).toEqual({
      jsonrpc: "2.0",
      id: 1,
      method: "gen_getContractState",
      params: [{ address: "0xabc" }]
    });
    expect(result).toMatchObject({
      result: "verified",
      statusMatchesManual: true,
      observedRecipient: "0xrecipient",
      contractLookup: "found",
      contractStateResult: "0x"
    });
  });

  it("returns mismatch when a comparable status differs", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => reply({ result: "ACCEPTED" }))
        .mockImplementationOnce(() => reply({ result: null }))
        .mockImplementationOnce(() => reply({ result: null }))
    );

    const result = await verifyGenLayerTransaction(input);

    expect(result.result).toBe("mismatch");
    expect(result.statusMatchesManual).toBe(false);
  });

  it("returns observed for PENDING and preserves raw status and code", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() =>
          reply({ result: { status: "PENDING", statusCode: 4 } })
        )
        .mockImplementationOnce(() => reply({ result: null }))
        .mockImplementationOnce(() => reply({ result: null }))
    );

    const result = await verifyGenLayerTransaction(input);

    expect(result.result).toBe("observed");
    expect(result.statusMatchesManual).toBeNull();
    expect(result.observedStatus).toBe("PENDING");
    expect(result.observedStatusCode).toBe(4);
  });

  it.each(["PROPOSING", "COMMITTING", "REVEALING", "UNDETERMINED", "READY_TO_FINALIZE", "NEW_STATUS"])(
    "returns observed for non-comparable status %s",
    async (status) => {
      vi.stubGlobal(
        "fetch",
        vi
          .fn()
          .mockImplementationOnce(() => reply({ result: status }))
          .mockImplementationOnce(() => reply({ result: null }))
          .mockImplementationOnce(() => reply({ result: null }))
      );

      expect((await verifyGenLayerTransaction(input)).result).toBe("observed");
    }
  );

  it("records a null contract-state result as not found", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => reply({ result: "FINALIZED" }))
        .mockImplementationOnce(() => reply({ result: null }))
        .mockImplementationOnce(() => reply({ result: null }))
    );

    expect((await verifyGenLayerTransaction(input)).contractLookup).toBe("not_found");
  });

  it("records a contract-state RPC error as unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => reply({ result: "FINALIZED" }))
        .mockImplementationOnce(() => reply({ result: null }))
        .mockImplementationOnce(() => reply({ error: { code: -32601, message: "raw" } }))
    );

    const result = await verifyGenLayerTransaction(input);

    expect(result.contractLookup).toBe("unavailable");
    expect(result.errorMessage).not.toContain("raw");
  });

  it("does not treat a receipt recipient or contractAddress field as a contract lookup", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => reply({ result: "FINALIZED" }))
        .mockImplementationOnce(() =>
          reply({ result: { recipient: "0xrecipient", contractAddress: "0xwrong" } })
        )
        .mockImplementationOnce(() => reply({ result: null }))
    );

    const result = await verifyGenLayerTransaction(input);

    expect(result.observedRecipient).toBe("0xrecipient");
    expect(result.contractLookup).toBe("not_found");
    expect(result).not.toHaveProperty("observedContractAddress");
  });

  it("skips contract lookup when no manual address is supplied", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => reply({ result: "FINALIZED" }))
      .mockImplementationOnce(() => reply({ result: null }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await verifyGenLayerTransaction({
      ...input,
      manualContractAddress: ""
    });

    expect(result.contractLookup).toBe("not_checked");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("validates the RPC URL and transaction hash before fetching", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const badUrl = await verifyGenLayerTransaction({ ...input, rpcUrl: "file:///rpc" });
    const badHash = await verifyGenLayerTransaction({
      ...input,
      transactionHash: "hash"
    });

    expect(badUrl.errorMessage).toContain("http");
    expect(badHash.errorMessage).toContain("0x");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns safe unavailable errors without response bodies", async () => {
    vi.stubGlobal("fetch", vi.fn(() => reply({ secret: "sensitive" }, 500)));

    const result = await verifyGenLayerTransaction(input);

    expect(result.result).toBe("unavailable");
    expect(result.errorMessage).toBe("The RPC request could not be completed.");
    expect(result.errorMessage).not.toContain("sensitive");
  });
});
