"use client";

import {
  ChevronDown,
  ChevronRight,
  Eye,
  RefreshCw,
  ScanSearch,
  ShieldAlert,
  TriangleAlert,
  X
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { inspectEvidenceManifestV1 } from "@/lib/evidence-manifest";
import type { EvidenceManifestEnvelopeV1 } from "@/lib/types";
import type { ManifestInspectionResult } from "@/lib/evidence-manifest";
import {
  isManifestInspectFilenameAccepted,
  isManifestInspectSizeAccepted,
  MAX_MANIFEST_INSPECT_BYTES,
  parseManifestInspectText,
  presentManifestInspection,
  type ManifestInspectPresentation,
  type ManifestDetailRow
} from "@/lib/manifest-inspect-helpers";

type LoadState =
  | { phase: "idle" }
  | { phase: "error"; message: string }
  | { phase: "done"; envelope: EvidenceManifestEnvelopeV1; rawJson: string };

const STATUS_TONE: Record<ManifestInspectPresentation["status"], { icon: typeof Eye; className: string }> = {
  valid: { icon: Eye, className: "border-emerald-200 bg-emerald-50 text-emerald-950" },
  modified: { icon: TriangleAlert, className: "border-amber-200 bg-amber-50 text-amber-950" },
  invalid: { icon: ShieldAlert, className: "border-rose-200 bg-rose-50 text-rose-950" },
  unsupported: { icon: TriangleAlert, className: "border-orange-200 bg-orange-50 text-orange-950" }
};

function DetailRow({ row }: { row: ManifestDetailRow }) {
  return (
    <div>
      <dt className="text-xs font-semibold">{row.label}</dt>
      <dd className="break-all">
        {row.link ? (
          <a
            href={row.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-700 underline hover:text-blue-900"
          >
            {row.value}
          </a>
        ) : (
          <span className="text-slate-600">{row.value || "Not recorded"}</span>
        )}
      </dd>
    </div>
  );
}

function DetailSection({ title, rows }: { title: string; rows: ManifestDetailRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="pt-3">
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">{title}</h4>
      <dl className="grid gap-3 text-xs sm:grid-cols-2">
        {rows.map((row) => (
          <DetailRow key={row.label} row={row} />
        ))}
      </dl>
    </div>
  );
}

export function InspectManifestSection() {
  const [load, setLoad] = useState<LoadState>({ phase: "idle" });
  const [inspection, setInspection] = useState<ManifestInspectionResult | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setLoad({ phase: "idle" });
    setInspection(null);
    setShowRawJson(false);
    if (inputRef.current) inputRef.current.value = "";
  }, []);

  const inspectFile = useCallback(async (file: File) => {
    setInspection(null);
    setShowRawJson(false);

    if (!isManifestInspectFilenameAccepted(file.name)) {
      setLoad({ phase: "error", message: "Choose a .json or .manifest.json file to inspect." });
      return;
    }
    if (!isManifestInspectSizeAccepted(file.size)) {
      setLoad({
        phase: "error",
        message:
          file.size === 0
            ? "The file is empty. Nothing to inspect."
            : `The file is larger than the ${Math.floor(MAX_MANIFEST_INSPECT_BYTES / 1024 / 1024)} MB inspection limit.`
      });
      return;
    }

    let text: string;
    try {
      text = await file.text();
    } catch {
      setLoad({ phase: "error", message: "The file could not be read as text." });
      return;
    }

    const parsed = parseManifestInspectText(text);
    if (!parsed.ok) {
      setLoad({ phase: "error", message: parsed.message });
      return;
    }

    let result: ManifestInspectionResult;
    try {
      result = await inspectEvidenceManifestV1(parsed.envelope);
    } catch {
      setLoad({
        phase: "error",
        message: "The file could not be inspected because it is not a valid Evidence Manifest v1."
      });
      return;
    }

    setLoad({ phase: "done", envelope: parsed.envelope, rawJson: text });
    setInspection(result);
  }, []);

  const presentation = inspection && load.phase === "done"
    ? presentManifestInspection(load.envelope, inspection)
    : null;

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold">Inspect manifest</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Read-only
          </span>
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Load a <span className="font-mono">.json</span> or <span className="font-mono">.manifest.json</span> file and check whether it is a valid, modified, invalid, or unsupported Evidence Manifest v1.
        </p>
      </div>

      <div className="space-y-5 p-5">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="flex gap-3">
            <ScanSearch size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="leading-6">
              Inspection checks the manifest file itself. It does not re-query GenLayer or verify authorship, ownership, or linked content.
            </p>
          </div>
        </div>

        {load.phase !== "done" && (
          <div>
            <input
              ref={inputRef}
              type="file"
              accept=".json,application/json"
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-ink file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-moss-800"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) inspectFile(file);
              }}
            />
            {load.phase === "error" && (
              <div className="mt-4 flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                <ShieldAlert size={16} className="mt-0.5 shrink-0" />
                <span>{load.message}</span>
              </div>
            )}
            <p className="mt-3 text-[11px] text-slate-400">
              Files are read locally in your browser. They are not uploaded or saved.
            </p>
          </div>
        )}

        {load.phase === "done" && presentation && inspection && (
          <div className="space-y-4">
            <div className={`flex flex-col gap-3 rounded-lg border p-5 sm:flex-row sm:items-start sm:justify-between ${STATUS_TONE[presentation.status].className}`}>
              <div className="flex items-start gap-3">
                {(() => {
                  const Icon = STATUS_TONE[presentation.status].icon;
                  return <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />;
                })()}
                <div>
                  <p className="text-sm font-bold">{presentation.statusLabel}</p>
                  <p className="mt-1 text-xs leading-5">{presentation.statusExplanation}</p>
                </div>
              </div>
              <button className="btn-secondary shrink-0 !px-3 !py-2 text-xs" onClick={reset}>
                <RefreshCw size={14} /> Inspect another
              </button>
            </div>

            {presentation.safeErrors.length > 0 && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-rose-800">Result details</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-rose-900">
                  {presentation.safeErrors.map((message, i) => (
                    <li key={i}>{message}</li>
                  ))}
                </ul>
              </div>
            )}

            {presentation.status === "modified" && (
              <p className="text-xs leading-5 text-amber-800">
                This manifest is structurally valid, but its payload does not match the recorded digest. The content below reflects the file as loaded; it does not match the recorded digest and should not be trusted as unchanged.
              </p>
            )}

            {presentation.canShowDetails && (
              <div className="rounded-lg border border-slate-200 bg-panel p-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
                  {presentation.status === "modified" ? "Loaded payload" : "Manifest details"}
                </h3>

                <DetailSection title="Manifest" rows={presentation.manifest} />
                <DetailSection title="Generator" rows={presentation.generator} />
                <DetailSection title="Contribution" rows={presentation.contribution} />
                <DetailSection title="Implementation" rows={presentation.implementation} />
                <DetailSection title="Experiment" rows={presentation.experiment} />
                <DetailSection title="Verification" rows={presentation.verification} />
                <DetailSection title="Integrity" rows={presentation.integrity} />

                <div className="pt-3">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">Evidence</h4>
                  <div className="space-y-3 text-xs">
                    {presentation.evidence.links.length > 0 && (
                      <div>
                        <dt className="text-xs font-semibold">Supporting links</dt>
                        <dd className="break-all">
                          <ul className="mt-1 list-disc space-y-0.5 pl-5">
                            {presentation.evidence.links.map((row, i) => (
                              <li key={i}>
                                {row.link ? (
                                  <a href={row.link} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline hover:text-blue-900">
                                    {row.value}
                                  </a>
                                ) : (
                                  <span className="text-slate-600">{row.value}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </dd>
                      </div>
                    )}
                    <div>
                      <dt className="text-xs font-semibold">What was tested</dt>
                      <dd className="mt-0.5 text-slate-600">{presentation.evidence.whatWasTested || "Not recorded"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold">Known limitations</dt>
                      <dd className="mt-0.5 text-slate-600">{presentation.evidence.knownLimitations || "Not recorded"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold">Next milestone</dt>
                      <dd className="mt-0.5 text-slate-600">{presentation.evidence.nextMilestone || "Not recorded"}</dd>
                    </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-line pt-3">
                  <button
                    className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-ink"
                    onClick={() => setShowRawJson(!showRawJson)}
                  >
                    {showRawJson ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {showRawJson ? "Hide raw JSON" : "Show raw JSON"}
                  </button>
                  {showRawJson && (
                    <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-line bg-white p-3 font-mono text-[11px] leading-5 text-slate-700">
                      {load.rawJson}
                    </pre>
                  )}
                </div>
              </div>
            )}

            {load.phase === "done" && !presentation.canShowDetails && (
              <button className="btn-secondary !px-3 !py-2 text-xs" onClick={reset}>
                <X size={14} /> Clear
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
