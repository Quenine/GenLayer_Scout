# GenLayer Scout

GenLayer Scout is a local-first workbench for people building and documenting contributions around GenLayer. It keeps the practical records that are easy to lose between a GenLayer Studio experiment and a later Portal submission: the Python contract file, deployed contract address, transaction hash, observed transaction state, screenshots, test notes, limitations, and next milestone.

## Why it exists

GenLayer Studio is a developer environment for writing, deploying, and testing Python Intelligent Contracts. The work required for a useful contribution often extends beyond the contract itself: builders need to preserve what they tested, which transaction reached accepted, consensus, or finalized state, where the evidence lives, and how the work fits a Portal contribution category.

Scout provides one small local workspace for that record-keeping. It is deliberately manual in v0.1.1 so the provenance of every value is clear.

## v0.1.1 scope

- Dashboard summary derived from the current local workspace
- Concise first-use panel explaining the local/manual workflow
- Contract experiment ledger with create, edit, delete, copy, search, and state filtering
- Experiment states: drafted, deployed, accepted, consensus, finalized, and failed
- Contribution lane tracker using only the categories, point ranges, and pioneer labels supplied in the project brief
- Contribution lane planning states: Watching, Building, Submitted, Accepted, and Deferred
- Single evidence pack draft that can generate Markdown from a selected contract experiment
- Submission readiness checklist with Ready, Needs evidence, and Incomplete states
- Non-blocking warnings for weak placeholder terms such as test, none, lorem, placeholder, and demo only
- Copy Markdown and download Markdown actions
- Full-workspace JSON export and validated JSON import
- Dated build log for progress, findings, bugs, and lessons
- Browser `localStorage` persistence with corrupted-storage recovery
- Responsive desktop and mobile layouts, including long address/hash handling

The workspace starts without invented experiments, transactions, or build history. Contribution categories are the only seeded reference data.

## Local-first data model

Scout stores one versioned JSON workspace under `genlayer-scout.workspace.v1` in browser local storage. The workspace contains:

- `schemaVersion`
- contract experiments
- contribution lane planning states
- one evidence pack draft
- build log entries

The export action wraps that workspace in a JSON backup file with app name, schema version, and export timestamp. Import validates the JSON before replacing the current browser workspace.

## What it does not do

Scout v0.1.1 does not:

- connect to GenLayer Studio
- query or verify a contract address or transaction hash
- determine whether a transaction is actually accepted, in consensus, finalized, or failed
- read from or submit to the GenLayer Portal
- predict points, eligibility, review outcomes, or rewards
- provide authentication, cloud backup, synchronization, or team access
- store multiple evidence drafts yet

Every experiment and evidence value is entered by the builder and must be checked against its original source. The readiness checklist only checks whether the local draft appears complete enough to review; it does not verify truth, Portal eligibility, or acceptance.

## Setup

Requirements: a current Node.js LTS release and npm.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Quality checks:

```bash
npm run lint
npm run build
```

Production preview:

```bash
npm start
```

## Project structure

```text
app/
  build-log/          Build log route
  evidence/           Evidence pack route
  opportunities/      Contribution lane route
  runs/               Contract experiment route
components/
  build-log/          Build log form
  dashboard/          Dashboard summary components
  evidence/           Evidence form, readiness checklist, Markdown preview
  experiments/        Experiment form and responsive ledger
  shared/             Shared field utilities such as copyable values
lib/
  dashboard.ts        Derived dashboard statistics
  evidence-quality.ts Evidence readiness and placeholder warning logic
  evidence-report.ts  Markdown report generation
  seed-data.ts        Supplied contribution category reference data
  storage.ts          Workspace parsing, validation, load, save, backup logic
  types.ts            Domain types and literal constants
scripts/
  prepare-submission.ts  Generates submission drafts and importable sample data
docs/
  sample-data/          Generated local backup JSON for app import testing
  submissions/          Generated Portal/social/community draft materials
  browser-qa-checklist.md
  build-log.md
  evidence-template.md
  roadmap.md
```

## Submission preparation script

Generate steward-review-friendly draft materials and importable local test data with:

```bash
npm run prepare:submission
```

The script writes:

- `docs/submissions/genlayer-scout-project.md`
- `docs/submissions/genlayer-scout-demo-script.md`
- `docs/submissions/x-build-thread.md`
- `docs/submissions/community-post.md`
- `docs/submissions/portal-fields.md`
- `docs/sample-data/genlayer-scout-local-backup.json`

The generated backup JSON follows the app's normal export/import shape. To test it in the app:

1. Run `npm run dev` and open the dashboard.
2. Use Local backup -> Import JSON.
3. Select `docs/sample-data/genlayer-scout-local-backup.json`.
4. Confirm the replacement warning.
5. Review the imported experiment, contribution lanes, evidence pack, and build log entries.

The generated files intentionally use `TODO:` placeholders for contract addresses, transaction hashes, screenshots, repository links, demo links, and QA results. Do not submit any generated material until every TODO placeholder has been replaced with real evidence.

## Contribution and submission evidence checklist

Before treating a generated pack as submission-ready, verify:

- [ ] The contribution title describes the actual work.
- [ ] The selected Portal category fits the contribution.
- [ ] The Studio contract file name is exact, or the submission explains why no contract experiment applies.
- [ ] The deployed contract address is copied from the original result, or the draft explains why no address applies.
- [ ] The transaction hash is copied from the original result, or the draft explains why no hash applies.
- [ ] The recorded accepted, consensus, finalized, or failed state was directly observed.
- [ ] Screenshots and evidence links are accessible and relevant.
- [ ] Test inputs, expected behavior, and observed outputs are described.
- [ ] Limitations and unverified assumptions are stated plainly.
- [ ] The next milestone is concrete.
- [ ] Portal submission notes include reproduction or reviewer context where useful.
- [ ] No generated placeholder text remains in the Markdown.
- [ ] The readiness checklist shows Ready, or every remaining Needs evidence item has an intentional reason.
- [ ] Any quality guard warnings have been rewritten with specific evidence.
- [ ] The Markdown's manual-evidence note is still accurate for the submission.

## Roadmap

The current roadmap is maintained in [docs/roadmap.md](docs/roadmap.md). The next major product target is a v0.2 GenLayer Intelligent Contract verifier, but only as a clearly labeled read-only/manual-assist feature after supported verification semantics are confirmed. Scout should continue to distinguish manual records from externally checked data.


