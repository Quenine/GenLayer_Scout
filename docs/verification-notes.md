# Read-only verification notes

GenLayer Scout v0.2 performs optional read-only JSON-RPC observations. The Verify route defaults to Studionet and also offers Bradbury, Asimov, and Custom presets. RPC URLs must use HTTP or HTTPS, transaction hashes must start with `0x`, and every request has a 12-second timeout.

## Requests

Transaction requests use the exact object parameter expected by the endpoint:

- `gen_getTransactionStatus` with `params: [{ txId: transactionHash }]`
- `gen_getTransactionReceipt` with `params: [{ txId: transactionHash }]`

When a manual contract address is present, Scout also calls `gen_getContractState` with `params: [{ address: manualContractAddress }]`. This request is skipped when the address is blank.

## Result semantics

- `verified`: at least one safe manual-vs-RPC comparison succeeded and none failed. The current safe comparisons are `ACCEPTED`, `FINALIZED`, and `FAILED`/`CANCELED` status mappings.
- `mismatch`: a safe status comparison failed.
- `observed`: the transaction was returned, but its status cannot be safely compared. This includes `PENDING`, `PROPOSING`, `COMMITTING`, `REVEALING`, `UNDETERMINED`, `READY_TO_FINALIZE`, missing labels, and unknown labels.
- `not_found`: the transaction status lookup reports no transaction.
- `unavailable`: the status request fails, times out, returns HTTP failure, invalid JSON, or an RPC error.
- `manual_only`: validation prevented a request.

Raw status text and numeric status code are preserved. Receipt availability is recorded separately. A receipt `recipient` or `to` value is stored as `observedRecipient`; it is routing evidence and is never treated as proof of a deployed contract address.

Contract-state lookup is recorded as `found`, `not_found`, `unavailable`, or `not_checked`. Any string result, including `"0x"`, is `found`. It means only that the endpoint returned a string for the supplied address; it does not prove source-code authorship, contract behavior, ownership, or deployment provenance.

Errors shown or stored are bounded, generic messages. Raw response bodies are not exposed.

## Boundaries

RPC observations do not prove source, intent, behavior, authorship, Builder Portal acceptance, eligibility, points, or rewards. Manual screenshots, code, reproduction details, Studio output, and links remain necessary. Current backups remain supported, and the former receipt-address field migrates to recipient observation without an address-match claim.
