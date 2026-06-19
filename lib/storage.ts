import { createEmptyWorkspace } from "@/lib/seed-data";
import {
  BUILD_LOG_ENTRY_TYPES,
  CONTRIBUTION_LANE_STATUSES,
  EXPERIMENT_STATUSES,
  type BuildLogEntry,
  type ContractExperiment,
  type ContributionLane,
  type EvidencePack,
  type ScoutWorkspace
} from "@/lib/types";

export const SCOUT_STORAGE_KEY = "genlayer-scout.workspace.v1";
const LEGACY_STORAGE_KEY = "genlayer-scout-v0.1";
type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function stringField(record: UnknownRecord, key: string) {
  return isString(record[key]) ? record[key] : "";
}

function isContractExperiment(value: unknown): value is ContractExperiment {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.contractName) &&
    isString(value.studioFileName) &&
    isString(value.deployedContractAddress) &&
    isString(value.transactionHash) &&
    EXPERIMENT_STATUSES.includes(value.status as ContractExperiment["status"]) &&
    isString(value.experimentNotes) &&
    isString(value.evidenceUrl) &&
    isString(value.portalSubmissionNotes) &&
    isString(value.createdAt)
  );
}

function isContributionLane(value: unknown): value is ContributionLane {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.name) &&
    typeof value.minimumPoints === "number" &&
    typeof value.maximumPoints === "number" &&
    typeof value.pioneerOpportunity === "boolean" &&
    CONTRIBUTION_LANE_STATUSES.includes(value.status as ContributionLane["status"])
  );
}

function isBuildLogEntry(value: unknown): value is BuildLogEntry {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.date) &&
    BUILD_LOG_ENTRY_TYPES.includes(value.type as BuildLogEntry["type"]) &&
    isString(value.title) &&
    isString(value.details)
  );
}

function isEvidencePack(value: unknown): value is EvidencePack {
  if (!isRecord(value)) return false;
  return [
    "experimentId",
    "contributionCategoryId",
    "title",
    "projectSummary",
    "genLayerRelevance",
    "whatWasTested",
    "knownLimitations",
    "nextMilestone",
    "additionalEvidenceLinks",
    "portalSubmissionNotes"
  ].every((key) => isString(value[key]));
}

export function isScoutWorkspace(value: unknown): value is ScoutWorkspace {
  if (!isRecord(value)) return false;
  return (
    value.schemaVersion === 1 &&
    Array.isArray(value.experiments) &&
    value.experiments.every(isContractExperiment) &&
    Array.isArray(value.contributionLanes) &&
    value.contributionLanes.every(isContributionLane) &&
    Array.isArray(value.buildLogEntries) &&
    value.buildLogEntries.every(isBuildLogEntry) &&
    isEvidencePack(value.evidencePack)
  );
}

function migrateLegacyWorkspace(value: unknown): ScoutWorkspace | null {
  if (!isRecord(value)) return null;
  const workspace = createEmptyWorkspace();

  if (Array.isArray(value.runs)) {
    workspace.experiments = value.runs
      .filter(isRecord)
      .filter((run) => !stringField(run, "id").startsWith("run-demo-"))
      .flatMap((run): ContractExperiment[] => {
        const status = run.status;
        if (
          !isString(status) ||
          !EXPERIMENT_STATUSES.includes(status as ContractExperiment["status"])
        ) {
          return [];
        }
        return [{
          id: stringField(run, "id"),
          contractName: stringField(run, "contractName"),
          studioFileName: stringField(run, "fileName"),
          deployedContractAddress: stringField(run, "deployedAddress"),
          transactionHash: stringField(run, "transactionHash"),
          status: status as ContractExperiment["status"],
          experimentNotes: stringField(run, "notes"),
          evidenceUrl: stringField(run, "evidenceUrl"),
          portalSubmissionNotes: "",
          createdAt: stringField(run, "createdAt")
        }];
      });
  }

  if (Array.isArray(value.opportunities)) {
    const legacyByName = new Map(
      value.opportunities
        .filter(isRecord)
        .map((lane) => [stringField(lane, "category"), lane] as const)
    );
    workspace.contributionLanes = workspace.contributionLanes.map((lane) => {
      const legacy = legacyByName.get(lane.name);
      const status = legacy?.interest;
      return isString(status) &&
        CONTRIBUTION_LANE_STATUSES.includes(status as ContributionLane["status"])
        ? { ...lane, status: status as ContributionLane["status"] }
        : lane;
    });
  }

  if (Array.isArray(value.buildLog)) {
    workspace.buildLogEntries = value.buildLog
      .filter(isRecord)
      .filter((entry) => !stringField(entry, "id").startsWith("log-demo-"))
      .flatMap((entry): BuildLogEntry[] => {
        const type = entry.type;
        if (
          !isString(type) ||
          !BUILD_LOG_ENTRY_TYPES.includes(type as BuildLogEntry["type"])
        ) {
          return [];
        }
        return [{
          id: stringField(entry, "id"),
          date: stringField(entry, "date"),
          type: type as BuildLogEntry["type"],
          title: stringField(entry, "title"),
          details: stringField(entry, "details")
        }];
      });
  }

  if (isRecord(value.evidenceDraft)) {
    const legacyExperimentId = stringField(value.evidenceDraft, "runId");
    workspace.evidencePack = {
      ...workspace.evidencePack,
      experimentId: workspace.experiments.some(
        (experiment) => experiment.id === legacyExperimentId
      )
        ? legacyExperimentId
        : "",
      projectSummary: stringField(value.evidenceDraft, "projectSummary"),
      genLayerRelevance: stringField(value.evidenceDraft, "relevance"),
      whatWasTested: stringField(value.evidenceDraft, "tested"),
      knownLimitations: stringField(value.evidenceDraft, "limitations"),
      nextMilestone: stringField(value.evidenceDraft, "nextMilestone"),
      additionalEvidenceLinks: stringField(value.evidenceDraft, "extraEvidenceLinks")
    };
  }

  return workspace;
}

export function loadWorkspace(storage: Storage): {
  workspace: ScoutWorkspace;
  recoveredFromCorruption: boolean;
} {
  const raw = storage.getItem(SCOUT_STORAGE_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isScoutWorkspace(parsed)) {
        return { workspace: parsed, recoveredFromCorruption: false };
      }
    } catch {
      // Invalid JSON falls through to clean recovery.
    }
    storage.removeItem(SCOUT_STORAGE_KEY);
    return { workspace: createEmptyWorkspace(), recoveredFromCorruption: true };
  }

  const legacyRaw = storage.getItem(LEGACY_STORAGE_KEY);
  if (legacyRaw) {
    try {
      const migrated = migrateLegacyWorkspace(JSON.parse(legacyRaw) as unknown);
      if (migrated) {
        storage.removeItem(LEGACY_STORAGE_KEY);
        return { workspace: migrated, recoveredFromCorruption: false };
      }
    } catch {
      storage.removeItem(LEGACY_STORAGE_KEY);
      return { workspace: createEmptyWorkspace(), recoveredFromCorruption: true };
    }
  }

  return { workspace: createEmptyWorkspace(), recoveredFromCorruption: false };
}

export function saveWorkspace(storage: Storage, workspace: ScoutWorkspace) {
  storage.setItem(SCOUT_STORAGE_KEY, JSON.stringify(workspace));
}
