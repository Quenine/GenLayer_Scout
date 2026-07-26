import type {
  ContractExperiment,
  ContributionLane,
  DashboardSummaryStats
} from "@/lib/types";

export function calculateDashboardSummary(
  experiments: ContractExperiment[],
  contributionLanes: ContributionLane[]
): DashboardSummaryStats {
  return {
    experimentsTracked: experiments.length,
    finalizedTransactions: experiments.filter(
      (experiment) => experiment.status === "finalized"
    ).length,
    experimentsMissingEvidence: experiments.filter(
      (experiment) =>
        experiment.status !== "failed" && !experiment.evidenceUrl.trim()
    ).length,
    highOpportunityLanes: contributionLanes.filter(
      (lane) => lane.maximumPoints >= 1500
    ).length,
    readOnlyObservations: experiments.filter((experiment) => experiment.verification && !["unavailable", "manual_only"].includes(experiment.verification.result)).length
  };
}
