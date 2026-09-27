import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  buildResponse,
  readAnchorRecord,
  type AnchorReadClient
} from "@/lib/scout-anchor-reader";
import { compareAnchorToReference } from "@/lib/onchain-evidence";

const PROVEN_RAW = {
  anchor_id: 1,
  claimed_digest: "b9163889a1cf1ab99cd33ae6f3783e8a7cfcb472f7896fe0b8d464c353f8ed63",
  contract_address: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1",
  manifest_url:
    "https://github.com/Quenine/GenLayer_Scout/releases/download/v0.3.1/genlayer-scout-v0.3.1-evidence-manifest.json",
  observed_contract_address: "0x6B9E22dd81F750c3fd9B1473002319f87992faC1",
  observed_digest: "b9163889a1cf1ab99cd33ae6f3783e8a7cfcb472f7896fe0b8d464c353f8ed63",
  observed_status: "finalized",
  observed_transaction_hash: "0xea5aff36389c249e3c0aa277fb94f5f58948d28d6dae07791ef200f01525b493",
  reason_code: "",
  recorded_status: "finalized",
  submitter: "0xd8287d058da7462e80ead924a2d23bcddbe96002",
  transaction_hash: "0xea5aff36389c249e3c0aa277fb94f5f58948d28d6dae07791ef200f01525b493",
  verification_state: "VERIFIED"
};

function stubClient(result: unknown | Error): AnchorReadClient & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    async readContract(args) {
      calls.push(args);
      if (result instanceof Error) throw result;
      return result;
    }
  };
}

describe("scout anchor reader", () => {
  it("reads get_anchor(1) from the fixed deployment with finalized semantics", async () => {
    const client = stubClient(PROVEN_RAW);
    const { record, failure } = await readAnchorRecord({ client });

    expect(failure).toBeNull();
    expect(record?.verificationState).toBe("VERIFIED");

    expect(client.calls).toHaveLength(1);
    const call = client.calls[0] as {
      address: string;
      functionName: string;
      args: unknown[];
      transactionHashVariant: string;
    };
    expect(call.address).toBe("0x246813806cD01d17f2995DAF9e0aCC1DaC31c488");
    expect(call.functionName).toBe("get_anchor");
    expect(call.args).toEqual([1]);
    expect(call.transactionHashVariant).toBe("latest-final");
  });

  it("maps a thrown SDK or network error to a safe failure with no leaked internals", async () => {
    const error = new Error("connect ECONNREFUSED secret-internal-host:9999");
    const { record, failure } = await readAnchorRecord({ client: stubClient(error) });

    expect(record).toBeNull();
    expect(failure).toBe("read_failed");
    expect(failure).not.toContain("ECONNREFUSED");
    expect(failure).not.toContain("secret-internal-host");
  });

  it("maps an uninterpretable network payload to unexpected_response", async () => {
    for (const raw of [null, "nope", { anchor_id: "one" }, { ...PROVEN_RAW, claimed_digest: 5 }]) {
      const { record, failure } = await readAnchorRecord({ client: stubClient(raw) });
      expect(record).toBeNull();
      expect(failure).toBe("unexpected_response");
    }
  });

  it("times out instead of hanging a public route", async () => {
    const hanging: AnchorReadClient = {
      readContract: () => new Promise(() => {})
    };
    const { record, failure } = await readAnchorRecord({ client: hanging, timeoutMs: 20 });
    expect(record).toBeNull();
    expect(failure).toBe("read_failed");
  });
});

describe("onchain evidence API response", () => {
  it("builds a verified response for a proven record", async () => {
    const { record } = await readAnchorRecord({ client: stubClient(PROVEN_RAW) });
    const response = buildResponse({ record, failure: null }, () => new Date("2026-09-27T00:00:00Z"));

    expect(response.readFailed).toBe(false);
    expect(response.readError).toBeNull();
    expect(response.comparison.verdict).toBe("MATCHES_VERIFIED_REFERENCE");
    expect(response.anchorId).toBe(1);
    expect(response.contractAddress).toBe("0x246813806cD01d17f2995DAF9e0aCC1DaC31c488");
    expect(response.readAt).toBe("2026-09-27T00:00:00.000Z");
  });

  it("builds a safe unavailable response when the read failed", () => {
    const response = buildResponse({ record: null, failure: "read_failed" });

    expect(response.readFailed).toBe(true);
    expect(response.record).toBeNull();
    expect(response.comparison.verdict).toBe("READ_UNAVAILABLE");
    expect(response.readError).toBe("The Studionet read did not complete.");
    expect(response.readError).not.toMatch(/stack|at Object|Error:/);
  });

  it("distinguishes an uninterpretable response from a transport failure", () => {
    const response = buildResponse({ record: null, failure: "unexpected_response" });
    expect(response.readError).toBe(
      "The Studionet node returned a response this release cannot interpret."
    );
  });

  it("never reports a failed read as a verified match", () => {
    const response = buildResponse({ record: null, failure: "read_failed" });
    expect(compareAnchorToReference(response.record).verdict).toBe("READ_UNAVAILABLE");
    expect(response.comparison.verdict).not.toBe("MATCHES_VERIFIED_REFERENCE");
  });
});

describe("onchain evidence module introduces no write path", () => {
  const files = [
    "lib/onchain-evidence.ts",
    "lib/scout-anchor-config.ts",
    "lib/scout-anchor-reader.ts",
    "app/api/onchain-evidence/route.ts",
    "components/evidence/onchain-evidence-section.tsx"
  ];

  const forbidden = [
    "writeContract",
    "deployContract",
    "simulateWriteContract",
    "createAccount",
    "generatePrivateKey",
    "privateKey",
    "signTransaction",
    "signMessage",
    "metamask",
    "MetaMask",
    "walletConnect"
  ];

  for (const file of files) {
    it(`${file} contains no signing, wallet or transaction-submission path`, () => {
      const source = readFileSync(path.resolve(__dirname, "..", file), "utf8");
      for (const token of forbidden) {
        expect(source, `${file} must not reference ${token}`).not.toContain(token);
      }
    });
  }

  it("the API route accepts no client-controlled contract, anchor id or method", () => {
    const source = readFileSync(
      path.resolve(__dirname, "..", "app", "api", "onchain-evidence", "route.ts"),
      "utf8"
    );
    // The handler must not read request input of any kind.
    expect(source).not.toContain("searchParams");
    expect(source).not.toContain("request.nextUrl");
    expect(source).not.toContain("params");
    expect(source).not.toMatch(/export async function (POST|PUT|PATCH|DELETE)/);
  });

  it("the UI offers no anchor, verify, connect or sign control", () => {
    const source = readFileSync(
      path.resolve(__dirname, "..", "components", "evidence", "onchain-evidence-section.tsx"),
      "utf8"
    );
    for (const phrase of [
      "Connect wallet",
      "Anchor manifest",
      "Verify anchor",
      "private key",
      "Private key"
    ]) {
      expect(source, `UI must not offer ${phrase}`).not.toContain(phrase);
    }
  });
});
