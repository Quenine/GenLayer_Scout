# Browser QA Checklist

Use this checklist before tagging or submitting the current build. Manual records remain local; the Verify route adds only optional read-only RPC observations.

## First load

- [ ] Open the app in a browser with empty local storage.
- [ ] Confirm the dashboard shows the first-use panel.
- [ ] Confirm no invented experiments, transactions, or build notes appear.
- [ ] Confirm contribution lanes are seeded only from the supplied category list.

## Create experiment

- [ ] Open Contract experiments.
- [ ] Record a new experiment with a contract name and Studio file.
- [ ] Add a deployed contract address, transaction hash, observed state, notes, evidence URL, and Portal notes.
- [ ] Confirm the saved row/card appears in the ledger.
- [ ] Refresh the browser and confirm the record persists.

## Edit experiment

- [ ] Click the edit action for the experiment.
- [ ] Change the observed state and notes.
- [ ] Save changes.
- [ ] Confirm the original created date remains and the edited indicator appears where shown.
- [ ] Confirm evidence generation still finds the edited experiment.

## Delete experiment

- [ ] Click delete.
- [ ] Cancel once and confirm the record remains.
- [ ] Delete again and confirm the record is removed.
- [ ] If it was selected in the evidence pack, confirm the draft no longer points to a missing experiment.

## Generate evidence pack

- [ ] Open Evidence pack.
- [ ] Select a contribution category.
- [ ] Select a contract experiment.
- [ ] Confirm the UI says contract name, file, address, hash, state, recorded date, and evidence URL are included in Markdown.
- [ ] Confirm the Markdown includes title, generated date, manual-evidence note, category, contract file, address, hash, state, evidence links, tested scope, limitations, next milestone, and Portal notes.
- [ ] Clear the experiment selection and confirm the UI says no Studio deployment details will be included.
- [ ] Add not-applicable reasons for address/hash and confirm the readiness checklist updates.

## Submission readiness checklist

- [ ] Empty narrative fields should show Incomplete.
- [ ] Complete narrative fields with missing deployment/evidence should show Needs evidence.
- [ ] Complete narrative fields plus selected evidence or N/A reasons should show Ready.
- [ ] Confirm Ready is worded as local completeness, not Portal acceptance or verification.

## Placeholder quality guard

- [ ] Enter weak values such as `test`, `none`, `lorem`, `placeholder`, or `demo only` in evidence fields.
- [ ] Confirm non-blocking warnings appear.
- [ ] Replace weak text with specific evidence and confirm warnings clear.

## Copy/download markdown

- [ ] Click Copy Markdown and paste into a text editor.
- [ ] Click Download Markdown and confirm the `.md` file contains the same report.
- [ ] Confirm clipboard failure messaging is acceptable if browser permissions block copying.

## Export/import backup

- [ ] Export JSON from the dashboard backup panel.
- [ ] Open the JSON and confirm it includes app name, exported date, schema version, experiments, lanes, evidence draft, and build log entries.
- [ ] Reset storage.
- [ ] Import the JSON backup and accept the replacement warning.
- [ ] Confirm the workspace returns.
- [ ] Try importing malformed JSON and confirm Scout rejects it gracefully.

## Reset storage

- [ ] Use the dashboard reset action.
- [ ] Cancel once and confirm data remains.
- [ ] Reset again and confirm experiments, evidence draft, build notes, and lane states are cleared/restored appropriately.

## Contribution lanes

- [ ] Confirm statuses are Watching, Building, Submitted, Accepted, and Deferred.
- [ ] Mark lanes Building, Submitted, and Accepted and confirm they appear as active on the dashboard.
- [ ] Mark lanes Watching or Deferred and confirm they do not appear as active on the dashboard.

## Build log empty state

- [ ] Reset storage or clear build log entries.
- [ ] Confirm suggested first entries are shown as prompts only.
- [ ] Confirm no suggested entry is automatically created.

## Mobile viewport check

- [ ] Test the dashboard, ledger, evidence pack, contribution lanes, and build log around 375px width.
- [ ] Confirm forms are usable without horizontal scrolling.
- [ ] Confirm table content switches to mobile cards where expected.

## Long hash/address check

- [ ] Create or edit an experiment with a very long contract address and transaction hash.
- [ ] Confirm desktop table columns do not break layout.
- [ ] Confirm mobile cards wrap the full value cleanly.
- [ ] Confirm copy buttons copy the exact full value, not the shortened display text.

## RPC profile compatibility

- [ ] Studionet sends one positional status request and shows receipt and contract-state as unsupported.
- [ ] A matching Studionet lifecycle status can be verified without optional-method calls.
- [ ] Bradbury and Asimov show object-form status dialect metadata.
- [ ] Custom exposes Auto compatibility and object-only choices.
- [ ] Capability, dialect, lifecycle comparison, and scope note appear in saved evidence Markdown.
- [ ] No raw server, SQL, database, or stack-trace details appear in errors.
