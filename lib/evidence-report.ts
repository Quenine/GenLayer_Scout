import type {
  ContractExperiment,
  ContributionLane,
  EvidencePack
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

function valueOrPrompt(value: string, prompt: string) {
  return value.trim() || `_[${prompt}]_`;
}

export function buildEvidencePackMarkdown({
  evidencePack,
  experiment,
  contributionLane
}: {
  evidencePack: EvidencePack;
  experiment?: ContractExperiment;
  contributionLane?: ContributionLane;
}) {
  const links = [
    experiment?.evidenceUrl,
    ...evidencePack.additionalEvidenceLinks
      .split("\n")
      .map((link) => link.trim())
      .filter(Boolean)
  ].filter((link): link is string => Boolean(link));

  const evidenceList = links.length
    ? links.map((link) => `- ${link}`).join("\n")
    : "- [Add Studio screenshots, transaction output, repository links, or test artifacts]";
  const generatedAt = new Date().toISOString();
  const noExperimentNote = experiment
    ? ""
    : "No experiment selected. This evidence pack does not include Studio deployment details.\n";

  return `# ${valueOrPrompt(evidencePack.title, "Contribution title")}

Generated: ${formatDate(generatedAt)}

> Manual evidence note: this report was assembled from local GenLayer Scout records. Addresses, transaction hashes, observed states, screenshots, and links are not automatically verified by Scout.

## Contribution category
${contributionLane?.name ?? "_[Select a contribution category]_"}

## Project summary
${valueOrPrompt(evidencePack.projectSummary, "Describe what was built or investigated")}

## GenLayer relevance
${valueOrPrompt(evidencePack.genLayerRelevance, "Explain why this is useful to GenLayer builders or contributors")}

## Contract and deployment evidence
${noExperimentNote}- **Contract experiment:** ${experiment?.contractName || "Not selected"}
- **Studio contract file:** ${experiment?.studioFileName || "Not recorded"}
- **Deployed contract address:** ${experiment?.deployedContractAddress || evidencePack.contractAddressNotApplicableReason || "Not recorded"}
- **Transaction hash:** ${experiment?.transactionHash || evidencePack.transactionHashNotApplicableReason || "Not recorded"}
- **Observed transaction state:** ${experiment?.status || "Not recorded"}
- **Experiment recorded:** ${experiment ? formatDate(experiment.createdAt) : "Not recorded"}

## Screenshots and evidence links
${evidenceList}

## What was tested
${valueOrPrompt(evidencePack.whatWasTested, "List test cases, inputs, observed outputs, and relevant states")}

## Known limitations
${valueOrPrompt(evidencePack.knownLimitations, "State incomplete work, narrow coverage, and unverified assumptions")}

## Next milestone
${valueOrPrompt(evidencePack.nextMilestone, "State the next concrete result")}

## Portal submission notes
${valueOrPrompt(evidencePack.portalSubmissionNotes, "Add reviewer context, reproduction notes, or scope boundaries")}

---
Prepared in GenLayer Scout v0.1.1 from manually entered records. Verify all evidence against the original Studio run and Portal submission requirements before posting.`;
}
