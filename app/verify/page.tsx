"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useScout } from "@/components/scout-provider";
import { CopyableValue } from "@/components/shared/copyable-value";
import {
  RPC_PRESETS,
  verifyGenLayerTransaction
} from "@/lib/genlayer-verifier";
import type { ExperimentVerification, RpcProfile } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const CUSTOM_RPC = "custom";
type RpcPreset = RpcProfile;

function comparisonLabel(value: boolean | null) {
  if (value === null) {
    return "Not comparable";
  }

  return value ? "Yes" : "No";
}

function presetForUrl(url: string): RpcPreset {
  const entry = Object.entries(RPC_PRESETS).find(([, value]) => value === url);
  return entry ? entry[0] as keyof typeof RPC_PRESETS : CUSTOM_RPC;
}

export default function VerifyPage() {
  const { experiments, updateExperiment } = useScout();
  const [id, setId] = useState("");
  const [rpcPreset, setRpcPreset] = useState<RpcPreset>("studionet");
  const [rpcUrl, setRpcUrl] = useState<string>(RPC_PRESETS.studionet);
  const [customCompatibilityMode, setCustomCompatibilityMode] =
    useState<"object" | "auto">("auto");
  const [result, setResult] = useState<ExperimentVerification>();
  const [checking, setChecking] = useState(false);
  const experiment = experiments.find((item) => item.id === id);

  useEffect(() => {
    const savedUrl = experiment?.verification?.rpcUrl || RPC_PRESETS.studionet;
    setRpcUrl(savedUrl);
    setRpcPreset(presetForUrl(savedUrl));
    setResult(experiment?.verification);
  }, [experiment]);

  function selectPreset(value: RpcPreset) {
    setRpcPreset(value);
    if (value !== CUSTOM_RPC) {
      setRpcUrl(RPC_PRESETS[value]);
    }
  }

  async function check() {
    if (!experiment) {
      return;
    }

    setChecking(true);
    const next = await verifyGenLayerTransaction({
      rpcUrl,
      rpcProfile: rpcPreset,
      customCompatibilityMode,
      transactionHash: experiment.transactionHash,
      manualStatus: experiment.status,
      manualContractAddress: experiment.deployedContractAddress
    });
    setResult(next);
    updateExperiment({
      ...experiment,
      verification: next,
      updatedAt: new Date().toISOString()
    });
    setChecking(false);
  }

  return (
    <>
      <PageHeader
        eyebrow="Read-only RPC observation"
        title="Verify experiment"
        description="Compare a recorded transaction with a GenLayer JSON-RPC endpoint. This does not sign, submit, modify chain state, establish contract authorship or behavior, establish Portal acceptance, or predict rewards."
      />
      <section className="card p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="label">Experiment</span>
            <select
              className="field"
              value={id}
              onChange={(event) => setId(event.target.value)}
            >
              <option value="">Select an experiment</option>
              {experiments.map((item) => (
                <option value={item.id} key={item.id}>
                  {item.contractName}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">RPC preset</span>
            <select
              className="field"
              value={rpcPreset}
              onChange={(event) => selectPreset(event.target.value as RpcPreset)}
            >
              <option value="studionet">Studionet</option>
              <option value="bradbury">Bradbury</option>
              <option value="asimov">Asimov</option>
              <option value={CUSTOM_RPC}>Custom</option>
            </select>
          </label>
          <label>
            <span className="label">RPC endpoint</span>
            <input
              className="field font-mono"
              value={rpcUrl}
              onChange={(event) => {
                setRpcUrl(event.target.value);
                setRpcPreset(presetForUrl(event.target.value));
              }}
              readOnly={rpcPreset !== CUSTOM_RPC}
              placeholder="https://your-genlayer-rpc.example"
            />
          </label>
          {rpcPreset === CUSTOM_RPC && (
            <label>
              <span className="label">Custom compatibility</span>
              <select
                className="field"
                value={customCompatibilityMode}
                onChange={(event) =>
                  setCustomCompatibilityMode(
                    event.target.value as "object" | "auto"
                  )
                }
              >
                <option value="auto">Auto compatibility</option>
                <option value="object">Documented object form only</option>
              </select>
            </label>
          )}          {experiment && (
            <div className="md:col-span-2 grid gap-4 md:grid-cols-2">
              <CopyableValue
                label="recorded transaction hash (read-only)"
                value={experiment.transactionHash}
                compact={false}
              />
              <CopyableValue
                label="recorded contract address (read-only)"
                value={experiment.deployedContractAddress}
                compact={false}
              />
              <p className="text-sm">
                Recorded manual status: <strong>{experiment.status}</strong>
              </p>
            </div>
          )}
        </div>
        <button
          className="btn-primary mt-5"
          disabled={!experiment || checking || !rpcUrl.trim() || !experiment.transactionHash.trim()}
          onClick={check}
        >
          {checking ? "Checking RPC..." : "Run read-only check"}
        </button>
        {!experiments.length && (
          <p className="mt-4 text-sm text-amber-700">
            Record an experiment before running verification.
          </p>
        )}
      </section>
      {experiment && result && (
        <section className="card mt-6 overflow-hidden">
          <div className="border-b border-line p-5">
            <h2 className="text-sm font-semibold">
              Manual record and RPC observation
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Saved to this experiment at {formatDate(result.checkedAt)}.
            </p>
          </div>
          <div className="grid gap-px bg-line md:grid-cols-2">
            <div className="bg-white p-5">
              <h3 className="label">Manual values</h3>
              <p className="text-sm">
                Status: <strong>{result.snapshot.manualStatus}</strong>
              </p>
              <div className="mt-3">
                <CopyableValue
                  label="manual transaction hash"
                  value={result.snapshot.transactionHash}
                  compact={false}
                />
              </div>
              <div className="mt-3">
                <CopyableValue
                  label="manual contract address"
                  value={result.snapshot.contractAddress}
                  compact={false}
                />
              </div>
            </div>
            <div className="bg-white p-5">
              <h3 className="label">Observed values</h3>
              <p className="text-sm">
                RPC profile: <strong>{result.rpcProfile}</strong>
              </p>
              <p className="mt-2 text-sm">
                Request dialect: {result.transactionStatusDialect}
              </p>
              <p className="mt-2 text-sm">
                Result: <strong className="capitalize">{result.result.replace("_", " ")}</strong>
              </p>
              <p className="mt-2 text-sm">
                Status: {result.observedStatus || "Not available"}
                {result.observedStatusCode === null
                  ? ""
                  : ` (code ${result.observedStatusCode})`}
                {` (match: ${comparisonLabel(result.statusMatchesManual)})`}
              </p>
              <p className="mt-2 text-sm">
                Receipt capability: {result.receiptCapability.replace("_", " ")}
              </p>
              <div className="mt-3">
                <CopyableValue
                  label="receipt recipient (not a verified contract address)"
                  value={result.observedRecipient}
                  compact={false}
                />
              </div>
              <p className="mt-2 text-sm">
                Contract-state capability: {result.contractStateCapability.replace("_", " ")}
              </p>
              <p className="mt-2 text-sm">
                Contract-state lookup: {result.contractLookup.replace("_", " ")}
              </p>
              {result.contractLookup === "found" && (
                <p className="mt-2 text-sm text-slate-600">
                  The endpoint returned a string for the manual address. This does
                  not prove authorship or contract behavior.
                </p>
              )}
              {result.rpcProfile === "studionet" && result.result === "verified" && (
                <p className="mt-3 rounded-lg bg-sky-50 p-3 text-sm text-sky-800">
                  Studionet verified the lifecycle status. Receipt and contract-state
                  RPC methods are not exposed by this endpoint.
                </p>
              )}
              <p className="mt-3 text-sm text-slate-600">
                Lifecycle verification does not prove authorship or contract behavior.
              </p>
              {result.errorMessage && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  {result.errorMessage}
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
