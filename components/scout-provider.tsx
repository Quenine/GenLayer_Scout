"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { reconcileExperimentVerification } from "@/lib/experiment-verification";
import { createEmptyWorkspace } from "@/lib/seed-data";
import { loadWorkspace, saveWorkspace } from "@/lib/storage";
import type {
  BuildLogEntry,
  ContractExperiment,
  ContributionLaneStatus,
  EvidencePack,
  ScoutWorkspace
} from "@/lib/types";

interface ScoutContextValue extends ScoutWorkspace {
  storageWarning: string | null;
  addExperiment: (experiment: ContractExperiment) => void;
  updateExperiment: (experiment: ContractExperiment) => void;
  deleteExperiment: (id: string) => void;
  addBuildLogEntry: (entry: BuildLogEntry) => void;
  deleteBuildLogEntry: (id: string) => void;
  updateContributionLane: (id: string, status: ContributionLaneStatus) => void;
  updateEvidencePack: (evidencePack: EvidencePack) => void;
  replaceWorkspace: (workspace: ScoutWorkspace) => void;
  resetWorkspace: () => void;
}

const ScoutContext = createContext<ScoutContextValue | null>(null);

export function ScoutProvider({ children }: { children: React.ReactNode }) {
  const [workspace, setWorkspace] = useState<ScoutWorkspace>(createEmptyWorkspace);
  const [hydrated, setHydrated] = useState(false);
  const [storageWarning, setStorageWarning] = useState<string | null>(null);

  useEffect(() => {
    try {
      const result = loadWorkspace(window.localStorage);
      setWorkspace(result.workspace);
      if (result.recoveredFromCorruption) {
        setStorageWarning(
          "Scout could not read the saved workspace and started a clean local workspace."
        );
      }
    } catch {
      setStorageWarning(
        "Scout cannot access browser storage. Changes may not persist after this tab closes."
      );
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      saveWorkspace(window.localStorage, workspace);
    } catch {
      setStorageWarning(
        "Scout could not save changes in this browser. Check storage permissions before relying on this workspace."
      );
    }
  }, [workspace, hydrated]);

  const addExperiment = useCallback((experiment: ContractExperiment) => {
    setWorkspace((current) => ({
      ...current,
      experiments: [experiment, ...current.experiments]
    }));
  }, []);

  const updateExperiment = useCallback((experiment: ContractExperiment) => {
    setWorkspace((current) => ({
      ...current,
      experiments: current.experiments.map((existing) =>
        existing.id === experiment.id
          ? reconcileExperimentVerification(existing, experiment)
          : existing
      )
    }));
  }, []);

  const deleteExperiment = useCallback((id: string) => {
    setWorkspace((current) => ({
      ...current,
      experiments: current.experiments.filter(
        (experiment) => experiment.id !== id
      ),
      evidencePack:
        current.evidencePack.experimentId === id
          ? { ...current.evidencePack, experimentId: "" }
          : current.evidencePack
    }));
  }, []);

  const addBuildLogEntry = useCallback((entry: BuildLogEntry) => {
    setWorkspace((current) => ({
      ...current,
      buildLogEntries: [entry, ...current.buildLogEntries]
    }));
  }, []);

  const deleteBuildLogEntry = useCallback((id: string) => {
    setWorkspace((current) => ({
      ...current,
      buildLogEntries: current.buildLogEntries.filter((entry) => entry.id !== id)
    }));
  }, []);

  const updateContributionLane = useCallback(
    (id: string, status: ContributionLaneStatus) => {
      setWorkspace((current) => ({
        ...current,
        contributionLanes: current.contributionLanes.map((lane) =>
          lane.id === id ? { ...lane, status } : lane
        )
      }));
    },
    []
  );

  const updateEvidencePack = useCallback((evidencePack: EvidencePack) => {
    setWorkspace((current) => ({ ...current, evidencePack }));
  }, []);

  const replaceWorkspace = useCallback((nextWorkspace: ScoutWorkspace) => {
    setWorkspace(nextWorkspace);
    setStorageWarning(null);
  }, []);

  const resetWorkspace = useCallback(() => {
    setWorkspace(createEmptyWorkspace());
    setStorageWarning(null);
  }, []);

  const value = useMemo(
    () => ({
      ...workspace,
      storageWarning,
      addExperiment,
      updateExperiment,
      deleteExperiment,
      addBuildLogEntry,
      deleteBuildLogEntry,
      updateContributionLane,
      updateEvidencePack,
      replaceWorkspace,
      resetWorkspace
    }),
    [
      workspace,
      storageWarning,
      addExperiment,
      updateExperiment,
      deleteExperiment,
      addBuildLogEntry,
      deleteBuildLogEntry,
      updateContributionLane,
      updateEvidencePack,
      replaceWorkspace,
      resetWorkspace
    ]
  );

  return <ScoutContext.Provider value={value}>{children}</ScoutContext.Provider>;
}

export function useScout() {
  const context = useContext(ScoutContext);
  if (!context) {
    throw new Error("useScout must be used within ScoutProvider");
  }
  return context;
}
