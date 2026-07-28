# Portal Fields Draft

## Title

GenLayer Scout v0.2 — Verified Builder Evidence Workspace

## Contribution category

Projects

## Description

GenLayer Scout is a local-first evidence workspace for builders working with GenLayer Studio and the Builder Portal.

It helps contributors record Studio contract experiments, preserve transaction and deployment evidence, track contribution opportunities, maintain dated build notes, and generate structured Markdown evidence packs for steward review.

The original version focused on organizing manually entered evidence. Following reviewer feedback, v0.2 adds a working read-only GenLayer RPC verification path that can inspect a recorded transaction, observe its lifecycle state, and compare that state with the builder’s manual record.

Scout keeps manually entered information separate from RPC observations so reviewers can clearly distinguish submitted claims from externally observed network data.

## Response to previous review feedback

The earlier submission was rejected because Scout only organized manually entered GenLayer details and could not inspect or verify the contracts, transactions, or lifecycle states behind them.

v0.2 directly addresses that feedback by adding:

- Read-only GenLayer transaction lifecycle verification
- Safe comparison between manually recorded and RPC-observed statuses
- Explicit RPC endpoint profiles and request dialects
- Honest capability reporting for unsupported RPC methods
- Persisted verification metadata
- Verification details inside generated evidence packs
- Automated tests for RPC behavior, evidence generation, backup validation, and storage migration

Scout now verifies a real GenLayer Studio Faucet transaction against Studionet.

The manually recorded lifecycle state was `finalized`. Studionet returned `FINALIZED`, the statuses matched, and Scout recorded the result as `Verified`.

## Core functionality

### Contract experiment ledger

Builders can record:

- Contract name
- Studio Python file name
- Deployed contract address
- Transaction hash
- Manually observed lifecycle state
- Experiment notes
- Evidence links
- Portal submission notes
- Read-only verification result

Experiments can be created, edited, searched, filtered, copied, and deleted.

### Read-only RPC verification

Scout can:

- Query a selected GenLayer RPC endpoint without wallet signing
- Inspect a recorded transaction lifecycle state
- Preserve the raw observed status and status code
- Compare safely mapped lifecycle states
- Distinguish:
  - Verified
  - Observed
  - Mismatch
  - Not found
  - Unavailable
  - Manual only
- Record the RPC profile and successful request dialect
- Report unsupported endpoint capabilities without treating them as verification failures
- Store verification results in the local workspace and JSON backup

Scout does not sign messages, submit transactions, modify network state, or require private keys.

### Evidence pack generator

Scout generates structured Markdown evidence containing:

- Contribution title and category
- Project summary
- GenLayer relevance
- Contract and deployment details
- Screenshots and supporting links
- What was tested
- Known limitations
- Next milestone
- Portal reviewer notes
- Read-only verification metadata
- Manual versus observed lifecycle status
- RPC profile and request dialect
- Endpoint capability information

The evidence pack includes an explicit warning that lifecycle verification does not prove authorship, ownership, source code, or contract behavior.

### Submission readiness checks

Scout checks whether an evidence draft contains the information normally required for review, including:

- Project title
- Contribution category
- Project summary
- GenLayer relevance
- Contract or transaction evidence
- Testing details
- Limitations
- Next milestone
- Reviewer notes
- Supporting evidence links

It also warns about weak placeholder language such as `test`, `none`, `placeholder`, and similar vague entries.

### Contribution planning

Scout includes a contribution lane tracker for categories visible in the Builder Portal, including:

- Projects
- Milestones
- Research and Analysis
- Tools and Infrastructure
- Community Building
- Explorer
- Network Dashboard
- Third-party integrations
- Grayboxing
- Gas Fees Simulator Tests
- Benchmarks
- Create Intelligent Contracts
- Educational Content
- Documentation
- Bug Reports
- Blog Posts

Builders can mark each lane as:

- Watching
- Building
- Submitted
- Accepted
- Deferred

### Build log

Builders can maintain dated records for:

- Progress
- Findings
- Bugs
- Lessons

### Local backup

Scout supports:

- Versioned browser-local storage
- Validated JSON export
- Validated JSON import
- Corrupted-storage recovery
- Legacy workspace migration

## Live verification evidence

### RPC endpoint

`https://studio.genlayer.com/api`

### RPC profile

`studionet`

### Successful request dialect

`positional`

### Transaction hash

`0xea5aff36389c249e3c0aa277fb94f5f58948d28d6dae07791ef200f01525b493`

### Contract address

`0x6B9E22dd81F750c3fd9B1473002319f87992fac1`

### Manually recorded lifecycle state

`finalized`

### RPC-observed lifecycle state

`FINALIZED`

### Status comparison

`Match: Yes`

### Scout result

`Verified`

### Endpoint capabilities observed during testing

- Transaction lifecycle status: supported
- Transaction receipt RPC method: unsupported by the tested Studionet endpoint
- Contract-state RPC method: unsupported by the tested Studionet endpoint

Scout records these unavailable methods as unsupported and does not misrepresent them as proof failures.

## Studionet compatibility finding

During implementation, the documented object-form transaction-status request was tested against Studionet:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "gen_getTransactionStatus",
  "params": [
    {
      "txId": "<transactionHash>"
    }
  ]
}
```

Studionet returned JSON-RPC error code `-32603`, indicating that the endpoint did not accept that parameter shape.

The following positional request succeeded:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "gen_getTransactionStatus",
  "params": [
    "<transactionHash>"
  ]
}
```

