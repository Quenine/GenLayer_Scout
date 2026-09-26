import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { sha256Hex } from "@/lib/sha256";

/**
 * These expected digests are fixed external references for standard SHA-256.
 * They are never derived from Scout's own implementation, so they fail if the
 * implementation ever drifts again.
 */
describe("sha256Hex standard vectors", () => {
  it("matches the published SHA-256 vector for the empty string", async () => {
    expect(await sha256Hex("")).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
  });

  it("matches the published SHA-256 vector for \"abc\"", async () => {
    expect(await sha256Hex("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    );
  });

  it("matches the published SHA-256 vector for \"hello world\"", async () => {
    expect(await sha256Hex("hello world")).toBe(
      "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9"
    );
  });

  it("hashes UTF-8 encoded text rather than UTF-16 code units", async () => {
    // Fixed reference digest for the UTF-8 bytes of these characters.
    expect(await sha256Hex("caf\u00e9 \u2713")).toBe(
      createHash("sha256").update("caf\u00e9 \u2713", "utf8").digest("hex")
    );
    // The same characters encoded as UTF-16 code units must not be hashed.
    expect(await sha256Hex("caf\u00e9 \u2713")).not.toBe(
      createHash("sha256")
        .update(Buffer.from("caf\u00e9 \u2713", "utf16le"))
        .digest("hex")
    );
  });

  it("hashes an astral-plane emoji, NUL, and control characters as UTF-8", async () => {
    const input = "\u{1f680}\u0000\u001f\u007f\u0009\n\"\\";
    expect(await sha256Hex(input)).toBe(
      createHash("sha256").update(input, "utf8").digest("hex")
    );
  });

  it("emits lowercase hexadecimal of exactly 64 characters", async () => {
    const digest = await sha256Hex("abc");
    expect(digest).toHaveLength(64);
    expect(digest).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("sha256Hex agrees with Node crypto", () => {
  const inputs: Array<[string, string]> = [
    ["", "empty string"],
    ["a", "1 byte"],
    ["abc", "3 bytes"],
    ["hello world", "11 bytes"],
    ["x".repeat(55), "55 bytes (last single-block length)"],
    ["x".repeat(56), "56 bytes (forces a second padding block)"],
    ["x".repeat(63), "63 bytes (last double-block length)"],
    ["x".repeat(64), "64 bytes (first multi-block length)"],
    ["x".repeat(65), "65 bytes"],
    ["x".repeat(119), "119 bytes"],
    ["x".repeat(120), "120 bytes"],
    ["x".repeat(1000), "1000 bytes"],
    ["x".repeat(2195), "2195 bytes (golden fixture payload scale)"],
    ["\u00e9\u00e8\u00ea", "multi-byte characters"],
    ["\u{1f680}".repeat(64), "astral-plane characters"],
    ["line1\nline2\r\nline3\ttab", "whitespace and control characters"]
  ];

  for (const [input, label] of inputs) {
    it(`matches node:crypto for ${label}`, async () => {
      expect(await sha256Hex(input)).toBe(
        createHash("sha256").update(input, "utf8").digest("hex")
      );
    });
  }
});

describe("sha256Hex rejects the defective Scout v0.3.0 digest", () => {
  /**
   * Scout v0.3.0 shipped a hand-rolled SHA-256 whose message-length padding
   * wrote the 64-bit bit length into bytes 56..60 instead of 56..63. For an
   * 8-bit message that produced `00 00 00 00 08 00 00 00` where SHA-256
   * requires `00 00 00 00 00 00 00 08`, so every non-empty input hashed to a
   * non-standard value while the empty string still matched.
  /**
   * The exact defective digest Scout v0.3.0 produced for a real manifest is
   * pinned in `evidence-manifest-sha256-compat.test.ts`. Here we only assert
   * that the published empty-string vector is never reused for a real input,
   * which was the only case the defective implementation got right.
   */
  it("never reports the empty-string digest for a non-empty input", async () => {
    const emptyDigest = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
    for (const input of ["a", "abc", "hello world", "x".repeat(64)]) {
      expect(await sha256Hex(input)).not.toBe(emptyDigest);
    }
  });
});
