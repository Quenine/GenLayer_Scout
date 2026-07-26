import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyGenLayerTransaction } from "@/lib/genlayer-verifier";
const input = { rpcUrl: "https://rpc.test", transactionHash: "0xhash", manualStatus: "finalized" as const, manualContractAddress: "0xabc" };
function reply(result: unknown) { return Promise.resolve(new Response(JSON.stringify(result), { status: 200, headers: { "content-type": "application/json" } })); }
afterEach(() => vi.unstubAllGlobals());
describe("verifyGenLayerTransaction", () => {
  it("returns verified for matching FINALIZED status", async () => { vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => reply({ result: "FINALIZED" })).mockImplementationOnce(() => reply({ result: { contractAddress: "0xAbC" } }))); const result = await verifyGenLayerTransaction(input); expect(result.result).toBe("verified"); expect(result.statusMatchesManual).toBe(true); expect(result.addressMatchesManual).toBe(true); });
  it("returns mismatch for status mismatch", async () => { vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => reply({ result: "ACCEPTED" })).mockImplementationOnce(() => reply({ result: null }))); expect((await verifyGenLayerTransaction(input)).result).toBe("mismatch"); });
  it("returns not_found for an RPC not-found response", async () => { vi.stubGlobal("fetch", vi.fn(() => reply({ error: { code: -32001, message: "not found" } }))); expect((await verifyGenLayerTransaction(input)).result).toBe("not_found"); });
  it("returns unavailable for fetch failure", async () => { vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("offline")))); expect((await verifyGenLayerTransaction(input)).result).toBe("unavailable"); });
  it("keeps status evidence when receipt is unavailable", async () => { vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => reply({ result: "FINALIZED" })).mockRejectedValueOnce(new Error("receipt unavailable"))); const result = await verifyGenLayerTransaction(input); expect(result.result).toBe("verified"); expect(result.receiptAvailable).toBe(false); });
  it("does not compare an address absent from the receipt", async () => { vi.stubGlobal("fetch", vi.fn().mockImplementationOnce(() => reply({ result: "FINALIZED" })).mockImplementationOnce(() => reply({ result: { blockHash: "x" } }))); expect((await verifyGenLayerTransaction(input)).addressMatchesManual).toBeNull(); });
});
