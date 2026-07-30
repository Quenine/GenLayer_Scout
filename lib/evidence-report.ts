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
  const verification = experiment?.verification;
  const verificationSection = verification ? `\n## Verification snapshot

- **Snapshot version:** ${verification.snapshot.version}
- **Checked transaction hash:** ${verification.snapshot.transactionHash || "Not recorded"}
- **Checked contract address:** ${verification.snapshot.contractAddress || "Not recorded"}
- **Checked manual status:** ${verification.snapshot.manualStatus}
- **Checked at:** ${formatDate(verification.checkedAt)}

## Read-only verification
- **RPC profile:** ${verification.rpcProfile}
- **Source RPC:** ${verification.rpcUrl}
- **Successful transaction-status dialect:** ${verification.transactionStatusDialect}
- **Checked at:** ${formatDate(verification.checkedAt)}
- **Transaction found:** ${verification.transactionFound ? "Yes" : "No"}
- **Receipt capability:** ${verification.receiptCapability}
- **Receipt available:** ${verification.receiptAvailable ? "Yes" : "No"}
- **Observed status:** ${verification.observedStatus || "Not available"}
- **Manual status:** ${verification.snapshot.manualStatus}
- **Status match:** ${verification.statusMatchesManual === null ? "Not comparable" : verification.statusMatchesManual ? "Yes" : "No"}
- **Receipt recipient:** ${verification.observedRecipient || "Not available"}
- **Recipient meaning:** Receipt routing only; not proof of the deployed contract address.
- **Manual contract address:** ${verification.snapshot.contractAddress || "Not recorded"}
- **Contract-state capability:** ${verification.contractStateCapability}
- **Contract-state lookup:** ${verification.contractLookup}
- **Contract-state endpoint returned a string:** ${verification.contractLookup === "found" ? "Yes" : "No"}
- **Contract lookup meaning:** A returned string does not prove authorship or contract behavior.
- **Result:** ${verification.result}
${verification.errorMessage ? `- **Error:** ${verification.errorMessage}\n` : ""}
${verification.rpcProfile === "studionet" && verification.result === "verified" ? "Studionet verified the lifecycle status. Receipt and contract-state RPC methods are not exposed by this endpoint.\n" : ""}Lifecycle verification does not prove authorship or contract behavior. This is not GenLayer Builder Portal acceptance or reward eligibility.\n` : "";

  return `# ${valueOrPrompt(evidencePack.title, "Contribution title")}

Generated: ${formatDate(generatedAt)}

> Manual evidence note: this report was assembled from local GenLayer Scout records. RPC observations and safe comparisons are labeled below; screenshots, links, authorship, behavior, and Portal outcomes remain manual evidence.

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
${verificationSection}

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
Prepared in GenLayer Scout v0.2.1. Manual evidence remains necessary; verify all evidence against the original Studio run and Portal submission requirements before posting.`;
}
