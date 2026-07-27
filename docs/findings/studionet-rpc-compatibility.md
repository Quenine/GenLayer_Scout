# Studionet RPC compatibility finding

- **Test date:** 2026-07-27
- **Endpoint:** `https://studio.genlayer.com/api`
- **Methods tested:** `gen_getTransactionStatus`, `gen_getTransactionReceipt`, `gen_getContractState`

## Observed compatibility

The documented transaction-status request shape was tested with:

```json
{"jsonrpc":"2.0","id":1,"method":"gen_getTransactionStatus","params":[{"txId":"<transactionHash>"}]}
```

Sanitized outcome: Studionet returned JSON-RPC code `-32603`, consistent with an incompatible parameter shape. Server database details were intentionally omitted.

The successful request shape was positional:

```json
{"jsonrpc":"2.0","id":1,"method":"gen_getTransactionStatus","params":["<transactionHash>"]}
```

Sanitized outcome: the endpoint returned the transaction lifecycle status. Both `gen_getTransactionReceipt` and `gen_getContractState` returned JSON-RPC code `-32601` (`Method not found`).

## Scope

This confirms only the request dialect and exposed read-method capabilities observed on the test date. A matching lifecycle status does not prove contract authorship, source code, ownership, or behavior. Endpoint behavior may change.

## Reproduction

1. Use a valid 32-byte `0x`-prefixed Studionet transaction hash.
2. POST the documented object-form status request to the endpoint and record only the JSON-RPC code.
3. POST the positional status request and compare the returned lifecycle label with the manually recorded label.
4. Call the receipt and contract-state methods and record capability codes without retaining raw database or stack-trace content.
5. Do not publish transaction secrets, full SQL, server stack traces, or raw internal error bodies.