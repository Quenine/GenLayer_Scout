import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONTRIBUTION_CATEGORIES } from "../lib/seed-data";
import type {
  BuildLogEntry,
  ContractExperiment,
  ContributionLane,
  EvidencePack,
  ScoutBackupFile,
  ScoutWorkspace
} from "../lib/types";

const ROOT = process.cwd();
const SUBMISSIONS_DIR = join(ROOT, "docs", "submissions");
const SAMPLE_DATA_DIR = join(ROOT, "docs", "sample-data");

const GENERATED_AT = "2026-06-23T12:00:00.000Z";
const FIRST_FAUCET_EXPERIMENT_ID = "experiment-first-studio-faucet-todo";

function writeText(relativePath: string, contents: string) {
  const fullPath = join(ROOT, relativePath);
  writeFileSync(fullPath, `${contents.trim()}\n`, "utf8");
  return relativePath;
}

function createContributionLanes(): ContributionLane[] {
  const buildingLaneIds = new Set([
    "projects",
    "tools-infrastructure",
    "educational-content",
    "create-intelligent-contracts"
  ]);

  return CONTRIBUTION_CATEGORIES.map((category) => ({
    ...category,
    status: category.id === "milestones"
      ? "watching"
      : buildingLaneIds.has(category.id)
        ? "building"
        : "watching"
  }));
}

function createSampleBackup(): ScoutBackupFile {
  const experiment: ContractExperiment = {
    id: FIRST_FAUCET_EXPERIMENT_ID,
    contractName: "First Studio Faucet deployment",
    studioFileName: "TODO: paste exact Studio contract file name, for example faucet.py",
    deployedContractAddress: "TODO: paste exact deployed contract address from the first Studio Faucet deployment",
    transactionHash: "TODO: paste exact transaction hash from the first Studio Faucet deployment",
    status: "deployed",
    experimentNotes: "Local test record for the user's first Studio Faucet deployment. Replace TODO values with exact evidence from Studio before using this in a Portal submission.",
    evidenceUrl: "TODO: add screenshot, repository, or deployment evidence URL for the first Studio Faucet deployment",
    portalSubmissionNotes: "TODO: add reviewer context and reproduction notes after checking the original Studio run.",
    createdAt: GENERATED_AT,
    updatedAt: GENERATED_AT
  };

  const evidencePack: EvidencePack = {
    experimentId: FIRST_FAUCET_EXPERIMENT_ID,
    contributionCategoryId: "projects",
    title: "GenLayer Scout - local-first builder evidence workspace",
    projectSummary: "GenLayer Scout is a local-first dashboard for tracking Studio contract experiments, contribution lanes, build notes, and evidence packs for Portal submissions. It is designed to keep manual evidence organized without claiming live GenLayer API access.",
    genLayerRelevance: "GenLayer builders need a practical way to preserve contract file names, observed deployment states, evidence links, limitations, and next milestones between Studio work and Portal submission writing. Scout focuses on that handoff.",
    contractAddressNotApplicableReason: "",
    transactionHashNotApplicableReason: "",
    whatWasTested: "TODO: replace with observed browser QA results, including dashboard, experiment edit/delete, evidence readiness, Markdown copy/download, backup export/import, and mobile long-hash handling.",
    knownLimitations: "Local-only v0.1.1. No Studio integration, no network verification, no Portal submission API, no point prediction, and one evidence draft at a time.",
    nextMilestone: "v0.2: design a read-only Intelligent Contract verifier only after supported GenLayer verification semantics are confirmed.",
    additionalEvidenceLinks: [
      "TODO: add screenshot of dashboard first-use/readiness flow",
      "TODO: add screenshot of experiment ledger with real first Faucet deployment evidence",
      "TODO: add screenshot or recording of Evidence Pack Markdown generation",
      "TODO: add repository URL only if this project is actually published"
    ].join("\n"),
    portalSubmissionNotes: "This draft is prepared for a Projects submission. All TODO fields must be replaced with real evidence before submission. Scout does not verify contract addresses, hashes, or Portal eligibility."
  };

  const buildLogEntries: BuildLogEntry[] = [
    {
      id: "build-log-studio-faucet-todo",
      date: "2026-06-23",
      type: "progress",
      title: "First Studio deployment completed",
      details: "Recorded the first Studio Faucet deployment as a local test entry. TODO: replace with exact address, transaction hash, and screenshot evidence from the original Studio run."
    },
    {
      id: "build-log-studio-lesson",
      date: "2026-06-23",
      type: "lesson",
      title: "Studio is a code/deployment environment, not a prompt box",
      details: "GenLayer Studio work should be documented like software work: contract file, observed state, deployment evidence, test notes, limitations, and next milestone."
    },
    {
      id: "build-log-scout-workflow",
      date: "2026-06-23",
      type: "progress",
      title: "Created Scout v0.1.1 local-first evidence workflow",
      details: "Built a local workspace for contract experiments, contribution lanes, evidence readiness checks, Markdown generation, build notes, and backup import/export."
    },
    {
      id: "build-log-verifier-plan",
      date: "2026-06-23",
      type: "finding",
      title: "Planned v0.2 Intelligent Contract verifier",
      details: "A verifier should remain read-only and distinguish manual records from externally checked observations. It should only be implemented after supported GenLayer verification semantics are confirmed."
    }
  ];

  const workspace: ScoutWorkspace = {
    schemaVersion: 1,
    experiments: [experiment],
    contributionLanes: createContributionLanes(),
    buildLogEntries,
    evidencePack
  };

  return {
    app: "GenLayer Scout",
    exportedAt: GENERATED_AT,
    schemaVersion: 1,
    workspace
  };
}

