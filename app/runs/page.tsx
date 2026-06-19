"use client";

import { useMemo, useState } from "react";
import { Filter, Plus, Search } from "lucide-react";
import { ExperimentForm } from "@/components/experiments/experiment-form";
import { ExperimentList } from "@/components/experiments/experiment-list";
import { PageHeader } from "@/components/page-header";
import { StorageWarning } from "@/components/storage-warning";
import { useScout } from "@/components/scout-provider";
import { EXPERIMENT_STATUSES, type ExperimentStatus } from "@/lib/types";

export default function ExperimentsPage() {
  const {
    experiments,
    addExperiment,
    deleteExperiment,
    storageWarning
  } = useScout();
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ExperimentStatus | "all">(
    "all"
  );

  const filteredExperiments = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return experiments.filter((experiment) => {
      const matchesStatus =
        statusFilter === "all" || experiment.status === statusFilter;
      const searchableValues = [
        experiment.contractName,
        experiment.studioFileName,
        experiment.transactionHash,
        experiment.deployedContractAddress,
        experiment.experimentNotes
      ]
        .join(" ")
        .toLowerCase();
      return matchesStatus && searchableValues.includes(normalizedSearch);
    });
  }, [experiments, search, statusFilter]);

  const hasFilters = Boolean(search.trim()) || statusFilter !== "all";

  return (
    <>
      <PageHeader
        eyebrow="Manual experiment ledger"
        title="Contract experiments"
        description="Record each Studio contract file, deployment result, observed transaction state, and supporting evidence. Scout does not verify these values against GenLayer."
        action={
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} />
            Record experiment
          </button>
        }
      />

      {storageWarning && <StorageWarning message={storageWarning} />}

      {showForm && (
        <ExperimentForm
          onSave={(experiment) => {
            addExperiment(experiment);
            setShowForm(false);
          }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <section className="card overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <input
              className="field pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search contract experiments"
              placeholder="Search contract name, Studio file, hash, address, or notes"
            />
          </div>
          <div className="relative sm:w-52">
            <Filter
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <select
              className="field appearance-none pl-9 capitalize"
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as ExperimentStatus | "all")
              }
              aria-label="Filter by observed state"
            >
              <option value="all">All states</option>
              {EXPERIMENT_STATUSES.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>

        <ExperimentList
          experiments={filteredExperiments}
          hasFilters={hasFilters}
          onDelete={(id) => {
            if (window.confirm("Delete this experiment record from the local workspace?")) {
              deleteExperiment(id);
            }
          }}
          onCreate={() => setShowForm(true)}
        />
      </section>
    </>
  );
}
