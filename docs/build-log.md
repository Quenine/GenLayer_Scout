# GenLayer Scout Build Log

## 2026-06-19 - v0.1 implementation

### Implemented

- Next.js App Router application with TypeScript and Tailwind CSS
- Responsive navigation and local workspace shell
- Contract experiment ledger
- Contribution lane tracker based on the supplied category list
- Evidence pack Markdown generator
- Dated build log
- Browser local-storage persistence

### Initial limitations

- Experiment records could only be created and deleted.
- Storage JSON was parsed without runtime shape validation.
- Initial seed data included invented contract and transaction examples.
- Domain names used generic terms such as `runs` and `opportunities`.
- Evidence output did not include a contribution category or Portal submission notes.

## 2026-06-19 - product and code quality audit

### Code cleanup

- Renamed the core domain model to `ContractExperiment`, `ContributionLane`, `EvidencePack`, and `BuildLogEntry`.
- Added explicit literal constants and types for experiment states, contribution planning states, and build log entry types.
- Added `DashboardSummaryStats` and moved summary calculation out of the page component.
- Split the experiment form, experiment list, evidence form, evidence preview, build log form, and dashboard summary card into focused components.
- Added a dedicated Markdown report builder and a dedicated storage module.
- Removed invented experiment, transaction, evidence, and build log seed records.
- Corrected text encoding artifacts in punctuation.

### Storage behavior

- Added a versioned storage key and runtime shape checks for the saved workspace.
- Added clean recovery when saved JSON is missing, malformed, or structurally invalid.
- Added a visible warning when recovery or saving fails.
- Added an explicit reset action that restores an empty workspace and the supplied contribution lane reference data.

### Product changes

- Rewrote generic dashboard copy as direct workspace instructions.
- Clarified throughout the interface that all records are manual and unverified.
- Added useful first-use states for experiments, contribution lanes, and build notes.
- Added Studio contract file, deployed contract address, transaction hash, observed state, evidence URL, and Portal submission notes to the experiment workflow.
- Added contribution category and Portal submission notes to the evidence pack.
- Improved clipboard failure handling and Markdown placeholders.

## 2026-06-23 - v0.1.1 product hardening

### Implemented

- Added edit support for contract experiments using the same form as creation.
- Added `updatedAt` to experiment records while preserving `createdAt` for existing and edited records.
- Added copy controls and responsive wrapping for long contract addresses and transaction hashes.
- Added full-workspace JSON export and validated import with a replacement warning.
- Added a concise first-use panel on the dashboard.
- Improved evidence pack generation from a selected contract experiment.
- Added generated date and a manual-evidence note to Markdown output.
- Added a browser QA checklist covering the main v0.1.1 flows.

### Remaining limitations

- Only one evidence pack draft is stored.
- Import is a full replacement flow, not a merge flow.
- Browser storage remains the only persistence layer.
- No GenLayer Studio, network, or Portal data is queried or verified.
- v0.2 verifier work depends on confirmed supported GenLayer verification semantics.
