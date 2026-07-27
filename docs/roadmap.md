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
