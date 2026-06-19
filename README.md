# GenLayer Scout

GenLayer Scout is a local-first workbench for people building and documenting contributions around GenLayer. It keeps the practical records that are easy to lose between a GenLayer Studio experiment and a later Portal submission: the Python contract file, deployed contract address, transaction hash, observed transaction state, screenshots, test notes, limitations, and next milestone.

## Why it exists

GenLayer Studio is a developer environment for writing, deploying, and testing Python Intelligent Contracts. The work required for a useful contribution often extends beyond the contract itself: builders need to preserve what they tested, which transaction reached accepted, consensus, or finalized state, where the evidence lives, and how the work fits a Portal contribution category.

Scout provides one small local workspace for that record-keeping. It is deliberately manual in v0.1 so the provenance of every value is clear.

## v0.1 scope

- Dashboard summary derived from the current local workspace
- Contract experiment ledger with drafted, deployed, accepted, consensus, finalized, and failed states
- Contribution lane tracker using only the categories, point ranges, and pioneer labels supplied in the project brief
- Evidence pack editor that produces a plain Markdown submission draft
- Dated build log for progress, findings, bugs, and lessons
- Browser `localStorage` persistence
- Responsive desktop and mobile layouts

The workspace starts without invented experiments, transactions, or build history. Contribution categories are the only seeded reference data.

## What it does not do

Scout v0.1 does not:

- connect to GenLayer Studio
- query or verify a contract address or transaction hash
- determine whether a transaction is actually accepted, in consensus, finalized, or failed
- read from or submit to the GenLayer Portal
- predict points, eligibility, review outcomes, or rewards
- provide authentication, cloud backup, synchronization, or team access

Every experiment and evidence value is entered by the builder and must be checked against its original source.

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
  evidence/           Evidence form and Markdown preview
  experiments/        Experiment form and responsive ledger
lib/
  dashboard.ts        Derived dashboard statistics
  evidence-report.ts  Markdown report generation
  seed-data.ts        Supplied contribution category reference data
  storage.ts          Workspace parsing, validation, load, and save logic
  types.ts            Domain types and literal constants
docs/
  build-log.md
  evidence-template.md
  roadmap.md
```

## Local data behavior

Scout stores one versioned JSON workspace under `genlayer-scout.workspace.v1` in browser local storage. The saved object is validated before it is used. Invalid or corrupted JSON is removed and replaced with a clean workspace, with a warning shown in the interface.

The dashboard includes a deliberate reset action. Resetting clears experiments, build notes, lane planning states, and the evidence draft, while restoring the supplied contribution category reference list.

Browser storage is not a backup. Keep original screenshots, transaction output, repositories, and test artifacts outside Scout.

## Contribution and submission evidence checklist

Before treating a generated pack as submission-ready, verify:

- [ ] The contribution title describes the actual work.
- [ ] The selected Portal category fits the contribution.
- [ ] The Studio contract file name is exact.
- [ ] The deployed contract address is copied from the original result.
- [ ] The transaction hash is copied from the original result.
- [ ] The recorded accepted, consensus, finalized, or failed state was directly observed.
- [ ] Screenshots and evidence links are accessible and relevant.
- [ ] Test inputs, expected behavior, and observed outputs are described.
- [ ] Limitations and unverified assumptions are stated plainly.
- [ ] The next milestone is concrete.
- [ ] Portal submission notes include reproduction or reviewer context where useful.
- [ ] No generated placeholder text remains in the Markdown.

## Roadmap

The current roadmap is maintained in [docs/roadmap.md](docs/roadmap.md). The next useful work is better local editing and export. Live read integrations should only be added when an official supported interface and its data semantics are confirmed.
