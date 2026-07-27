# GenLayer Scout - Project Submission Draft

## Project title

GenLayer Scout - local-first builder evidence workspace

## Short summary

GenLayer Scout is a local-first web app for GenLayer contributors who need to track Studio contract experiments, contribution opportunities, build notes, and evidence packs before preparing Builder Portal submissions.

## GenLayer relevance

GenLayer Studio is a developer environment for writing, deploying, and testing Python Intelligent Contracts. A useful Builder Portal submission needs more than a claim that something was built: it needs contract files, observed deployment state, evidence links, limitations, and a clear next milestone. Scout helps organize that handoff without pretending to verify network data.

## Problem observed

While working with Studio and the Portal contribution categories, it became clear that builders can lose important context between an experiment and a later submission:

- Which contract file was used?
- What address and transaction hash were observed?
- Was the state drafted, deployed, accepted, consensus, finalized, or failed?
- Where are the screenshots or repository links?
- What was tested, and what remains unverified?

## What was built

A clean local-first dashboard with:

- Dashboard overview of manually tracked experiments and evidence gaps
- Contract experiment ledger with edit/delete, long hash handling, and copy buttons
- Contribution lane tracker for supplied Portal categories
- Evidence pack generator with Markdown copy/download
- Submission readiness checklist and placeholder quality guard
- Build log for dated progress, findings, bugs, and lessons
- JSON export/import backup flow

## Current v0.1.1 scope

- Next.js App Router, TypeScript, Tailwind CSS
- Browser localStorage persistence
- One local workspace
- One evidence pack draft
- Manual evidence tracking only
- No backend and no paid services

## What is manual

Scout does not connect to Studio, verify addresses, query transaction hashes, submit to the Portal, estimate points, or claim reward eligibility. Builders must manually enter and verify all evidence.

## What was tested

TODO: Replace this section with real QA results before submission.

Suggested items to verify:

- Dashboard first-use flow
- Contract experiment create/edit/delete
- Long address/hash wrapping and copy buttons
- Contribution lane status changes
- Evidence readiness checklist states
- Placeholder quality guard warnings
- Markdown copy/download
- JSON export/import backup
- Mobile viewport behavior

## Known limitations

- No write-capable GenLayer or Portal integration
- No proof of contract authorship, behavior, or Portal acceptance
- No Portal submission integration
- One evidence draft at a time
- Browser-local storage only
- Import replaces the workspace instead of merging

## Next milestone

v0.2 implements a read-only RPC verifier that distinguishes manual records, comparable verification, non-comparable observations, receipt recipients, and contract-state lookup results.

## Evidence checklist

- [ ] TODO: add deployed app or local demo screenshots
- [ ] TODO: add repository URL if public
- [ ] TODO: add real first Studio Faucet deployment contract address
- [ ] TODO: add real first Studio Faucet deployment transaction hash
- [ ] TODO: add screenshot of Evidence Pack readiness checklist
- [ ] TODO: add screenshot or recording of Markdown generation
- [ ] TODO: add browser QA notes
- [ ] TODO: remove all TODO placeholders before Portal submission

Studionet compatibility is explicit: positional lifecycle-status parameters, no calls to its unsupported receipt or contract-state methods, and persisted dialect/capability metadata for reviewers.
