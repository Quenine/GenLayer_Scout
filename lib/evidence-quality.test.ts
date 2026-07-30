import { describe, expect, it } from "vitest";
import {
  evaluateEvidenceReadiness,
  evidenceQualityWarningMessage,
  findEvidenceQualityWarnings
} from "@/lib/evidence-quality";
import { createEmptyWorkspace } from "@/lib/seed-data";

describe("evidence content checks", () => {
  it("renders weak-term warnings as natural sentences", () => {
    const evidencePack = {
      ...createEmptyWorkspace().evidencePack,
      knownLimitations: "none",
      nextMilestone: "placeholder",
      portalSubmissionNotes: "demo only"
    };
    const messages = findEvidenceQualityWarnings(evidencePack).map(
      evidenceQualityWarningMessage
    );

    expect(messages).toContain(
      "Known limitations needs a more specific entry than “none”."
    );
    expect(messages).toContain(
      "Next milestone needs a concrete planned outcome."
    );
    expect(messages).toContain(
      "Portal submission notes needs useful implementation or review context."
    );
    expect(messages.join(" ")).not.toContain("weak placeholder term");
  });

  it("uses professional checklist labels while preserving internal statuses", () => {
    const readiness = evaluateEvidenceReadiness({
      evidencePack: createEmptyWorkspace().evidencePack
    });
    const labels = readiness.items.map((item) => item.label);

    expect(readiness.status).toBe("Incomplete");
    expect(labels).toContain("Experiment record");
    expect(labels).toContain("Contract address");
    expect(labels).toContain("Transaction hash");
    expect(labels).not.toContain(
      "Selected contract experiment where applicable"
    );
  });
});