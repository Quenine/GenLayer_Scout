export const EXPERIMENT_STATUSES = [
  "drafted",
  "deployed",
  "accepted",
  "consensus",
  "finalized",
  "failed"
] as const;

export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const VERIFICATION_RESULTS = [
  "verified",
  "observed",
  "mismatch",
  "not_found",
  "unavailable",
  "manual_only"
] as const;
export type VerificationResult = (typeof VERIFICATION_RESULTS)[number];

export const RPC_PROFILES = [
  "studionet",
  "bradbury",
  "asimov",
  "custom"
] as const;
export type RpcProfile = (typeof RPC_PROFILES)[number];

export const TRANSACTION_STATUS_DIALECTS = ["object", "positional"] as const;
export type TransactionStatusDialect =
  (typeof TRANSACTION_STATUS_DIALECTS)[number];

export const RPC_CAPABILITIES = [
  "available",
  "unsupported",
  "unavailable",
  "not_checked"
] as const;
export type RpcCapability = (typeof RPC_CAPABILITIES)[number];
export const CONTRACT_LOOKUP_RESULTS = [
  "found",
  "not_found",
  "unavailable",
  "not_checked"
] as const;
export type ContractLookupResult = (typeof CONTRACT_LOOKUP_RESULTS)[number];

export interface VerificationSnapshot {
  readonly version: 1;
  readonly transactionHash: string;
  readonly contractAddress: string;
  readonly manualStatus: ExperimentStatus;
}
export interface ExperimentVerification {
  readonly snapshot: VerificationSnapshot;
  source: "genlayer-rpc";
  rpcUrl: string;
  rpcProfile: RpcProfile;
  transactionStatusDialect: TransactionStatusDialect;
  receiptCapability: RpcCapability;
  contractStateCapability: RpcCapability;
  checkedAt: string;
  transactionFound: boolean;
  receiptAvailable: boolean;
  observedStatus: string;
  observedStatusCode: number | null;
  statusMatchesManual: boolean | null;
  observedRecipient: string;
  contractLookup: ContractLookupResult;
  contractStateResult: string;
  result: VerificationResult;
  errorMessage: string;
}

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
  verification?: ExperimentVerification;
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
  readOnlyObservations: number;
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
