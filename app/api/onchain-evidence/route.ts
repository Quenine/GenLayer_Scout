import { NextResponse } from "next/server";

import { readAnchorRecord, buildResponse } from "@/lib/scout-anchor-reader";
import {
  READ_ERROR_UNAVAILABLE,
  READ_ERROR_UNEXPECTED
} from "@/lib/onchain-evidence";

/**
 * Read-only evidence endpoint for the hosted ScoutEvidenceAnchor deployment.
 *
 * This route intentionally ignores every query parameter. The contract address,
 * anchor id and method name are compile-time constants in
 * `lib/scout-anchor-reader.ts`, so this endpoint cannot be used as a generic
 * RPC proxy or pointed at an arbitrary contract.
 *
 * The response is always fresh: no caching of either successful or failed
 * reads, so a reviewer pressing Refresh observes current network state.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
  Expires: "0"
} as const;

function json(body: unknown, status: number): NextResponse {
  return NextResponse.json(body, { status, headers: { ...NO_STORE_HEADERS } });
}

export async function GET(): Promise<NextResponse> {
  const outcome = await readAnchorRecord();
  const payload = buildResponse(outcome);

  if (payload.readFailed) {
    // A failed read is a real, current answer, so it is reported as a
    // successful transport carrying an unavailable-read state rather than as a
    // 5xx. The client distinguishes the two via `readFailed`.
    return json(
      {
        ...payload,
        readError:
          outcome.failure === "unexpected_response"
            ? READ_ERROR_UNEXPECTED
            : READ_ERROR_UNAVAILABLE
      },
      200
    );
  }

  return json(payload, 200);
}
