"use client";

import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  ExternalLink,
  Info,
  Link2,
  Loader2,
  RefreshCw
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  SCOUT_ANCHOR_ANCHOR_TX,
  SCOUT_ANCHOR_CHAIN_ID,
  SCOUT_ANCHOR_CONTRACT_ADDRESS,
  SCOUT_ANCHOR_DEPLOYMENT_TX,
  SCOUT_ANCHOR_EXPLORER_BASE,
  SCOUT_ANCHOR_ID,
  SCOUT_ANCHOR_MANIFEST_URL,
  SCOUT_ANCHOR_NETWORK_NAME,
  SCOUT_ANCHOR_REFERENCE,
  SCOUT_ANCHOR_VERIFICATION_TX,
  scoutAnchorContractUrl,
  scoutAnchorTxUrl
} from "@/lib/scout-anchor-config";
import {
  LIVE_FIELD_ORDER,
  TRUST_BOUNDARY_NOTES,
  compareAnchorToReference,
  normalizeAnchorRecord,
  presentVerdict,
  type OnchainAnchorRecord,
  type OnchainEvidenceVerdict,
  type ReferenceDifference
} from "@/lib/onchain-evidence";

type LoadState = "loading" | "ready";

interface FetchOutcome {
  state: LoadState;
  record: OnchainAnchorRecord | null;
  verdict: OnchainEvidenceVerdict;
  differences: ReferenceDifference[];
  readError: string | null;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }, [value]);

  return (
    <button
      type="button"
      className="btn-secondary !px-2 !py-1 text-[11px]"
      onClick={copy}
      aria-label={`Copy ${label}`}
    >
      {copied ? <Check size={13} aria-hidden="true" /> : <Clipboard size={13} aria-hidden="true" />}
      <span className="sr-only sm:not-sr-only">{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}

function ExplorerLink({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900"
    >
      {children}
      <ExternalLink size={12} aria-hidden="true" />
    </a>
  );
}

function StaticRow({
  label,
  value,
  href,
  linkLabel,
  copyable = true
}: {
  label: string;
  value: string;
  href?: string;
  linkLabel?: string;
  copyable?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-2 last:border-b-0 sm:flex-row sm:items-start sm:gap-3">
      <dt className="shrink-0 text-xs font-semibold text-slate-600 sm:w-44">{label}</dt>
      <dd className="min-w-0 flex-1">
        <span className="block break-all font-mono text-[11px] text-slate-700">{value}</span>
        <span className="mt-1 flex flex-wrap items-center gap-3">
          {href ? (
            <ExplorerLink href={href}>{linkLabel ?? `${label} on explorer`}</ExplorerLink>
          ) : null}
          {copyable ? <CopyButton value={value} label={label} /> : null}
        </span>
      </dd>
    </div>
  );
}

function LiveRow({ label, value }: { label: string; value: string }) {
  const empty = value.length === 0;
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-2 last:border-b-0 sm:flex-row sm:items-start sm:gap-3">
      <dt className="shrink-0 text-xs font-semibold text-slate-600 sm:w-44">{label}</dt>
      <dd className="min-w-0 flex-1">
        <span
          className={`block break-all font-mono text-[11px] ${empty ? "text-slate-400" : "text-slate-700"}`}
        >
          {empty ? "(empty)" : value}
        </span>
        {!empty ? (
          <span className="mt-1 flex flex-wrap items-center gap-3">
            {/^0x[0-9a-fA-F]{64}$/.test(value) ? (
              <ExplorerLink href={scoutAnchorTxUrl(value)}>Transaction on explorer</ExplorerLink>
            ) : null}
            {/^0x[0-9a-fA-F]{40}$/.test(value) ? (
              <ExplorerLink href={`${SCOUT_ANCHOR_EXPLORER_BASE}/address/${value}`}>
                Address on explorer
              </ExplorerLink>
            ) : null}
            <CopyButton value={value} label={label} />
          </span>
        ) : null}
      </dd>
    </div>
  );
}

