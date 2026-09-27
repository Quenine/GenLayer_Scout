# GenLayer Scout

GenLayer Scout is a local-first workbench for people building and documenting contributions around GenLayer. v0.2 adds profile-aware, read-only lifecycle verification. Studionet uses its confirmed positional transaction-status dialect and skips receipt and contract-state methods because they are not exposed; Bradbury and Asimov use documented object-form requests; Custom supports object-only or conservative Auto compatibility. v0.3 adds the portable Evidence Manifest v1: a deterministic, versioned JSON export with a SHA-256 payload digest, plus an independent local inspection workflow.

Verification persists the RPC profile, successful dialect, lifecycle comparison, and optional-method capabilities. In each verification, every result is bound to a versioned historical snapshot of the checked transaction hash, contract address, and manual status. Editing any of those recorded experiment fields invalidates the saved result; unrelated metadata edits preserve it. Lifecycle verification is independent of receipt and contract-state support and does not prove authorship or contract behavior. Raw RPC response bodies are never exposed. See [verification notes](docs/verification-notes.md) and the [sanitized Studionet finding](docs/findings/studionet-rpc-compatibility.md).

## Why it exists

GenLayer Studio is a developer environment for writing, deploying, and testing Python Intelligent Contracts. The work required for a useful contribution often extends beyond the contract itself: builders need to preserve what they tested, which transaction reached accepted, consensus, or finalized state, where the evidence lives, and how the work fits a Portal contribution category.

Scout provides one small local workspace for that record-keeping. v0.2 keeps manual records separate from optional read-only RPC observations so their provenance remains clear.

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

## v0.2 verification behavior

The Verify route defaults to Studionet and offers Bradbury, Asimov, and Custom profiles. Studionet sends positional status parameters and does not call unsupported optional methods. Bradbury and Asimov use documented object parameters. Custom Auto starts with object form and may retry status positionally after an eligible parameter-shape failure.

A matching safe lifecycle comparison may be `verified` even when receipt and contract-state capabilities are `unsupported`. Receipt recipients remain routing observations only. Lifecycle verification does not prove source code, authorship, ownership, behavior, Portal acceptance, eligibility, points, or rewards.

## v0.3 Evidence Manifest v1

v0.3 adds a portable Evidence Manifest v1. From the Evidence page you can generate a deterministic JSON artifact, download it, and later inspect any `.json` or `.manifest.json` file locally.

- **Portable export**: A versioned JSON envelope binding contribution context, implementation references, experiment details, the saved verification snapshot, and supporting evidence.
- **Snapshot-bound verification**: The manifest records the saved read-only RPC verification, bound to the immutable snapshot (transaction hash, contract address, manual status) it was checked against. It is never re-fetched or recomputed during manifest creation or inspection.
- **Deterministic SHA-256 digest**: Payload keys are canonicalized (sorted) and hashed with standard SHA-256 over UTF-8 bytes. The digest is included in the envelope; any payload change changes the digest, so modification is detectable. As of v0.3.1 the digest is computed with the platform Web Crypto implementation and is reproducible with standard SHA-256 tools and `ScoutEvidenceAnchor`.
- **Generator provenance**: Each manifest records the Scout release (`GenLayer Scout v0.3.1`) that generated it.
- **JSON export**: A deterministic `.manifest.json` download with a digest-derived filename.
- **Independent local inspection**: Load any `.json` or `.manifest.json` file and review its status against one of four outcomes — **Valid**, **Modified** (structurally valid but payload does not match the recorded digest), **Invalid**, or **Unsupported** (recognized manifest format using an unsupported version or integrity method). Files are read in the browser and are not uploaded or persisted.

Limitations: the digest is tamper-evident, not tamper-proof. A `Valid` result means the payload matches its recorded digest; it does not prove who created the manifest, ownership, authorship, or the truthfulness of linked evidence, and it does not perform current on-chain verification or establish contract behavior, Portal acceptance, eligibility, points, or rewards. See [Evidence Manifest v1](docs/EVIDENCE_MANIFEST_V1.md) and the [manual release checklist](docs/release-checklist.md).

