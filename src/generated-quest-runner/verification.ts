import {
  generatedQuestProofSchema,
  type GeneratedQuestProof,
  type GeneratedQuestRunJournal,
  type GeneratedVerificationProfile,
} from "../contracts/index.js";
import { createTopDownArenaVerifier } from "../project-creation/godot-verifier.js";
import { verifyGravityOrbPresence, verifyRelayActivation } from "../godot/generated-quest-verification.js";
import { reviewBoundary } from "./boundary.js";
import { generatedProfileCatalog } from "./profiles.js";

export interface GeneratedProofDependencies {
  projectHealth?: (input: { projectPath: string; projectId: string; forgeHome: string; verifiedAt: string }) => Promise<{ output: string; godotVersion: string }>;
  mechanic?: (input: { projectPath: string; forgeHome: string }) => Promise<{ output: string; godotVersion: string }>;
}

function pending(summary: string) {
  return { result: "pending" as const, summary, evidence: [], verifiedAt: null };
}

export function createPendingGeneratedProof(profileId: GeneratedVerificationProfile = "gravity_orb_presence_v1"): GeneratedQuestProof {
  const profile = generatedProfileCatalog[profileId];
  return generatedQuestProofSchema.parse({
    boundary: pending("Waiting for exact file-boundary review."),
    projectHealth: pending("Waiting for controlled starter health verification."),
    mechanic: pending(profile.pendingProofSummary),
    creator: pending("Waiting for the creator to play the real game."),
  });
}

function failure(error: unknown, verifiedAt: string) {
  const message = (error instanceof Error ? error.message : String(error)).slice(0, 2_000);
  return { result: "failed" as const, summary: message, evidence: [message], verifiedAt };
}

export async function runGeneratedAutomatedProof(options: {
  journal: GeneratedQuestRunJournal;
  forgeHome: string;
  now: () => Date;
  verificationProfile: GeneratedVerificationProfile;
  dependencies?: GeneratedProofDependencies;
}): Promise<GeneratedQuestProof> {
  const verifiedAt = options.now().toISOString();
  const profile = generatedProfileCatalog[options.verificationProfile];
  const proof = createPendingGeneratedProof(options.verificationProfile);
  const boundary = await reviewBoundary({
    projectPath: options.journal.canonicalProjectPath,
    startHead: options.journal.startHead,
    startInventory: options.journal.startInventory,
    allowedFiles: options.journal.allowedFiles,
  });
  proof.boundary = boundary.passed
    ? {
        result: "passed",
        summary: `Only ${boundary.changedFiles.join(", ")} changed inside the approved existing-file boundary.`,
        evidence: [
          `Start HEAD remained ${options.journal.startHead}.`,
          `Changed files: ${boundary.changedFiles.join(", ")}.`,
          "No new, deleted, renamed, linked, state, cache, dependency, or verifier path was accepted.",
        ],
        verifiedAt,
      }
    : {
        result: "failed",
        summary: "The generated project diff left the approved existing-file boundary.",
        evidence: boundary.problems,
        verifiedAt,
      };
  if (!boundary.passed) return generatedQuestProofSchema.parse(proof);

  try {
    const health = options.dependencies?.projectHealth
      ? await options.dependencies.projectHealth({
          projectPath: options.journal.canonicalProjectPath,
          projectId: options.journal.projectId,
          forgeHome: options.forgeHome,
          verifiedAt,
        })
      : await createTopDownArenaVerifier()({
          projectPath: options.journal.canonicalProjectPath,
          projectId: options.journal.projectId,
          forgeHome: options.forgeHome,
          verifiedAt,
        });
    proof.projectHealth = {
      result: "passed",
      summary: "Pinned Godot loaded the controlled starter and its baseline behavior.",
      evidence: [`Godot ${health.godotVersion}`, health.output.slice(-2_000)],
      verifiedAt,
    };
  } catch (error) {
    proof.projectHealth = failure(error, verifiedAt);
    return generatedQuestProofSchema.parse(proof);
  }

  try {
    const mechanic = options.dependencies?.mechanic
      ? await options.dependencies.mechanic({ projectPath: options.journal.canonicalProjectPath, forgeHome: options.forgeHome })
      : options.verificationProfile === "relay_activation_v1"
        ? await verifyRelayActivation({ projectPath: options.journal.canonicalProjectPath, forgeHome: options.forgeHome })
        : await verifyGravityOrbPresence({ projectPath: options.journal.canonicalProjectPath, forgeHome: options.forgeHome });
    proof.mechanic = {
      result: "passed",
      summary: profile.mechanicProofSummary,
      evidence: [`Godot ${mechanic.godotVersion}`, mechanic.output.slice(-2_000)],
      verifiedAt,
    };
  } catch (error) {
    proof.mechanic = failure(error, verifiedAt);
  }
  return generatedQuestProofSchema.parse(proof);
}

export function automatedProofPassed(proof: GeneratedQuestProof): boolean {
  return proof.boundary.result === "passed" && proof.projectHealth.result === "passed" && proof.mechanic.result === "passed";
}
