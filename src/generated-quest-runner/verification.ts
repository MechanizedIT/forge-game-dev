import {
  generatedQuestProofSchema,
  type GeneratedQuestProof,
  type GeneratedQuestRunJournal,
  type GeneratedVerificationProfile,
} from "../contracts/index.js";
import { createTopDownArenaVerifier } from "../project-creation/godot-verifier.js";
import { verifyGravityOrbPresence, verifyRelayActivation } from "../godot/generated-quest-verification.js";
import { verifyGodotProjectHealth } from "../godot/project-health.js";
import { readContainedUtf8File, reviewBoundary } from "./boundary.js";
import { generatedProfileCatalog } from "./profiles.js";

export interface GeneratedProofDependencies {
  projectHealth?: (input: { projectPath: string; projectId: string; forgeHome: string; verifiedAt: string }) => Promise<{ output: string; godotVersion: string }>;
  mechanic?: (input: { projectPath: string; forgeHome: string }) => Promise<{ output: string; godotVersion: string }>;
}

function pending(summary: string) {
  return { result: "pending" as const, summary, evidence: [], verifiedAt: null };
}

export function createPendingGeneratedProof(profileId: GeneratedVerificationProfile | null = "gravity_orb_presence_v1"): GeneratedQuestProof {
  const profile = profileId ? generatedProfileCatalog[profileId] : null;
  return generatedQuestProofSchema.parse({
    boundary: pending("Waiting for exact file-boundary review."),
    projectHealth: pending("Waiting for controlled starter health verification."),
    mechanic: profile ? pending(profile.pendingProofSummary) : { result: "not_run", summary: "No optional mechanic proof is attached to this work session.", evidence: [], verifiedAt: null },
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
  verificationProfile: GeneratedVerificationProfile | null;
  dependencies?: GeneratedProofDependencies;
}): Promise<GeneratedQuestProof> {
  const verifiedAt = options.now().toISOString();
  const profile = options.verificationProfile ? generatedProfileCatalog[options.verificationProfile] : null;
  const proof = createPendingGeneratedProof(options.verificationProfile);
  const boundary = await reviewBoundary({
    projectPath: options.journal.canonicalProjectPath,
    startHead: options.journal.startHead,
    startInventory: options.journal.startInventory,
    allowedFiles: options.journal.allowedFiles,
  });
  if (boundary.passed) {
    for (const relativePath of boundary.changedFiles) {
      try {
        await readContainedUtf8File(options.journal.canonicalProjectPath, relativePath);
      } catch (error) {
        boundary.passed = false;
        boundary.problems.push(error instanceof Error ? error.message : String(error));
      }
    }
  }
  proof.boundary = boundary.passed
    ? {
        result: "passed",
        summary: options.journal.schemaVersion === 1
          ? `Only ${boundary.changedFiles.join(", ")} changed inside the approved existing-file boundary.`
          : `Only ${boundary.changedFiles.join(", ")} changed inside the creator-approved file boundary.`,
        evidence: [
          `Start HEAD remained ${options.journal.startHead}.`,
          `Changed files: ${boundary.changedFiles.join(", ")}.`,
          options.journal.schemaVersion === 1
            ? "No new, deleted, renamed, linked, state, cache, dependency, or verifier path was accepted."
            : "No undeclared, deleted, renamed, linked, state, cache, dependency, or verifier path was accepted.",
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
      : options.journal.schemaVersion === 1
        ? await createTopDownArenaVerifier()({
            projectPath: options.journal.canonicalProjectPath,
            projectId: options.journal.projectId,
            forgeHome: options.forgeHome,
            verifiedAt,
          })
        : await verifyGodotProjectHealth({ projectPath: options.journal.canonicalProjectPath, forgeHome: options.forgeHome });
    proof.projectHealth = {
      result: "passed",
      summary: options.journal.schemaVersion === 1
        ? "Pinned Godot loaded the controlled starter and its baseline behavior."
        : "Pinned Godot loaded and started the project without a reported error.",
      evidence: [`Godot ${health.godotVersion}`, health.output.slice(-2_000)],
      verifiedAt,
    };
  } catch (error) {
    proof.projectHealth = failure(error, verifiedAt);
    return generatedQuestProofSchema.parse(proof);
  }

  if (!options.verificationProfile || !profile) return generatedQuestProofSchema.parse(proof);

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
  return proof.boundary.result === "passed" && proof.projectHealth.result === "passed" && (proof.mechanic.result === "passed" || proof.mechanic.result === "not_run");
}
