"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { EXPERIMENT_STATUSES, type ContractExperiment } from "@/lib/types";
import { makeId } from "@/lib/utils";

interface ExperimentFormValues {
  contractName: string;
  studioFileName: string;
  deployedContractAddress: string;
  transactionHash: string;
  status: ContractExperiment["status"];
  experimentNotes: string;
  evidenceUrl: string;
  portalSubmissionNotes: string;
}

const EMPTY_FORM: ExperimentFormValues = {
  contractName: "",
  studioFileName: "",
  deployedContractAddress: "",
  transactionHash: "",
  status: "drafted",
  experimentNotes: "",
  evidenceUrl: "",
  portalSubmissionNotes: ""
};

function valuesFromExperiment(
  experiment?: ContractExperiment | null
): ExperimentFormValues {
  if (!experiment) return EMPTY_FORM;
  return {
    contractName: experiment.contractName,
    studioFileName: experiment.studioFileName,
    deployedContractAddress: experiment.deployedContractAddress,
    transactionHash: experiment.transactionHash,
    status: experiment.status,
    experimentNotes: experiment.experimentNotes,
    evidenceUrl: experiment.evidenceUrl,
    portalSubmissionNotes: experiment.portalSubmissionNotes
  };
}

export function ExperimentForm({
  initialExperiment,
  onSave,
  onCancel
}: {
  initialExperiment?: ContractExperiment | null;
  onSave: (experiment: ContractExperiment) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<ExperimentFormValues>(() =>
    valuesFromExperiment(initialExperiment)
  );
  const isEditing = Boolean(initialExperiment);

  useEffect(() => {
    setForm(valuesFromExperiment(initialExperiment));
  }, [initialExperiment]);

  function submitExperiment(event: React.FormEvent) {
    event.preventDefault();
    const now = new Date().toISOString();
    onSave({
      id: initialExperiment?.id ?? makeId("experiment"),
      ...form,
      contractName: form.contractName.trim(),
      studioFileName: form.studioFileName.trim(),
      deployedContractAddress: form.deployedContractAddress.trim(),
      transactionHash: form.transactionHash.trim(),
      experimentNotes: form.experimentNotes.trim(),
      evidenceUrl: form.evidenceUrl.trim(),
      portalSubmissionNotes: form.portalSubmissionNotes.trim(),
      createdAt: initialExperiment?.createdAt ?? now,
      updatedAt: isEditing ? now : now
    });
  }

  return (
    <section className="card mb-6">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">
            {isEditing ? "Edit contract experiment" : "Record a contract experiment"}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Copy these values from the Studio session or its saved evidence.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="Close experiment form"
        >
          <X size={18} />
        </button>
      </div>
      <form onSubmit={submitExperiment} className="p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label>
            <span className="label">Contract name *</span>
            <input
              className="field"
              required
              value={form.contractName}
              onChange={(event) =>
                setForm({ ...form, contractName: event.target.value })
              }
              placeholder="Human-readable experiment name"
            />
          </label>
          <label>
            <span className="label">Studio contract file *</span>
            <input
              className="field font-mono"
              required
              value={form.studioFileName}
              onChange={(event) =>
                setForm({ ...form, studioFileName: event.target.value })
              }
              placeholder="contract.py"
            />
          </label>
          <label>
            <span className="label">Observed state</span>
            <select
              className="field capitalize"
              value={form.status}
              onChange={(event) =>
                setForm({
                  ...form,
                  status: event.target.value as ContractExperiment["status"]
                })
              }
            >
              {EXPERIMENT_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="label">Deployed contract address</span>
            <input
              className="field font-mono"
              value={form.deployedContractAddress}
              onChange={(event) =>
                setForm({ ...form, deployedContractAddress: event.target.value })
              }
              placeholder="Paste the address exactly as shown"
            />
          </label>
          <label>
            <span className="label">Transaction hash</span>
            <input
              className="field font-mono"
              value={form.transactionHash}
              onChange={(event) =>
                setForm({ ...form, transactionHash: event.target.value })
              }
              placeholder="Paste the transaction hash"
            />
          </label>
          <label>
            <span className="label">Evidence URL</span>
            <input
              className="field"
              type="url"
              value={form.evidenceUrl}
              onChange={(event) =>
                setForm({ ...form, evidenceUrl: event.target.value })
              }
              placeholder="Screenshot, repository, or test artifact"
            />
          </label>
          <label className="md:col-span-2 xl:col-span-3">
            <span className="label">Experiment notes</span>
            <textarea
              className="field min-h-24 resize-y"
              value={form.experimentNotes}
              onChange={(event) =>
                setForm({ ...form, experimentNotes: event.target.value })
              }
              placeholder="Inputs used, expected behavior, observed result, and follow-up work."
            />
          </label>
          <label className="md:col-span-2 xl:col-span-3">
            <span className="label">Portal submission notes</span>
            <textarea
              className="field min-h-20 resize-y"
              value={form.portalSubmissionNotes}
              onChange={(event) =>
                setForm({ ...form, portalSubmissionNotes: event.target.value })
              }
              placeholder="Reviewer context, reproduction steps, or scope boundaries to preserve for a later submission."
            />
          </label>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn-primary">
            {isEditing ? "Save changes" : "Save experiment"}
          </button>
        </div>
      </form>
    </section>
  );
}