The successful response returned:

```json
{
  "jsonrpc": "2.0",
  "result": "FINALIZED",
  "id": 1
}
```

Scout therefore uses an explicit Studionet compatibility profile and records the successful request dialect as part of the verification evidence.

Raw database details from the failed response are intentionally not exposed in Scout or included in public documentation.

## Evidence links

### GitHub repository

https://github.com/Quenine/GenLayer_Scout

### Live application

https://genlayer-scout.vercel.app

### Live verification route

https://genlayer-scout.vercel.app/verify

### Repository compatibility finding

https://github.com/Quenine/GenLayer_Scout/blob/main/docs/findings/studionet-rpc-compatibility.md

### Repository verification notes

https://github.com/Quenine/GenLayer_Scout/blob/main/docs/verification-notes.md

### Repository roadmap

https://github.com/Quenine/GenLayer_Scout/blob/main/docs/roadmap.md

### Additional Portal attachments

The submission should include:

- Successful live verification screenshot
- GenLayer Studio Faucet deployment screenshot
- Studio lifecycle/finalization log screenshot
- Generated evidence-pack screenshot
- Test and production-build output screenshot

## Testing and verification

The project includes automated coverage for:

### GenLayer RPC verification

- Exact Studionet positional request body
- Documented object-form requests for supported profiles
- Matching `FINALIZED` lifecycle status
- Lifecycle status mismatch
- Non-comparable and pending lifecycle states
- Unsupported RPC methods
- Transaction not found
- Network and HTTP failures
- Safe error handling
- Request timeout behavior
- RPC URL validation
- Transaction hash validation
- Optional contract address validation
- Compatibility metadata persistence
- Prevention of raw internal error exposure

### Evidence generation

- Manual evidence warning
- Selected experiment information
- Read-only verification section
- RPC profile and request dialect
- Endpoint capability reporting
- No-experiment behavior

### Storage and migration

- Current workspace backup parsing
- Malformed JSON rejection
- Invalid schema rejection
- Legacy workspace migration
- Legacy demo-record removal
- Verification metadata validation
- Compatibility metadata preservation
- Experiments without verification remaining valid

## Quality results

- ESLint passed
- Type checking passed
- 24 automated tests passed
- Production build passed
- 9 static pages generated
- GitHub verification workflow included
- Vercel deployment succeeded
- Real Studionet lifecycle verification succeeded

The complete quality command is:

```bash
npm run verify
```

This runs:

```bash
npm run lint
npm run test
npm run build
```

## Impact

Scout improves the builder contribution workflow by separating raw technical evidence from submission narrative.

Instead of reconstructing contract details, transaction hashes, screenshots, testing notes, and lifecycle observations at the end of a project, contributors can preserve those records while they build.

This can help:

- Builders prepare clearer and more complete Portal submissions
- Reviewers distinguish manual claims from RPC-observed information
- Contributors preserve reproducible Studio experiment details
- New builders understand what useful submission evidence looks like
- Accepted projects prepare stronger milestone updates
- Ecosystem contributors document endpoint compatibility findings responsibly

Scout is also designed to remain useful when an endpoint exposes only a limited RPC surface. It records what was successfully observed, what was unsupported, and what remains manually evidenced.

## Limitations

- Scout is local-first and stores workspace data in the user’s browser
- There is no authentication, synchronization, cloud backup, or team collaboration
- Manual experiment details and evidence links must still be entered by the builder
- Lifecycle verification does not prove contract authorship
- Lifecycle verification does not prove ownership
- Lifecycle verification does not prove source-code provenance
- Lifecycle verification does not prove contract behavior
- Lifecycle verification does not prove that screenshots or repository links belong to the checked transaction
- Studionet does not currently expose the tested receipt and contract-state RPC methods
- Scout does not read from or submit directly to the Builder Portal
- Scout does not predict contribution points
- Scout does not predict acceptance
- Scout does not make eligibility or reward claims
- The current workspace supports one active evidence-pack draft at a time

## Roadmap

### Next local workflow milestone

- Support multiple named evidence packs
- Link build-log entries to experiments
- Link build-log entries to evidence packs
- Add structured test-case records
- Support milestone snapshots and diffs
- Add reusable templates for different Portal contribution categories

### RPC and verification improvements

- Continue testing Bradbury and Asimov RPC behavior
- Preserve endpoint capability observations over time
- Add optional benchmark result collections
- Improve lifecycle observation history
- Add clearer comparison between previous and current verification checks

### Ecosystem contribution work

- Submit the reproducible Studionet RPC compatibility finding
- Produce educational documentation for first-time GenLayer builders
- Publish a technical walkthrough of the verification implementation
- Explore reusable verification utilities for other GenLayer projects

## Reviewer notes

This submission should be reviewed as a local-first GenLayer builder evidence and verification workspace.

It is not:

- An official GenLayer product
- A Builder Portal integration
- A full blockchain explorer
- A wallet application
- A transaction submission tool
- A contract authorship verifier
- A contract behavior auditor
- A points or rewards predictor

The earlier version was rejected because it could not inspect the transactions or lifecycle states behind manually entered records.

The current v0.2 release directly addresses that issue through a tested, working, read-only lifecycle verification path.

A real GenLayer Studio Faucet transaction was successfully checked against Studionet. The RPC returned `FINALIZED`, matching the manually recorded `finalized` state, and Scout returned `Verified`.

The project also adds automated tests around the exact areas requested in the previous review: evidence generation and storage migration.
