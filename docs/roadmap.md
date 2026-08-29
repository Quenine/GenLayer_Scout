# GenLayer Scout roadmap

## v0.1 - Local builder record (completed)

- Manual contract experiment ledger
- Contribution lane planning
- Evidence-pack Markdown export
- Build log and versioned local storage

## v0.1.1 - Product hardening (completed)

- Experiment editing and copy controls
- Responsive long-value handling
- Validated JSON backup/import and legacy migration
- Evidence readiness and quality guidance
- Browser QA checklist

## v0.2 - Read-only verification (completed)

- Studionet, Bradbury, Asimov, and Custom RPC presets
- Profile-specific status dialects: confirmed positional Studionet and documented object-form Bradbury/Asimov/Custom
- Capability-aware receipt and contract-state checks, with Studionet methods explicitly unsupported
- Honest `verified`, `observed`, `mismatch`, `not_found`, `unavailable`, and `manual_only` outcomes
- Raw status and status-code preservation
- Receipt recipient separated from contract lookup
- HTTP(S) and transaction-hash validation, 12-second request timeout, and safe errors
- RPC profile, successful dialect, and capability metadata in backups and evidence Markdown
- Exact request-body, comparison, observation, contract lookup, storage migration, and evidence-report tests
- Push and pull-request verification workflow

v0.2 remains read-only. It cannot establish authorship, contract behavior, Portal acceptance, eligibility, points, or rewards.


## v0.3 - Evidence Manifest v1 (completed)

### Batch 1 - Protocol core (completed)

- Deterministic, versioned portable JSON envelope with sorted-key canonicalization and SHA-256 payload digest
- Contribution context, implementation references, experiment details, immutable RPC snapshot and verification output, and supporting evidence
- Generator provenance recording the Scout release that produced the artifact
- Local integrity recomputation only; no storage, network, signing, wallet, Portal, or UI changes
- [Protocol documentation](EVIDENCE_MANIFEST_V1.md)

### Batch 2A - Generation and download (completed)

- Portable manifest section on the Evidence page with implementation reference fields
- Prerequisite validation before generation
- Manifest envelope generation with `createdAt` at generation time
- Preview of key manifest fields including SHA-256 digest
- Deterministic JSON download with sanitized filename
- Browser-compatible SHA-256 implementation (no `node:crypto` dependency)

### Batch 2B - Independent inspection (completed)

- Independent read-only manifest inspection on the Evidence page
- Valid / modified / invalid / unsupported status presentation
- Local file handling with size and filename limits
- Safe digest and detail display, including raw JSON view
- Inspection never imports into the workspace or localStorage

### Release hardening (completed)

- User-facing copy audit for accurate, non-overclaiming integrity wording
- Shared `APP_VERSION` version reference (v0.3.0)
- README and roadmap updated for v0.3
- Manual release smoke-test checklist

v0.3 manifests are tamper-evident, not tamper-proof. A valid result does not prove authorship, ownership, or the truthfulness of linked evidence; inspection performs no current RPC verification.

## Evidence Manifest v1 - deferred (not required for v0.3)

- Manifest history and saved storage of inspected/generated manifests
- Possible later improvement; deliberately omitted from v0.3

## Later local workflow improvements

- Multiple named evidence packs
- Links between build-log entries, experiments, and evidence packs
- Structured test-case records and milestone snapshots
- Accessibility review

## Future integration criteria

Any write integration or Portal handoff requires an official supported interface, explicit permissions, documented lifecycle semantics, honest failure states, and continued separation between manual and externally observed data.

## Product principles

1. Never present manually entered data as verified network data.
2. Keep source evidence separate from generated narrative.
3. Do not estimate Portal points or review outcomes.
4. Preserve a useful local-only mode.
5. Prefer exportable, inspectable data over opaque automation.
