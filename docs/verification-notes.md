# Read-only verification notes

GenLayer Scout v0.2 uses explicit RPC profiles and persists the selected profile, successful transaction-status dialect, and optional-method capabilities with each observation.

## Profiles

- **Studionet** — `https://studio.genlayer.com/api`; sends `gen_getTransactionStatus` with `params: [transactionHash]`. Receipt and contract-state methods are marked `unsupported` and are not called.
- **Bradbury** — documented object-form status and receipt parameters; optional method code `-32601` becomes `unsupported`.
- **Asimov** — documented object-form status and receipt parameters; optional method code `-32601` becomes `unsupported`.
- **Custom** — documented object form by default. Auto compatibility may retry status positionally only after object-form JSON-RPC code `-32602` or `-32603`.

Object-form status and receipt requests use `params: [{ txId: transactionHash }]`. Contract state uses `params: [{ address: manualContractAddress }]`. Unsupported optional methods are never retried.

## Result and capability semantics

Lifecycle comparison is independent of receipt and contract-state availability. A safely comparable matching status can be `verified` even when both optional methods are `unsupported`. Non-comparable lifecycle states remain `observed`; safe comparison failures are `mismatch`.

Receipt and contract-state capabilities are `available`, `unsupported`, `unavailable`, or `not_checked`. Code `-32601` means `unsupported`; HTTP failures, timeouts, malformed responses, and other RPC failures mean `unavailable`. Raw RPC bodies and server/database details are never included in user-facing errors.

Studionet verification displays: “Studionet verified the lifecycle status. Receipt and contract-state RPC methods are not exposed by this endpoint.”

Lifecycle verification does not prove authorship, source code, ownership, contract behavior, Builder Portal acceptance, eligibility, points, or rewards. See the sanitized [Studionet compatibility finding](findings/studionet-rpc-compatibility.md).