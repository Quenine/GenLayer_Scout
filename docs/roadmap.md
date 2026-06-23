# GenLayer Scout Roadmap

The roadmap favors local workflow reliability before external integration. Scout should remain useful even when every value is manually entered.

## v0.1 - Local builder record

- Manual contract experiment ledger
- Supplied contribution category reference list and planning states
- Single evidence pack draft with Markdown export
- Dated build log
- Versioned browser local-storage persistence
- Corrupted-storage recovery and workspace reset

## v0.1.1 - Product hardening

- Edit existing contract experiments while preserving `createdAt` and updating `updatedAt`
- Copy controls for deployed contract addresses and transaction hashes
- Long address/hash wrapping for desktop and mobile layouts
- Single full-workspace JSON export/import with runtime validation
- Evidence pack generation from a selected contract experiment
- Copy Markdown and download Markdown actions
- Generated date and manual-evidence note in the Markdown report
- First-use panel explaining the local-first workflow
- Browser QA checklist for the main v0.1.1 flows

## v0.2 - GenLayer Intelligent Contract verifier

Goal: help builders check manually recorded Intelligent Contract evidence without pretending Scout has Portal authority.

Possible scope, pending confirmed interfaces and semantics:

- Read-only verifier for a manually entered contract address and transaction hash
- Clear result states: verified, not found, unavailable, or manually recorded only
- Side-by-side display of user-entered values and verifier observations
- Evidence completeness checks that do not estimate Portal points or review outcomes
- Exportable verifier notes inside evidence packs

Do not start this work until an official supported source for verification is confirmed.

## Later local workflow improvements

- Save multiple named evidence packs
- Link build log entries to experiments and evidence packs
- Structured test case records with input, expected result, observed result, and evidence link
- Milestone snapshots and diffs
- Benchmark result collections
- Reusable evidence templates by contribution category
- Improve keyboard navigation and complete an accessibility review

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
