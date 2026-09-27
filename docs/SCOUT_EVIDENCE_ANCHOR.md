# ScoutEvidenceAnchor

`contracts/scout_evidence_anchor.py` is the first Intelligent Contract in
GenLayer Scout. It stores a claim about a public Scout Evidence Manifest v1
document on GenLayer, and later lets validator consensus decide whether that
claim actually matches the document as it exists on the public web.

The contract never re-derives the claim from the submitter's word. It refetches
the manifest, recomputes the digest itself, and requires every validator to
independently reach the same observation before the anchor settles.

## Why an Intelligent Contract

A plain hash stored onchain proves only that *someone* stored a digest. It does
not prove the digest still describes a reachable document, and it cannot detect
a manifest being replaced after the fact. GenLayer Intelligent Contracts add
two things that matter here:

- **GenLayer-native web access.** `gl.nondet.web.get` reads the public manifest
  from inside the contract. No HTTP client library, no oracle, no API key.
- **Equivalence principle consensus.** The leader fetches the document once and
  every validator independently fetches it again. The write is only accepted if
  all of them agree. A leader that lies about what it saw is outvoted, not
  trusted.

No LLM is used anywhere in this contract. Every verdict is a deterministic
function of bytes that were fetched.

## Model

One `Anchor` record per claim, in a `DynArray`. Anchor ids are sequential
integers starting at 1. There is no update and no delete: a second claim is a
second anchor, so the history of what was asserted and when is preserved.

| Field | Meaning |
| --- | --- |
| `anchor_id` | Sequential id, starting at 1 |
| `submitter` | `gl.message.sender_address` of whoever anchored it |
| `manifest_url` | `https://` URL of the manifest document |
| `claimed_digest` | The digest being claimed, stored lowercase |
| `transaction_hash` | The claimed transaction hash, casing preserved |
| `contract_address` | The claimed contract address, `""` when not applicable |
| `recorded_status` | The claimed Scout status at anchor time |
| `verification_state` | `ANCHORED`, `VERIFIED`, `MISMATCH`, `INVALID`, `UNAVAILABLE` |
| `observed_digest` | The digest the contract actually computed |
| `observed_transaction_hash` | Transaction hash read from the manifest |
| `observed_contract_address` | Contract address read from the manifest |
| `observed_status` | Status read from the manifest |
| `reason_code` | Machine-readable explanation, `""` when verified |

`observed_*` fields always hold what the contract saw, so a `MISMATCH` record
shows both sides of the disagreement without needing to refetch anything.

## States and reason codes

| State | Retryable | Meaning |
| --- | --- | --- |
| `ANCHORED` | yes | Stored, never verified |
| `VERIFIED` | no | Manifest fetched, self-consistent, and matches the claim |
| `MISMATCH` | no | Reachable and parseable, but content disagrees |
| `INVALID` | no | Document cannot be trusted or is not a supported manifest |
| `UNAVAILABLE` | yes | The document could not be read at all |

`ANCHORED` and `UNAVAILABLE` are the only retryable states. Once an anchor
settles as `VERIFIED`, `MISMATCH`, or `INVALID` it is final, because re-running
would let a later, different document silently overwrite a settled verdict.
Re-anchor instead.

| Reason code | State | Cause |
| --- | --- | --- |
| `WEB_UNAVAILABLE` | `UNAVAILABLE` | Fetch failed, or HTTP status was an error |
| `MANIFEST_UNPARSEABLE` | `INVALID` | Body is not valid JSON |
| `MANIFEST_STRUCTURE_INVALID` | `INVALID` | Required fields missing or wrongly typed |
| `UNSUPPORTED_FORMAT` | `INVALID` | `format` is not the Scout manifest format |
| `UNSUPPORTED_VERSION` | `INVALID` | `payload.version` is not 1 |
| `UNSUPPORTED_ALGORITHM` | `INVALID` | `integrity.algorithm` is not `sha256` |
| `UNSUPPORTED_CANONICALIZATION` | `INVALID` | Canonicalization is not the supported one |
| `DIGEST_NOT_COMPUTABLE` | `INVALID` | Payload cannot be canonicalized |
| `DIGEST_MISMATCH` | `MISMATCH` | Recomputed digest differs from the manifest's or the claim's |
| `TRANSACTION_MISMATCH` | `MISMATCH` | Manifest transaction hash differs from the claim |
| `ADDRESS_MISMATCH` | `MISMATCH` | Manifest contract address differs from the claim |
| `STATUS_MISMATCH` | `MISMATCH` | Manifest status differs from the claim |
| `SNAPSHOT_MISMATCH` | `MISMATCH` | The manifest's own verification snapshot disagrees with the claim |

Mismatch reasons are evaluated in that order, so a record always reports the
most fundamental disagreement first.

## API

### `anchor_manifest(manifest_url, claimed_digest, transaction_hash, contract_address, recorded_status) -> int`

