"use client";

import { ChevronDown, ChevronRight, Download, FileJson, Info } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createEvidenceManifestV1 } from "@/lib/evidence-manifest";
import type { EvidenceManifestEnvelopeV1 } from "@/lib/types";
import {
  mapScoutToManifestInput,
  sanitizeManifestFilename,
  validateManifestPrerequisites
} from "@/lib/manifest-helpers";
import type { ContractExperiment, ContributionLane, EvidencePack } from "@/lib/types";

interface ImplRefs {
  repositoryUrl: string;
  repositoryCommit: string;
  deploymentUrl: string;
}

export function PortableManifestSection({
  evidencePack,
  experiment,
  contributionLane
}: {
  evidencePack: EvidencePack;
  experiment?: ContractExperiment;
  contributionLane?: ContributionLane;
}) {
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [repositoryCommit, setRepositoryCommit] = useState("");
  const [deploymentUrl, setDeploymentUrl] = useState("");
  const [manifest, setManifest] = useState<EvidenceManifestEnvelopeV1 | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [showRawJson, setShowRawJson] = useState(false);
  const downloadRef = useRef<HTMLAnchorElement>(null);

  const implRefs: ImplRefs = useMemo(
    () => ({ repositoryUrl, repositoryCommit, deploymentUrl }),
    [repositoryUrl, repositoryCommit, deploymentUrl]
  );

  useEffect(() => {
    setManifest(null);
    setErrors([]);
  }, [
    evidencePack.experimentId,
    evidencePack.title,
    evidencePack.projectSummary,
    evidencePack.genLayerRelevance,
    evidencePack.whatWasTested,
    evidencePack.knownLimitations,
    evidencePack.nextMilestone,
    evidencePack.additionalEvidenceLinks,
    evidencePack.contractAddressNotApplicableReason,
    evidencePack.transactionHashNotApplicableReason,
    experiment?.id,
    experiment?.status,
    experiment?.transactionHash,
    experiment?.deployedContractAddress,
    experiment?.verification,
    implRefs
  ]);

  const prerequisites = useMemo(
    () => validateManifestPrerequisites({
      experiment,
      evidencePack,
      repositoryUrl: implRefs.repositoryUrl,
      repositoryCommit: implRefs.repositoryCommit,
      deploymentUrl: implRefs.deploymentUrl
    }),
    [experiment, evidencePack, implRefs]
  );

  const canGenerate = prerequisites.length === 0;

  const generate = useCallback(() => {
    if (!canGenerate) return;
    setErrors([]);
    setManifest(null);

    try {
      const input = mapScoutToManifestInput({
        evidencePack,
        experiment,
        contributionLane,
        repositoryUrl: implRefs.repositoryUrl,
        repositoryCommit: implRefs.repositoryCommit,
        deploymentUrl: implRefs.deploymentUrl,
        createdAt: new Date().toISOString()
      });
      const envelope = createEvidenceManifestV1(input);
      setManifest(envelope);
    } catch (err) {
      setErrors([
        err instanceof Error ? err.message : "An unexpected error occurred while generating the manifest."
      ]);
    }
  }, [canGenerate, evidencePack, experiment, contributionLane, implRefs]);

  const handleDownload = useCallback(() => {
    if (!manifest) return;
    const json = JSON.stringify(manifest, null, 2);
    const blob = new Blob([json], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = downloadRef.current;
    if (link) {
      link.href = url;
      link.download = sanitizeManifestFilename(
        manifest.payload.contributionContext.title,
        manifest.integrity.digest
      );
      link.click();
      URL.revokeObjectURL(url);
    }
  }, [manifest]);

  return (
    <section className="card overflow-hidden">
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-semibold">Portable manifest</h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Generate a portable JSON evidence manifest that binds your contribution data, experiment verification, and implementation references to a SHA-256 digest.
        </p>
      </div>
      <div className="space-y-5 p-5">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
          <div className="flex gap-3">
            <Info size={17} className="mt-0.5 shrink-0" aria-hidden="true" />
            <p className="leading-6">
              Implementation references link the manifest to your source code and deployment. These fields are not saved to your workspace and will reset on page refresh.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <label>
            <span className="label">Repository URL</span>
            <input
              className="field"
              value={repositoryUrl}
              onChange={(e) => setRepositoryUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
            />
          </label>
          <label>
            <span className="label">Repository commit</span>
            <input
              className="field font-mono"
              value={repositoryCommit}
              onChange={(e) => setRepositoryCommit(e.target.value)}
              placeholder="Full 40- or 64-character commit SHA"
            />
          </label>
          <label>
            <span className="label">Deployment URL</span>
            <input
              className="field"
              value={deploymentUrl}
              onChange={(e) => setDeploymentUrl(e.target.value)}
              placeholder="https://example.vercel.app"
            />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="btn-primary"
            disabled={!canGenerate}
            onClick={generate}
          >
            <FileJson size={16} />
            Generate manifest
          </button>
          {!canGenerate && (
            <span className="text-xs text-slate-500">
              {prerequisites.length} prerequisite{prerequisites.length === 1 ? "" : "s"} remaining
            </span>
          )}
        </div>

        {prerequisites.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-xs text-amber-700">
            {prerequisites.map((p) => (
              <li key={p.field}>{p.message}</li>
            ))}
          </ul>
        )}

        {errors.length > 0 && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <p className="font-semibold">Generation failed</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              {errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {manifest && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-950">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold">Manifest generated</h3>
              <button className="btn-primary !px-3 !py-2" onClick={handleDownload}>
                <Download size={15} /> Download JSON manifest
              </button>
            </div>

            <dl className="grid gap-3 text-xs sm:grid-cols-2">
              <div>
                <dt className="font-semibold">Format</dt>
                <dd className="font-mono">{manifest.format} v{manifest.payload.version}</dd>
              </div>
              <div>
                <dt className="font-semibold">Generated at</dt>
                <dd>{new Date(manifest.payload.experimentDetails!.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="font-semibold">Contribution title</dt>
                <dd>{manifest.payload.contributionContext.title || "Not set"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Experiment</dt>
                <dd>{manifest.payload.implementationReferences?.contractName ?? "None"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Transaction hash</dt>
                <dd className="break-all font-mono">{manifest.payload.implementationReferences?.transactionHash ?? "None"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Contract address</dt>
                <dd className="break-all font-mono">{manifest.payload.implementationReferences?.deployedContractAddress || "Not deployed"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Recorded status</dt>
                <dd>{manifest.payload.experimentDetails?.status ?? "None"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Verification result</dt>
                <dd>{manifest.payload.verification?.result ?? "None"}</dd>
              </div>
              <div>
                <dt className="font-semibold">RPC source</dt>
                <dd>{manifest.payload.verification?.rpcProfile ?? "None"}</dd>
              </div>
              <div>
                <dt className="font-semibold">Repository commit</dt>
                <dd className="break-all font-mono">{manifest.payload.implementationReferences?.repositoryCommit ?? "None"}</dd>
              </div>
            </dl>

            <div className="mt-4 border-t border-emerald-200 pt-3">
              <dt className="text-xs font-semibold">SHA-256 digest</dt>
              <dd className="mt-1 break-all font-mono text-[11px] text-emerald-800">{manifest.integrity.digest}</dd>
              <p className="mt-2 text-[11px] text-emerald-700">
                The digest makes changes to the manifest payload detectable. It does not prove who created or owns the evidence.
              </p>
            </div>

            <div className="mt-4 border-t border-emerald-200 pt-3">
              <button
                className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950"
                onClick={() => setShowRawJson(!showRawJson)}
              >
                {showRawJson ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                {showRawJson ? "Hide raw JSON" : "Show raw JSON"}
              </button>
              {showRawJson && (
                <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded border border-emerald-200 bg-white p-3 font-mono text-[11px] leading-5 text-slate-700">
                  {JSON.stringify(manifest, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
      <a ref={downloadRef} className="hidden" aria-hidden="true" />
    </section>
  );
}