const projectSubmission = `# GenLayer Scout - Project Submission Draft

## Project title

GenLayer Scout - local-first builder evidence workspace

## Short summary

GenLayer Scout is a local-first web app for GenLayer contributors who need to track Studio contract experiments, contribution opportunities, build notes, and evidence packs before preparing Builder Portal submissions.

## GenLayer relevance

GenLayer Studio is a developer environment for writing, deploying, and testing Python Intelligent Contracts. A useful Builder Portal submission needs more than a claim that something was built: it needs contract files, observed deployment state, evidence links, limitations, and a clear next milestone. Scout helps organize that handoff without pretending to verify network data.

## Problem observed

While working with Studio and the Portal contribution categories, it became clear that builders can lose important context between an experiment and a later submission:

- Which contract file was used?
- What address and transaction hash were observed?
- Was the state drafted, deployed, accepted, consensus, finalized, or failed?
- Where are the screenshots or repository links?
- What was tested, and what remains unverified?

## What was built

A clean local-first dashboard with:

- Dashboard overview of manually tracked experiments and evidence gaps
- Contract experiment ledger with edit/delete, long hash handling, and copy buttons
- Contribution lane tracker for supplied Portal categories
- Evidence pack generator with Markdown copy/download
- Submission readiness checklist and placeholder quality guard
- Build log for dated progress, findings, bugs, and lessons
- JSON export/import backup flow

## Current v0.1.1 scope

- Next.js App Router, TypeScript, Tailwind CSS
- Browser localStorage persistence
- One local workspace
- One evidence pack draft
- Manual evidence tracking only
- No backend and no paid services

## What is manual

Scout does not connect to Studio, verify addresses, query transaction hashes, submit to the Portal, estimate points, or claim reward eligibility. Builders must manually enter and verify all evidence.

## What was tested

TODO: Replace this section with real QA results before submission.

Suggested items to verify:

- Dashboard first-use flow
- Contract experiment create/edit/delete
- Long address/hash wrapping and copy buttons
- Contribution lane status changes
- Evidence readiness checklist states
- Placeholder quality guard warnings
- Markdown copy/download
- JSON export/import backup
- Mobile viewport behavior

## Known limitations

- No live GenLayer API integration
- No transaction or contract verification
- No Portal submission integration
- One evidence draft at a time
- Browser-local storage only
- Import replaces the workspace instead of merging

## Next milestone

v0.2 should explore a read-only Intelligent Contract verifier, but only after supported GenLayer verification semantics are confirmed. The verifier should clearly distinguish manual records from externally checked observations.

## Evidence checklist

- [ ] TODO: add deployed app or local demo screenshots
- [ ] TODO: add repository URL if public
- [ ] TODO: add real first Studio Faucet deployment contract address
- [ ] TODO: add real first Studio Faucet deployment transaction hash
- [ ] TODO: add screenshot of Evidence Pack readiness checklist
- [ ] TODO: add screenshot or recording of Markdown generation
- [ ] TODO: add browser QA notes
- [ ] TODO: remove all TODO placeholders before Portal submission
`;

const demoScript = `# GenLayer Scout Demo Script

Target length: 60 to 90 seconds.

## Opening, 5-10 seconds

"GenLayer Scout is a local-first workspace for preparing GenLayer Builder Portal evidence. It does not connect to Studio or verify network data yet. Everything here is manually tracked and should be checked against the original evidence."

## Dashboard, 10-15 seconds

Show the dashboard overview:

- experiments tracked
- exact finalized count only when status is finalized
- missing evidence links
- active contribution lanes
- first-use local-first note

## Experiment ledger, 10-15 seconds

Open Contract experiments:

- show the first Studio Faucet deployment test record
- point out TODO address/hash placeholders if real evidence has not been inserted
- show edit flow and copy buttons for address/hash

## Contribution lanes, 10 seconds

Open Contribution lanes:

- show Projects, Tools & Infrastructure, Educational Content, and Create Intelligent Contracts marked Building
- explain Milestones is not marked Building yet because no milestone claim is ready

## Evidence pack generator, 15-20 seconds

Open Evidence pack:

- select the project evidence pack
- show the readiness checklist
- show how selected experiment details are pulled into Markdown
- show TODO evidence links that must be replaced before submission
- use Copy Markdown or Download Markdown

## Build log, 10 seconds

Open Build log:

- show dated notes for Studio learning, Scout implementation, and verifier planning
- explain these are working notes, not proof by themselves

## Export/import backup, 5-10 seconds

Return to dashboard:

- show JSON export/import backup
- explain the sample backup is for testing the local app state, not for fabricating evidence

## Close, 5 seconds

"The next milestone is a v0.2 read-only Intelligent Contract verifier, but only after supported verification semantics are confirmed. Until then, Scout stays honest: local-first, manual, evidence-focused."
`;