const TONE_CLASSES: Record<string, string> = {
  match: "border-emerald-200 bg-emerald-50 text-emerald-950",
  differs: "border-amber-200 bg-amber-50 text-amber-950",
  pending: "border-slate-200 bg-slate-50 text-slate-900",
  unavailable: "border-rose-200 bg-rose-50 text-rose-950"
};

export function OnchainEvidenceSection() {
  // Initial state is a fixed placeholder, never a timestamp, so server and
  // client markup match on hydration.
  const [outcome, setOutcome] = useState<FetchOutcome>({
    state: "loading",
    record: null,
    verdict: "READ_UNAVAILABLE",
    differences: [],
    readError: null
  });
  const [openLive, setOpenLive] = useState(false);
  const started = useRef(false);

  const load = useCallback(async () => {
    setOutcome((prev) => ({ ...prev, state: "loading" }));
    try {
      const response = await fetch("/api/onchain-evidence", { cache: "no-store" });
      if (!response.ok) throw new Error("api_error");
      const body = (await response.json()) as {
        record?: unknown;
        readFailed?: boolean;
        readError?: string | null;
      };

      // Re-validate the network payload on the client with the same pure
      // normalizer the server uses, so a malformed record can never be
      // rendered as a verified state.
      const record = normalizeAnchorRecord(body.record ?? null);
      const comparison = compareAnchorToReference(record);

      setOutcome({
        state: "ready",
        record,
        verdict: comparison.verdict,
        differences: comparison.differences,
        readError: record ? null : body.readError ?? "The live anchor state could not be read."
      });
    } catch {
      setOutcome({
        state: "ready",
        record: null,
        verdict: "READ_UNAVAILABLE",
        differences: [],
        readError: "The Scout API could not be reached from this browser."
      });
    }
  }, []);

  useEffect(() => {
    // Exactly one automatic read on load, even under React strict remounting.
    if (started.current) return;
    started.current = true;
    void load();
  }, [load]);

  const presentation = presentVerdict(outcome.verdict, outcome.differences);
  const loading = outcome.state === "loading";

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold">Onchain evidence</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Read-only view of the published ScoutEvidenceAnchor record on {SCOUT_ANCHOR_NETWORK_NAME}.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-700">
          <div className="flex gap-3">
            <Info size={16} className="mt-0.5 shrink-0 text-slate-500" aria-hidden="true" />
            <div className="space-y-2 leading-5">
              <p>{TRUST_BOUNDARY_NOTES.localInspection}</p>
              <p>{TRUST_BOUNDARY_NOTES.anchorVerification}</p>
              <p>{TRUST_BOUNDARY_NOTES.verifiedMeans}</p>
              <p>
                It does not establish:{" "}
                {TRUST_BOUNDARY_NOTES.doesNotEstablish.join(", ")}.
              </p>
              <p>{TRUST_BOUNDARY_NOTES.history}</p>
            </div>
          </div>
        </div>

        <div
          className={`rounded-lg border p-4 ${TONE_CLASSES[presentation.tone]}`}
          role="status"
          aria-live="polite"
          aria-busy={loading}
        >
          <div className="flex items-start gap-3">
            {loading ? (
              <Loader2 size={17} className="mt-0.5 shrink-0 animate-spin" aria-hidden="true" />
            ) : outcome.verdict === "MATCHES_VERIFIED_REFERENCE" ? (
              <Check size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold">
                {loading ? "Reading onchain state" : presentation.title}
              </p>
              {loading ? (
                <p className="mt-0.5 text-xs opacity-80">
                  Requesting anchor {SCOUT_ANCHOR_ID} from {SCOUT_ANCHOR_NETWORK_NAME}.
                </p>
              ) : (
                <p className="mt-0.5 text-xs leading-5 opacity-90">
                  {outcome.readError ?? presentation.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {!loading && outcome.differences.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-white p-4">
            <h3 className="text-xs font-semibold text-amber-950">
              Fields that differ from the published reference
            </h3>
            <ul className="mt-2 space-y-1.5">
              {outcome.differences.map((difference) => (
                <li key={difference.field} className="text-[11px] leading-5 text-slate-700">
                  <span className="font-semibold text-slate-900">{difference.label}</span>
                  <span className="mx-1.5 text-slate-400">changed from</span>
                  <code className="break-all font-mono">{difference.expected}</code>
                  <span className="mx-1.5 text-slate-400">to</span>
                  <code className="break-all font-mono">{difference.live}</code>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] leading-5 text-slate-500">
              A difference is not by itself evidence of wrongdoing. It may reflect a republished
              manifest, a re-verification, or a different record being referenced.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="btn-secondary !px-3 !py-2"
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden="true" />
            Refresh onchain state
          </button>
          <span className="text-[11px] text-slate-500">
            Read-only. No wallet, signing or transaction submission.
          </span>
        </div>

        {outcome.record ? (
          <div className="rounded-lg border border-line">
            <button
              type="button"
              className="flex w-full items-center gap-1.5 px-4 py-3 text-left text-xs font-semibold text-slate-700"
              onClick={() => setOpenLive((v) => !v)}
              aria-expanded={openLive}
            >
              {openLive ? (
                <ChevronDown size={14} aria-hidden="true" />
              ) : (
                <ChevronRight size={14} aria-hidden="true" />
              )}
              Live anchor record
              <span className="ml-auto font-mono text-[11px] font-normal text-slate-500">
                {SCOUT_ANCHOR_CHAIN_ID} &middot; #{SCOUT_ANCHOR_ID}
              </span>
            </button>
            {openLive ? (
              <dl className="border-t border-line px-4 pb-3">
                {LIVE_FIELD_ORDER.map(({ key, label }) => (
                  <LiveRow key={key} label={label} value={String(outcome.record![key])} />
                ))}
              </dl>
            ) : null}
          </div>
        ) : null}

        <details className="rounded-lg border border-line">
          <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-slate-700">
            Published reference
          </summary>
          <dl className="border-t border-line px-4 pb-3">
            <StaticRow label="Network" value={SCOUT_ANCHOR_NETWORK_NAME} copyable={false} />
            <StaticRow label="Chain ID" value={String(SCOUT_ANCHOR_CHAIN_ID)} copyable />
            <StaticRow
              label="ScoutEvidenceAnchor contract"
              value={SCOUT_ANCHOR_CONTRACT_ADDRESS}
              href={scoutAnchorContractUrl()}
            />
            <StaticRow label="Anchor ID" value={String(SCOUT_ANCHOR_ID)} />
            <StaticRow
              label="Public manifest"
              value={SCOUT_ANCHOR_MANIFEST_URL}
              href={SCOUT_ANCHOR_MANIFEST_URL}
              linkLabel="Open manifest"
            />
            <StaticRow
              label="Deployment transaction"
              value={SCOUT_ANCHOR_DEPLOYMENT_TX}
              href={scoutAnchorTxUrl(SCOUT_ANCHOR_DEPLOYMENT_TX)}
            />
            <StaticRow
              label="Anchor transaction"
              value={SCOUT_ANCHOR_ANCHOR_TX}
              href={scoutAnchorTxUrl(SCOUT_ANCHOR_ANCHOR_TX)}
            />
            <StaticRow
              label="Consensus verification transaction"
              value={SCOUT_ANCHOR_VERIFICATION_TX}
              href={scoutAnchorTxUrl(SCOUT_ANCHOR_VERIFICATION_TX)}
            />
            <StaticRow label="Published claimed digest" value={SCOUT_ANCHOR_REFERENCE.claimedDigest} />
            <StaticRow
              label="Published recorded status"
              value={SCOUT_ANCHOR_REFERENCE.recordedStatus}
              copyable={false}
            />
          </dl>
        </details>

        <p className="flex items-start gap-2 text-[11px] leading-5 text-slate-500">
          <Link2 size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
          This section only reads a contract that was already deployed and settled. Scout never
          submits transactions, and this page contains no wallet or signing controls.
        </p>
      </div>
    </section>
  );
}