Deterministic. Validates and stores; never touches the network or an LLM.
Returns the new anchor id.

Rejected with a `UserError` unless: the URL is `https://` with a host, the
digest is 64 hex characters, the transaction hash is `0x` + 64 hex characters,
the contract address is `""` or `0x` + 40 hex characters, and the status is one
of the Scout statuses (`drafted`, `deployed`, `accepted`, `consensus`,
`finalized`, `failed`).

### `verify_anchor(anchor_id)`

Non-deterministic. Runs leader/validator consensus, then settles the anchor
deterministically from the agreed observation. Rejects unknown ids, non-integer
ids, and already-settled anchors.

### Views

- `get_anchor(anchor_id)` — the full record. Unknown ids raise rather than
  returning an empty record, so a typo cannot be mistaken for a missing claim.
- `get_anchor_count()` — how many anchors exist; the next id is this plus 1.
- `get_anchor_state(anchor_id)` — just the state.
- `get_anchor_ids_by_submitter(submitter)` — ids for an address, oldest first.
  A linear scan; no secondary index is kept, so the array stays the single
  source of truth.
- `supported_manifest_profile()` — the format, version, algorithm,
  canonicalization, statuses and states this build verifies.
- `canonicalize_payload(payload_json)` / `recompute_payload_digest(payload_json)`
  — pure offline diagnostics. They run the exact code the consensus path uses,
  so independent tooling can ask this contract to canonicalize or digest a
  payload and compare. They perform no network or storage access.

## Canonicalization

The contract reimplements the Scout canonicalizer
(`genlayer-scout-json-sorted-keys-v1`) rather than approximating it, because a
digest only matches if the bytes match exactly:

- Object keys are sorted by **UTF-16 code unit**, matching JavaScript's default
  string sort rather than Python's code point sort.
- Array order is preserved.
- Numbers are formatted as ECMAScript `Number::toString` does, including the
  switch to exponential form outside `1e-7 < |x| < 1e21` and the rounding of
  integers beyond `Number.MAX_SAFE_INTEGER` through a double. This is why the
  contract formats numbers itself instead of using `json.dumps`.
- Strings keep only the escapes JSON requires plus `\u007f`; non-ASCII is
  emitted literally, and lone surrogates are re-escaped the way
  `JSON.stringify` does.
- Non-finite numbers, which Python's `json` accepts by default and JSON does
  not, make the digest uncomputable rather than being silently written.

The result is hashed with SHA-256 over its UTF-8 encoding. The golden vectors in
`tests/fixtures/evidence-manifest/` pin the contract against digests computed
independently by the TypeScript canonicalizer and `node:crypto`.

## Hexadecimal casing

Digests are hexadecimal, so `claimed_digest` is stored lowercase and the
published digest is lowercased before comparison. Transaction hashes and
addresses are **stored with the exact casing they were submitted or observed
in**, but **compared case-insensitively**, because `0xAB` and `0xab` denote the
same bytes and a casing difference is not a disagreement. Scout statuses are
compared exactly, since they are not hexadecimal.

Note the asymmetry: the digest field is casing-insensitive, but changing the
casing of a hash *inside* the payload is a real content change, because the
digest covers the payload bytes.

## Consensus

`verify_anchor` uses `gl.vm.run_nondet_unsafe`. Storage is unavailable inside
non-deterministic code, so the claim is snapshotted into plain data before
consensus starts, and the verdict is applied to storage afterwards.

The leader and each validator call the same `_observe_manifest`, which fetches,
parses, and reduces the document to a 16-field normalized observation: eight
booleans for what was accessible, parseable, well-formed, and supported, and
eight strings for the digests, hashes, address and statuses.

Validators compare **results, not prose**. The leader's conclusion is never
trusted; `_classify` runs again on the stored observation, and every validator
runs it against its own observation. A validator returns `False` — never an
exception — on a malformed leader result or any internal failure, so a
validator that fails is counted as disagreeing rather than crashing consensus.

`run_nondet_unsafe` runs the validator without the extra error sandbox, which is
why the validator body is written defensively.

## Trust model and limitations

- **No authorship.** A `VERIFIED` anchor means the document at that URL is
  internally consistent and says what the anchor said. It does not mean anyone
  in particular wrote it, or that the submitter is the author.
- **Not a timestamp.** The contract does not observe block time and makes no
  claim about when the document was first published. An anchor proves what was
  observed at verification time.
- **Trust is per-URL.** Verification is bound to the exact `https://` URL. The
  contract does not follow redirects, resolve `ipfs://`, check TLS
  certificates, or detect a compromised host. A host that serves different
  content to different validators produces a disagreement and no settlement.
- **Settles on first success or first definitive answer.** A transient network
  problem is retryable, but a document that answers is answered for good.
- **Public documents only.** The manifest is fetched anonymously; documents
  requiring authentication cannot be verified.
- **Append-only, no pagination.** `get_anchor_ids_by_submitter` scans the whole
  array. That is fine at Scout's scale and would need an index later.
