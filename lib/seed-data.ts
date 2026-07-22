import type {
  ContributionCategory,
  ContributionLane,
  EvidencePack,
  ScoutWorkspace
} from "@/lib/types";

export const CONTRIBUTION_CATEGORIES: readonly ContributionCategory[] = [
  { id: "projects", name: "Projects", minimumPoints: 20, maximumPoints: 4000, pioneerOpportunity: false },
  { id: "milestones", name: "Milestones", minimumPoints: 20, maximumPoints: 4000, pioneerOpportunity: false },
  { id: "research-analysis", name: "Research & Analysis", minimumPoints: 50, maximumPoints: 2500, pioneerOpportunity: false },
  { id: "tools-infrastructure", name: "Tools & Infrastructure", minimumPoints: 50, maximumPoints: 2500, pioneerOpportunity: false },
  { id: "community-building", name: "Community Building", minimumPoints: 50, maximumPoints: 2500, pioneerOpportunity: false },
  { id: "explorer", name: "Explorer", minimumPoints: 500, maximumPoints: 1500, pioneerOpportunity: true },
  { id: "network-dashboard", name: "Network Dashboard", minimumPoints: 150, maximumPoints: 1500, pioneerOpportunity: false },
  { id: "third-party-integrations", name: "3rd party integrations", minimumPoints: 50, maximumPoints: 1000, pioneerOpportunity: true },
  { id: "grayboxing", name: "Grayboxing", minimumPoints: 50, maximumPoints: 1000, pioneerOpportunity: true },
  { id: "gas-fees-simulator-tests", name: "Gas Fees Simulator Tests", minimumPoints: 500, maximumPoints: 1000, pioneerOpportunity: true },
  { id: "benchmarks", name: "Benchmarks", minimumPoints: 50, maximumPoints: 500, pioneerOpportunity: true },
  { id: "create-intelligent-contracts", name: "Create Intelligent Contracts", minimumPoints: 50, maximumPoints: 500, pioneerOpportunity: false },
  { id: "educational-content", name: "Educational Content", minimumPoints: 20, maximumPoints: 600, pioneerOpportunity: false },
  { id: "bug-report", name: "Bug Report", minimumPoints: 20, maximumPoints: 200, pioneerOpportunity: false },
  { id: "blog-post", name: "Blog Post", minimumPoints: 20, maximumPoints: 200, pioneerOpportunity: false }
];

export function createContributionLanes(): ContributionLane[] {
  return CONTRIBUTION_CATEGORIES.map((category) => ({
    ...category,
    status: "watching"
  }));
}

export const EMPTY_EVIDENCE_PACK: EvidencePack = {
  experimentId: "",
  contributionCategoryId: "",
  title: "",
  projectSummary: "",
  genLayerRelevance: "",
  contractAddressNotApplicableReason: "",
  transactionHashNotApplicableReason: "",
  whatWasTested: "",
  knownLimitations: "",
  nextMilestone: "",
  additionalEvidenceLinks: "",
  portalSubmissionNotes: ""
};

export function createEmptyWorkspace(): ScoutWorkspace {
  return {
    schemaVersion: 1,
    experiments: [],
    contributionLanes: createContributionLanes(),
    buildLogEntries: [],
    evidencePack: { ...EMPTY_EVIDENCE_PACK }
  };
}