v0.3.1 corrects the browser SHA-256 implementation to standard SHA-256. The manifest format and canonicalization are unchanged. Manifests generated by v0.3.0 carry a non-standard digest and will report **Modified** under v0.3.1; regenerate them before relying on digest verification. See the [compatibility note](docs/EVIDENCE_MANIFEST_V1.md#compatibility-note-scout-v031).

## ScoutEvidenceAnchor Intelligent Contract

`contracts/scout_evidence_anchor.py` anchors a public Evidence Manifest v1 claim on GenLayer and settles it through validator consensus. Anchoring is deterministic and offline; `verify_anchor` refetches the manifest with GenLayer-native web access, recomputes the payload digest with a full reimplementation of the Scout canonicalizer, and requires every validator to reach the same observation before the anchor settles as `VERIFIED`, `MISMATCH`, `INVALID`, or retryable `UNAVAILABLE`. No LLM is involved in any verdict.

The contract is deployed on GenLayer Studionet and read by the app as of v0.4; see [Onchain Evidence](#v04-onchain-evidence) below and [ScoutEvidenceAnchor](docs/SCOUT_EVIDENCE_ANCHOR.md).

## v0.4 Onchain Evidence

v0.4 surfaces the deployed `ScoutEvidenceAnchor` record as a read-only view on the Evidence page. The app reads the finalized onchain state of anchor `1` from the contract hosted at `0x246813806cD01d17f2995DAF9e0aCC1DaC31c488` on GenLayer Studionet (chain id `61999`) and compares it against the published v0.3.1 reference.

- **Read-only by construction**: the page has no wallet, signing, anchor or verify controls. Scout never submits a transaction; it only reads a contract that is already deployed and settled.
- **Server-side read**: `app/api/onchain-evidence` performs the RPC read with `genlayer-js` using finalized (`latest-final`) semantics, so the client bundle stays free of the SDK and the read target cannot be influenced by the browser.
- **Explicit verdicts**: the result is one of **Matches verified reference**, **Live record differs**, **Not verified**, or **Read unavailable**. A differing field is listed in full and is described as a difference, never as proof of wrongdoing.
- **Published reference**: the deployment, anchor and consensus-verification transactions, the public manifest URL, the expected digest, and explorer deep links are pinned in `lib/scout-anchor-config.ts` and shown in a collapsed reference section.
- **Safe failure**: a failed or uninterpretable read renders **Read unavailable** and never displays a stale or hardcoded record as live evidence.

Limitations: this view reports what the contract currently records. It does not prove who created the manifest, ownership, authorship, the truthfulness of linked evidence, or contract behaviour beyond the recorded fields, and it does not establish Portal acceptance, eligibility, points, or rewards. An onchain `VERIFIED` state means validators agreed that the refetched manifest reproduces the recorded digest; it is not a Scout audit. See [ScoutEvidenceAnchor](docs/SCOUT_EVIDENCE_ANCHOR.md).

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
  verify/             Read-only RPC observation route
components/
  build-log/          Build log form
  dashboard/          Dashboard summary components
  evidence/           Evidence form, readiness checklist, Markdown preview, manifest generation and inspection
  experiments/        Experiment form and responsive ledger
  shared/             Shared field utilities such as copyable values
lib/
  dashboard.ts        Derived dashboard statistics
  evidence-quality.ts Evidence readiness and placeholder warning logic
  evidence-report.ts  Markdown report generation
  genlayer-verifier.ts Validated read-only RPC requests and result semantics
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

The current roadmap is maintained in [docs/roadmap.md](docs/roadmap.md). v0.2 read-only verification and v0.3 Evidence Manifest v1 are complete. Later work remains constrained by the same principle: manual records, RPC observations, and any future authoritative integrations must stay visibly distinct.
