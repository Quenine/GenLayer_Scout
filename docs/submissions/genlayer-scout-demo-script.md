# GenLayer Scout Demo Script

Target length: 60 to 90 seconds.

## Opening, 5-10 seconds

"GenLayer Scout is a local-first workspace for preparing GenLayer Builder Portal evidence. It does not connect to Studio or verify network data yet. Everything here is manually tracked and should be checked against the original evidence."

## Dashboard, 10-15 seconds

Show the dashboard overview:

- experiments tracked
- exact finalized count only when status is finalized
- missing evidence links
- active contribution lanes
- first-use local-first note

## Experiment ledger, 10-15 seconds

Open Contract experiments:

- show the first Studio Faucet deployment test record
- point out TODO address/hash placeholders if real evidence has not been inserted
- show edit flow and copy buttons for address/hash

## Contribution lanes, 10 seconds

Open Contribution lanes:

- show Projects, Tools & Infrastructure, Educational Content, and Create Intelligent Contracts marked Building
- explain Milestones is not marked Building yet because no milestone claim is ready

## Evidence pack generator, 15-20 seconds

Open Evidence pack:

- select the project evidence pack
- show the readiness checklist
- show how selected experiment details are pulled into Markdown
- show TODO evidence links that must be replaced before submission
- use Copy Markdown or Download Markdown

## Build log, 10 seconds

Open Build log:

- show dated notes for Studio learning, Scout implementation, and verifier planning
- explain these are working notes, not proof by themselves

## Export/import backup, 5-10 seconds

Return to dashboard:

- show JSON export/import backup
- explain the sample backup is for testing the local app state, not for fabricating evidence

## Close, 5 seconds

"v0.2 adds conservative read-only RPC observation while Scout stays local-first and evidence-focused. Receipt recipients are not contract proof, and non-comparable statuses remain observed."

"The verifier records the RPC profile and successful dialect. On Studionet it makes one positional lifecycle-status call, skips unsupported receipt and contract-state methods, and keeps the verified lifecycle claim separate from authorship or behavior."
