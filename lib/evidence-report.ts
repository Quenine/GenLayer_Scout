import { APP_VERSION } from "@/lib/app-metadata";
import type {
  ContractExperiment,
  ContributionLane,
  EvidencePack,
  ExperimentVerification
} from "@/lib/types";
import { formatDate } from "@/lib/utils";

function valueOrPrompt(value: string, prompt: string) {
  return value.trim() || `_[${prompt}]_`;
}

function displayEnum(value: string) {
  const words = value.split("_").join(" ").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function comparisonLabel(value: boolean | null) {
  if (value === null) {
    return "Not comparable";
  }

  return value ? "Yes" : "No";
}

function capabilityLabel(
  capability: ExperimentVerification["receiptCapability"]
) {
  if (capability === "unsupported") {
    return "Unsupported by this endpoint";
  }

  return displayEnum(capability);
}

function buildVerificationSection(
  verification: ExperimentVerification
) {
  const receiptLines = [
    `- **Receipt method:** ${capabilityLabel(verification.receiptCapability)}`
  ];
  if (verification.observedRecipient) {
    receiptLines.push(`- **Receipt recipient:** ${verification.observedRecipient}`);
  }

  const contractStateLines = [
    `- **Contract-state method:** ${capabilityLabel(verification.contractStateCapability)}`
  ];
  if (verification.contractStateCapability === "available") {
    contractStateLines.push(
      `- **Contract-state lookup:** ${displayEnum(verification.contractLookup)}`
    );
  }

  return `
## Verification snapshot

- **Snapshot version:** ${verification.snapshot.version}
- **Checked transaction hash:** ${verification.snapshot.transactionHash || "Not recorded"}
- **Checked contract address:** ${verification.snapshot.contractAddress || "Not recorded"}
- **Checked manual status:** ${verification.snapshot.manualStatus}
- **Checked at:** ${formatDate(verification.checkedAt)}

## Read-only verification

- **RPC profile:** ${displayEnum(verification.rpcProfile)}
- **Source RPC:** ${verification.rpcUrl}
- **Transaction-status request format:** ${displayEnum(verification.transactionStatusDialect)}
- **Transaction found:** ${verification.transactionFound ? "Yes" : "No"}
- **Observed status:** ${verification.observedStatus || "Not available"}
- **Recorded status:** ${verification.snapshot.manualStatus}
- **Status match:** ${comparisonLabel(verification.statusMatchesManual)}
${receiptLines.join("\n")}
${contractStateLines.join("\n")}
- **Result:** ${displayEnum(verification.result)}
${verification.errorMessage ? `- **Error:** ${verification.errorMessage}\n` : ""}
Scope: this check confirms the lifecycle status returned by the selected RPC endpoint for the captured inputs. It does not verify source-code provenance, authorship or contract behavior.
`;
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
  const verificationSection = experiment?.verification
    ? buildVerificationSection(experiment.verification)
    : "";

  return `# ${valueOrPrompt(evidencePack.title, "Contribution title")}

Generated: ${formatDate(generatedAt)}

> Provenance: experiment details and narrative were recorded locally. The verification section is bound to the saved RPC snapshot. Supporting links and authorship claims are not independently validated.

## Contribution category
${contributionLane?.name ?? "_[Select a contribution category]_"}

## Project summary
${valueOrPrompt(evidencePack.projectSummary, "Describe what was built or investigated")}

## GenLayer relevance
${valueOrPrompt(evidencePack.genLayerRelevance, "Explain why this is useful to GenLayer builders or contributors")}

## Experiment record
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
Generated by GenLayer Scout v${APP_VERSION}.`;
}
