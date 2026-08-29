# Evidence Manifest v1

Evidence Manifest v1 is a portable JSON envelope for a GenLayer Scout contribution record. It binds contribution context, implementation references, experiment details, the saved immutable RPC verification snapshot and output, and supporting evidence to a SHA-256 digest.

It is tamper-evident only. It is not tamper-proof and does not authenticate a person, prove authorship, sign data, or establish contract behavior, Portal acceptance, eligibility, points, or rewards.

## Envelope

```ts
interface EvidenceManifestEnvelopeV1 {
  format: "genlayer-scout-evidence-manifest";
  payload: EvidenceManifestPayloadV1;
  integrity: {
    algorithm: "sha256";
    canonicalization: "genlayer-scout-json-sorted-keys-v1";
    digest: string;
  };
}
```

`payload.version` is `1`. Its top-level fields are `generator`, `contributionContext`, `implementationReferences`, `experimentDetails`, `verification`, and `supportingEvidence`. When no experiment is selected, the implementation, experiment, and verification fields are `null`. The verification value is the recorded `ExperimentVerification`, including its immutable `snapshot`; it is never recomputed or fetched while creating a manifest.

## Generator

The payload includes a `generator` object recording which GenLayer Scout release produced the artifact:

```ts
generator: {
  name: "GenLayer Scout";
  version: string;
}
```

`name` is always `"GenLayer Scout"` and `version` is the Scout `APP_VERSION` at generation time. It is informational provenance only and is part of the signed-over payload, so changing it changes the digest. It does not prove authorship or authenticity. A manifest that is missing `generator`, has the wrong `name`, or has an empty `version` is invalid.

## Canonicalization and verification

The digest is lowercase hexadecimal SHA-256 over the canonicalized `payload` only. The envelope and integrity object are not included in that digest.

`genlayer-scout-json-sorted-keys-v1` means:

- Object keys are sorted lexicographically at every depth.
- Arrays retain their supplied order.
- Values use standard JSON string escaping and number serialization.
- Only JSON values are accepted; non-finite numbers (`NaN`, `Infinity`), `undefined`, `bigint`, functions, and symbols are rejected.
- Only plain JSON objects are accepted; `Date`, `Map`, `Set`, class instances, and other non-plain objects are rejected.
- Sparse arrays (arrays with holes) are rejected.
- Cyclic object structures are rejected.
- The input is never mutated.

A verifier should check the format, payload version, algorithm, and canonicalization identifiers, canonicalize `payload` using these rules, compute SHA-256, and compare the result exactly with `integrity.digest`. A mismatch means the manifest payload or its declared protocol metadata should not be trusted as unchanged.

## Validation

`validateEvidenceManifestV1` checks structural integrity of the manifest payload:

- **Field types**: Required fields must be present and correctly typed.
- **Generator**: `generator` must be an object with `name === "GenLayer Scout"` and a non-empty `version` of at most 100 characters. An unknown generator version does not make the manifest unsupported; the format version, digest algorithm, and canonicalization identifier remain the compatibility boundaries.
- **Required text fields**: `supportingEvidence.whatWasTested`, `supportingEvidence.knownLimitations`, and `supportingEvidence.nextMilestone` must be non-empty strings after trimming whitespace. An author with no known limitation can record something explicit such as `"None currently identified"`.
- **Transaction hash**: Must be a 32-byte lowercase hex string (`0x` + 64 hex characters).
- **Contract address**: Optional. When present, must be a 20-byte lowercase hex string (`0x` + 40 hex characters). Empty strings are accepted.
- **Timestamps**: `experimentDetails.createdAt` and `updatedAt` must be valid ISO 8601 timestamps.
- **Evidence links**: `supportingEvidence.links` must contain at least one HTTPS or IPFS URL.
- **Enum values**: `experimentDetails.status` and other enum fields must use supported Scout values.
- **Optional text fields**: `experimentDetails.notes` and other text fields not listed above may be empty.
- **Snapshot consistency**: When both `implementationReferences` and `verification` are present, the verification snapshot must match the experiment's transaction hash, contract address, and manual status.
- **Verification consistency**: Impossible states are rejected (e.g., `result=verified` when `transactionFound` is false, or `receiptCapability=unsupported` when `receiptAvailable` is true).

## Inspection

`inspectEvidenceManifestV1` returns one of four statuses:

- **valid**: Supported format/version/algorithm/canonicalization, internally consistent payload, digest matches.
- **modified**: Supported and structurally valid payload, but computed digest differs from the stored digest.
- **invalid**: Malformed or internally inconsistent data (field errors, snapshot mismatches, verification contradictions).
- **unsupported**: Recognized Scout manifest format but using an unsupported version, digest algorithm, or canonicalization scheme.

The `digestMatches` field in the inspection result is always computed accurately, regardless of validation status.

## Limitations

The SHA-256 digest makes the manifest tamper-evident: any modification to the payload changes the digest and can be detected. However, it does not prove authorship, identity, ownership, or authenticity. It does not authenticate the builder, sign data, or establish contract behavior, Portal acceptance, eligibility, points, or rewards.

## Public API

The current core exposes `createEvidenceManifestV1` to build an envelope, `canonicalizeEvidenceManifestJson` and `digestEvidenceManifestPayload` for independent tooling, `verifyEvidenceManifestIntegrity` for an in-process check, `validateEvidenceManifestV1` for structural validation, and `inspectEvidenceManifestV1` for combined format/integrity/validation inspection. It performs no storage, network, signing, wallet, or UI work.

## Generation and download

The Scout UI provides a Portable Manifest section on the Evidence page. It collects optional repository URL, commit SHA, and deployment URL (implementation references), runs prerequisite validation, generates an envelope via `createEvidenceManifestV1`, and offers a deterministic JSON download. The manifest `createdAt` is set to the generation timestamp. Implementation reference fields are held in component state only and are not persisted to the workspace.

## Local inspection

The Scout UI also provides an Inspect Manifest section on the Evidence page. It loads a local `.json` or `.manifest.json` file, reads it in the browser, and runs it through `inspectEvidenceManifestV1`. It presents one of the inspection statuses:

- **Valid**: Structure and internal consistency checks passed, and the payload digest matches the recorded digest.
- **Modified**: Structurally valid, but the current payload does not match the recorded digest.
- **Invalid**: Not a valid Evidence Manifest v1 or contains inconsistent data.
- **Unsupported**: A GenLayer Scout manifest that uses a version, digest algorithm, or canonicalization this release does not support.

Inspection is entirely local and read-only. It never uploads the file, does not write to the workspace or `localStorage`, does not import manifest data into the experiment or evidence forms, and is cleared when a new file is selected or the view is reset.

Inspection does not re-query GenLayer or re-verify on-chain state. A valid digest only means the manifest payload has not changed since the digest was recorded. It does not prove authorship, ownership, or the truthfulness of the linked evidence, and it does not establish contract behavior, Portal acceptance, eligibility, points, or rewards.