- **The digest producer must be correct.** This contract recomputes *standard*
  SHA-256, because the manifest protocol declares `algorithm: "sha256"`. A
  publisher whose digest implementation is wrong will be reported as
  `DIGEST_MISMATCH`, which is the intended behaviour. See
  `tests/fixtures/evidence-manifest/README.md` for a known instance.

## Tests

```bash
pip install -r requirements.txt
pytest
```

`tests/direct/test_scout_evidence_anchor.py` runs the real deployed contract
through the GenLayer SDK in Direct Mode and covers canonicalization against the
golden vectors, every reason code, hexadecimal casing, settlement and retry
rules, validator agreement and disagreement, and the picklability of the
consensus closures.

On Windows, set `PYTHONIOENCODING=utf-8` and `PYTHONUTF8=1` when running
`genvm-lint`, which otherwise fails on console encoding.

## Hosted Studionet deployment

The contract is deployed on GenLayer Studionet (chain id `61999`) at
`0x246813806cD01d17f2995DAF9e0aCC1DaC31c488`. Anchor `1` carries the published
v0.3.1 Evidence Manifest and has settled as `VERIFIED` with an empty reason code.

| Item | Value |
| --- | --- |
| Network | GenLayer Studionet (chain id `61999`) |
| RPC | `https://studio.genlayer.com/api` |
| Contract | `0x246813806cD01d17f2995DAF9e0aCC1DaC31c488` |
| Anchor ID | `1` |
| Deployment tx | `0xb73260af0e5ae5b1e4729dc5017bb8241763097e812d258573cb09fb5e677412` |
| Anchor tx | `0xf34788da4e73e1b46af966c6cdc51132f24ead45f7415da2625261c5c7e8836a` |
| Verification tx | `0x39c0e897be9f5be5614330c028a2103eb5d2bcafa5e7c8090e6311fbd25df876` |
| Public manifest | `https://github.com/Quenine/GenLayer_Scout/releases/download/v0.3.1/genlayer-scout-v0.3.1-evidence-manifest.json` |
| Expected digest | `b9163889a1cf1ab99cd33ae6f3783e8a7cfcb472f7896fe0b8d464c353f8ed63` |
| Manifest status | `finalized` |

These values are pinned in `lib/scout-anchor-config.ts` and are shown to
reviewers in the app's collapsed published-reference section.

Explorer deep links use the forms below, both verified against the live
explorer. Note that the `chains.studionet` entry exported by `genlayer-js`
advertises a different explorer host, so the app uses its own pinned base URL
rather than the SDK's.

- Address: `https://explorer-studio.genlayer.com/address/<address>`
- Transaction: `https://explorer-studio.genlayer.com/tx/<hash>`

## Reading the anchor from the app (v0.4)

v0.4 adds a read-only Onchain Evidence section to the Evidence page. It reads
the finalized state of anchor `1` and compares it against the published
reference above.

- **Server-side read.** `app/api/onchain-evidence/route.ts` calls
  `get_anchor(1)` through `genlayer-js` with `TransactionHashVariant.LATEST_FINAL`
  and an 8-second timeout, so the displayed value is a settled state rather than
  a pending or speculative one.
- **Fixed target.** The route takes no client input. The contract address,
  anchor id, and method are server constants, so a browser cannot redirect the
  read at another contract or function.
- **Server-only SDK.** `lib/scout-anchor-reader.ts` is the only module that
  imports `genlayer-js`; the client component imports only the pure
  configuration and comparison helpers, keeping the SDK and its transitive
  dependencies out of the browser bundle.
- **No caching.** The route is dynamic and responds with `no-store`, so the
  page never presents a stale record as current.
- **Untrusted input.** Live network data is treated as untrusted external
  input. Every field is shape-checked by `normalizeAnchorRecord`, and the client
  re-validates the response with the same pure normalizer, so a malformed record
  can never render as a verified state.
- **Comparison rules.** Digests and the manifest URL are compared exactly.
  Addresses and transaction hashes are compared case-insensitively after
  validating their `0x` hexadecimal form.
- **Verdicts.** `READ_UNAVAILABLE` for a missing, failed, or malformed read;
  `NOT_VERIFIED` for any state other than `VERIFIED`; `LIVE_RECORD_DIFFERS` when
  a `VERIFIED` record disagrees with the reference on any compared field; and
  `MATCHES_VERIFIED_REFERENCE` only when every compared field agrees. A
  difference is reported as a difference, with the differing fields listed, and
  is never described as tampering or wrongdoing.
- **Read-only.** The module contains no wallet, signing, deployment, or
  transaction-submission path, and this is enforced by a source-level test.

`submitter` is a live-only field: it is displayed but never compared, because it
is not part of the published reference.

Manual browser QA on a Vercel preview has not yet been performed, so release QA
for v0.4 is still open. This view reports only what the contract currently
records; see [Trust model and limitations](#trust-model-and-limitations).