const xBuildThread = `# X Build Thread Draft

1/ I built GenLayer Scout because I needed a cleaner way to keep track of GenLayer Studio work before turning it into a Builder Portal submission.

2/ One useful lesson: GenLayer Studio is a code/deployment environment for Python Intelligent Contracts. It is not a prompt box. The evidence trail matters: contract file, observed state, address, hash, screenshots, notes.

3/ Scout is a local-first dashboard for that trail. It tracks contract experiments, contribution lanes, build notes, and evidence pack drafts in the browser.

4/ It does not claim live GenLayer API access. It does not verify transactions. It does not estimate points. If a field needs proof, the app asks for proof or a reason it does not apply.

5/ The Evidence Pack page now has a readiness checklist, placeholder warnings, and Markdown export for Portal-style submission prep.

6/ The goal is boring but useful: help builders submit clearer work, with limitations and evidence separated from the story.

7/ Next milestone: explore a v0.2 Intelligent Contract verifier, but only as read-only verification once supported GenLayer semantics are confirmed.

TODO: attach real screenshots or a short walkthrough before posting.
`;

const communityPost = `# Community Post Draft

I have been working on GenLayer Scout, a local-first workspace for organizing GenLayer Builder Portal submission evidence.

The main lesson from using Studio is that it should be treated like a code/deployment environment, not a prompt interface. A good contribution record needs the contract file, observed deployment state, address/hash when applicable, screenshots, what was tested, limitations, and a next milestone.

Scout helps with that workflow by keeping:

- Studio contract experiment records
- contribution lane planning
- build notes
- evidence pack drafts
- a readiness checklist before submission
- Markdown export for review
- JSON backup/import for local testing

It is intentionally manual right now. There is no live GenLayer API integration, no transaction verification, no Portal submission automation, and no point prediction.

I would appreciate feedback from builders on the evidence checklist especially:

- What fields would make your Portal submissions easier to review?
- What evidence do you often forget to capture during Studio work?
- Would a future read-only Intelligent Contract verifier be useful if it clearly separates verified observations from manual notes?

TODO: add real screenshots or repo/demo links before posting.
`;

const portalFields = `# Portal Fields Draft

## Title

GenLayer Scout - local-first builder evidence workspace

## Contribution category

Projects

## Description

GenLayer Scout is a local-first dashboard for GenLayer contributors preparing Builder Portal submissions. It helps builders manually track Studio contract experiments, contribution lanes, build notes, and evidence packs without claiming live GenLayer API integration.

The v0.1.1 app includes a contract experiment ledger, contribution opportunity tracker, evidence pack generator, submission readiness checklist, quality guard for vague placeholder text, build log, and JSON backup/import flow.

## Impact

Scout is intended to make submissions easier to review by separating evidence from narrative. It encourages builders to preserve exact Studio contract file names, observed states, addresses/hashes where applicable, screenshots, limitations, and next milestones.

## Evidence links

- TODO: add repository URL if public
- TODO: add deployed app URL if available
- TODO: add dashboard screenshot
- TODO: add experiment ledger screenshot with real evidence
- TODO: add evidence pack Markdown screenshot or recording
- TODO: add first Studio Faucet deployment address/hash evidence

## Limitations

- Local-first only
- Manual evidence entry only
- No GenLayer Studio API integration
- No network transaction verification
- No Portal submission automation
- No point prediction or reward claim
- One evidence pack draft at a time

## Roadmap

- v0.2: explore a read-only Intelligent Contract verifier after supported GenLayer verification semantics are confirmed
- Improve evidence completeness checks
- Support multiple named evidence packs
- Link build log entries to experiments and evidence packs
- Add reusable templates by contribution category

## Reviewer notes

All TODO placeholders must be replaced before submission. Scout should be reviewed as a local-first builder workflow tool, not as a live network explorer or official Portal integration.
`;

mkdirSync(SUBMISSIONS_DIR, { recursive: true });
mkdirSync(SAMPLE_DATA_DIR, { recursive: true });

const generated = [
  writeText("docs/submissions/genlayer-scout-project.md", projectSubmission),
  writeText("docs/submissions/genlayer-scout-demo-script.md", demoScript),
  writeText("docs/submissions/x-build-thread.md", xBuildThread),
  writeText("docs/submissions/community-post.md", communityPost),
  writeText("docs/submissions/portal-fields.md", portalFields)
];

const backupPath = "docs/sample-data/genlayer-scout-local-backup.json";
writeFileSync(
  join(ROOT, backupPath),
  `${JSON.stringify(createSampleBackup(), null, 2)}\n`,
  "utf8"
);
generated.push(backupPath);

console.log("Generated GenLayer Scout submission prep files:");
for (const file of generated) {
  console.log(`- ${file}`);
}
console.log("\nReminder: replace every TODO placeholder with real evidence before submitting.");
