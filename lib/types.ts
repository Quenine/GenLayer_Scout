export const EXPERIMENT_STATUSES = [
  "drafted",
  "deployed",
  "accepted",
  "consensus",
  "finalized",
  "failed"
] as const;

export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const CONTRIBUTION_LANE_STATUSES = [
  "watching",
  "building",
  "submitted",
  "accepted",
  "deferred"
] as const;

export type ContributionLaneStatus =
  (typeof CONTRIBUTION_LANE_STATUSES)[number];

export const ACTIVE_CONTRIBUTION_LANE_STATUSES = [
  "building",
  "submitted",
  "accepted"
] as const satisfies readonly ContributionLaneStatus[];

export const BUILD_LOG_ENTRY_TYPES = [
  "progress",
  "finding",
  "bug",
  "lesson"
] as const;

export type BuildLogEntryType = (typeof BUILD_LOG_ENTRY_TYPES)[number];

export interface ContractExperiment {
  id: string;
  contractName: string;
  studioFileName: string;
  deployedContractAddress: string;
  transactionHash: string;
  status: ExperimentStatus;
  experimentNotes: string;
  evidenceUrl: string;
  portalSubmissionNotes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContributionCategory {
  id: string;
  name: string;
  minimumPoints: number;
  maximumPoints: number;
  pioneerOpportunity: boolean;
}

export interface ContributionLane extends ContributionCategory {
  status: ContributionLaneStatus;
}

export interface EvidencePack {
  experimentId: string;
  contributionCategoryId: string;
  title: string;
  projectSummary: string;
  genLayerRelevance: string;
  contractAddressNotApplicableReason: string;
  transactionHashNotApplicableReason: string;
  whatWasTested: string;
  knownLimitations: string;
  nextMilestone: string;
  additionalEvidenceLinks: string;
  portalSubmissionNotes: string;
}

export interface BuildLogEntry {
  id: string;
  date: string;
  type: BuildLogEntryType;
  title: string;
  details: string;
}

export interface DashboardSummaryStats {
  experimentsTracked: number;
  finalizedTransactions: number;
  experimentsMissingEvidence: number;
  highOpportunityLanes: number;
}

export interface ScoutWorkspace {
  schemaVersion: 1;
  experiments: ContractExperiment[];
  contributionLanes: ContributionLane[];
  buildLogEntries: BuildLogEntry[];
  evidencePack: EvidencePack;
}

export interface ScoutBackupFile {
  app: "GenLayer Scout";
  exportedAt: string;
  schemaVersion: ScoutWorkspace["schemaVersion"];
  workspace: ScoutWorkspace;
}
