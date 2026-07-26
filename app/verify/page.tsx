"use client";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { useScout } from "@/components/scout-provider";
import { CopyableValue } from "@/components/shared/copyable-value";
import { verifyGenLayerTransaction } from "@/lib/genlayer-verifier";
import type { ExperimentVerification } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export default function VerifyPage() {
  const { experiments, updateExperiment } = useScout();
  const [id, setId] = useState(""); const experiment = experiments.find((item) => item.id === id);
  const [rpcUrl, setRpcUrl] = useState(""); const [hash, setHash] = useState(""); const [address, setAddress] = useState("");
  const [result, setResult] = useState<ExperimentVerification>(); const [checking, setChecking] = useState(false);
  useEffect(() => { setHash(experiment?.transactionHash ?? ""); setAddress(experiment?.deployedContractAddress ?? ""); setRpcUrl(experiment?.verification?.rpcUrl ?? ""); setResult(experiment?.verification); }, [experiment]);
  async function check() { if (!experiment) return; setChecking(true); const next = await verifyGenLayerTransaction({ rpcUrl, transactionHash: hash, manualStatus: experiment.status, manualContractAddress: address }); setResult(next); updateExperiment({ ...experiment, verification: next, updatedAt: new Date().toISOString() }); setChecking(false); }
  const display = (value: boolean | null) => value === null ? "Not comparable" : value ? "Yes" : "No";
  return <>
    <PageHeader eyebrow="Read-only RPC observation" title="Verify experiment" description="Check a recorded transaction against a GenLayer JSON-RPC endpoint. This does not sign, submit, modify chain state, establish Portal acceptance, or predict rewards." />
    <section className="card p-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label><span className="label">Experiment</span><select className="field" value={id} onChange={(e) => setId(e.target.value)}><option value="">Select an experiment</option>{experiments.map((item) => <option value={item.id} key={item.id}>{item.contractName}</option>)}</select></label>
        <label><span className="label">RPC endpoint</span><input className="field font-mono" value={rpcUrl} onChange={(e) => setRpcUrl(e.target.value)} placeholder="https://your-genlayer-rpc.example" /></label>
        <label><span className="label">Transaction hash for this check</span><input className="field font-mono" value={hash} onChange={(e) => setHash(e.target.value)} /></label>
        <label><span className="label">Manual contract address for comparison</span><input className="field font-mono" value={address} onChange={(e) => setAddress(e.target.value)} /></label>
      </div>
      <button className="btn-primary mt-5" disabled={!experiment || checking || !rpcUrl.trim() || !hash.trim()} onClick={check}>{checking ? "Checking RPC..." : "Run read-only check"}</button>
      {!experiments.length && <p className="mt-4 text-sm text-amber-700">Record an experiment before running verification.</p>}
    </section>
    {experiment && result && <section className="card mt-6 overflow-hidden"><div className="border-b border-line p-5"><h2 className="text-sm font-semibold">Manual record and RPC observation</h2><p className="mt-1 text-xs text-slate-500">Saved to this experiment at {formatDate(result.checkedAt)}.</p></div>
      <div className="grid gap-px bg-line md:grid-cols-2"><div className="bg-white p-5"><h3 className="label">Manual values</h3><p className="text-sm">Status: <strong>{experiment.status}</strong></p><div className="mt-3"><CopyableValue label="manual transaction hash" value={hash} compact={false} /></div><div className="mt-3"><CopyableValue label="manual contract address" value={address} compact={false} /></div></div>
      <div className="bg-white p-5"><h3 className="label">Observed values</h3><p className="text-sm">Result: <strong className="capitalize">{result.result.replace("_", " ")}</strong></p><p className="mt-2 text-sm">Status: {result.observedStatus || "Not available"} (match: {display(result.statusMatchesManual)})</p><p className="mt-2 text-sm">Receipt: {result.receiptAvailable ? "Available" : "Unavailable"}</p><div className="mt-3"><CopyableValue label="observed address" value={result.observedContractAddress} compact={false} /></div><p className="mt-2 text-sm">Address match: {display(result.addressMatchesManual)}</p>{result.errorMessage && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{result.errorMessage}</p>}</div></div>
    </section>}
  </>;
}
