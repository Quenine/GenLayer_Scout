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
