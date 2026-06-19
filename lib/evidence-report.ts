import type {
  ContractExperiment,
  ContributionLane,
  EvidencePack
} from "@/lib/types";

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

  return `# ${valueOrPrompt(evidencePack.title, "Contribution title")}

## Contribution category
${contributionLane?.name ?? "_[Select a contribution category]_"}

## Project summary
${valueOrPrompt(evidencePack.projectSummary, "Describe what was built or investigated")}

## GenLayer relevance
${valueOrPrompt(evidencePack.genLayerRelevance, "Explain why this is useful to GenLayer builders or contributors")}

## Contract and deployment evidence
- **Studio contract file:** ${experiment?.studioFileName || "Not recorded"}
- **Deployed contract address:** ${experiment?.deployedContractAddress || "Not recorded"}
- **Transaction hash:** ${experiment?.transactionHash || "Not recorded"}
- **Observed transaction state:** ${experiment?.status || "Not recorded"}

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
Prepared in GenLayer Scout v0.1 from manually entered records. Verify addresses, hashes, transaction states, and links against the original Studio evidence before submission.`;
}
