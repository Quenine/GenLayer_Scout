const HEX_BYTES: string[] = Array.from({ length: 256 }, (_, index) =>
  index.toString(16).padStart(2, "0")
);

/**
 * Returns the Web Crypto implementation backing `sha256Hex`.
 *
 * Evidence Manifest v1 declares `algorithm: "sha256"`, so digests must be
 * standard SHA-256. Delegating to the platform keeps this correct by
 * construction instead of relying on a hand-written compression function.
 *
 * Note: `crypto.subtle` is only exposed in secure contexts, which is why
 * generation and inspection report a clear error instead of a wrong digest
 * when it is unavailable.
 */
function subtleCrypto(): SubtleCrypto {
  const webCrypto = globalThis.crypto;
  if (!webCrypto?.subtle) {
    throw new Error(
      "Web Crypto is unavailable, so a standard SHA-256 digest cannot be computed. Use a secure context (HTTPS or localhost)."
    );
  }
  return webCrypto.subtle;
}

/** Computes the standard SHA-256 digest of `input` as lowercase hex. */
export async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input);
  const digest = await subtleCrypto().digest("SHA-256", bytes);

  let hex = "";
  for (const byte of new Uint8Array(digest)) {
    hex += HEX_BYTES[byte];
  }
  return hex;
}
