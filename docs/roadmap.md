# GenLayer Scout Roadmap

The roadmap favors local workflow reliability before external integration.

## v0.1 - Local builder record

- Manual contract experiment ledger
- Supplied contribution category reference list and planning states
- Single evidence pack draft with Markdown export
- Dated build log
- Versioned browser local-storage persistence
- Corrupted-storage recovery and workspace reset

## v0.2 - Complete the local workflow

- Edit existing contract experiments
- Save multiple named evidence packs
- Export and import the complete workspace as JSON
- Evidence completeness checks without claiming external verification
- Link build log entries to experiments and evidence packs
- Improve keyboard navigation and complete an accessibility review

## v0.3 - Reproducible evidence

- Structured test case records with input, expected result, observed result, and evidence link
- Milestone snapshots and diffs
- Benchmark result collections
- Reusable evidence templates by contribution category
- Optional checksums for exported evidence files

## Future integration criteria

A GenLayer or Portal integration should only be proposed after confirming:

1. An official supported interface exists.
2. The meaning and lifecycle of returned transaction states are documented.
3. Read and write permissions are explicit.
4. Errors, stale data, and unavailable services can be represented honestly.
5. Manual records remain distinguishable from externally verified data.

Potential work after those criteria are met:

- Read-only transaction lookup
- Contract address and transaction hash verification
- Import of selected Studio or network evidence
- Portal submission handoff through an official supported path

## Product principles

1. Never present manually entered data as verified network data.
2. Keep source evidence separate from the narrative generated from it.
3. Do not estimate Portal points or review outcomes.
4. Preserve a useful local-only mode.
5. Prefer exportable, inspectable data over opaque automation.
