# Read-only verification notes

GenLayer Scout v0.2 queries a user-supplied GenLayer JSON-RPC endpoint with `gen_getTransactionStatus` and, when possible, `gen_getTransactionReceipt`. Requests use `fetch`; no wallet, private key, signing, or transaction submission is involved.

Supported checks are transaction/status availability, exact comparisons for `ACCEPTED`, `FINALIZED`, and `FAILED`/`CANCELED`, and address comparison only when a receipt exposes a comparable field. Raw statuses remain visible.

Missing transactions become `not_found`. Network, HTTP, and RPC errors become `unavailable`. Missing receipts do not erase usable status evidence. Unknown or pending statuses are not mapped or compared.

This does not prove source, behavior, authorship, Builder Portal acceptance, eligibility, points, or rewards. Manual screenshots, reproduction details, Studio output, code, and links remain necessary. Tests cover success, mismatch, not-found, network, partial-receipt, and non-comparable-address cases. v0.1.1 imports remain valid.
