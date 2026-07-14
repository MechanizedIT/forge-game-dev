import { readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ClarificationTopic } from "../contracts/index.js";
import { repositoryRoot } from "../demo/paths.js";
import { OfficialBlueprintModelExecutor } from "./sdk.js";
import { BlueprintPlanningService } from "./service.js";

const idea = "A keyboard-controlled top-down arena where the player taps space to emit a pulse that pushes nearby enemies away. The fun should come from creating space at the last moment. The smallest playable result is one player, one enemy, and one repeatable push in a bounded arena.";
const evidencePath = path.join(repositoryRoot, "docs", "evidence", "2026-07-14-v0.2-task-4a-gpt-planning.json");
const projectsRoot = path.join(process.env.LOCALAPPDATA ?? path.join(process.env.USERPROFILE ?? repositoryRoot, "AppData", "Local"), "Forge", "projects");

async function currentProjectDirectories(): Promise<string[]> {
  return (await readdir(projectsRoot, { withFileTypes: true }).catch(() => []))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

const answersByTopic: Record<ClarificationTopic, string> = {
  game_style: "A compact top-down arena.",
  core_action: "Move and release a pulse that pushes nearby enemies away.",
  fun_target: "Creating space at the last moment should feel weighty and satisfying.",
  input_mode: "Keyboard",
  smallest_playable_result: "One player, one enemy, and one repeatable push in a bounded arena.",
};

const beforeProjects = await currentProjectDirectories();
const service = new BlueprintPlanningService(new OfficialBlueprintModelExecutor(repositoryRoot));
const startedAt = new Date();
service.beginIdea(idea);
await service.waitForIdle();
let snapshot = service.getSnapshot();
const questions = snapshot.clarificationQuestions.map((question) => ({ topic: question.topic, prompt: question.prompt }));
if (snapshot.phase === "clarification") {
  const answers = Object.fromEntries(snapshot.clarificationQuestions.map((question) => [question.topic, answersByTopic[question.topic]]));
  service.submitAnswers(answers);
  await service.waitForIdle();
  snapshot = service.getSnapshot();
}
const afterProjects = await currentProjectDirectories();
if (snapshot.phase !== "review" || !snapshot.blueprint || !snapshot.validationPassed) {
  throw new Error(snapshot.error ?? `Real GPT-5.6 rehearsal ended in ${snapshot.phase}.`);
}
if (JSON.stringify(beforeProjects) !== JSON.stringify(afterProjects)) {
  throw new Error("The project-directory list changed during planning rehearsal.");
}

const evidence = {
  date: "2026-07-14",
  objective: "Real GPT-5.6 high-reasoning new-game blueprint rehearsal",
  inputIdea: idea,
  clarificationQuestions: questions,
  validatedBlueprintSummary: {
    projectName: snapshot.blueprint.projectName,
    vision: snapshot.blueprint.vision,
    foundation: snapshot.blueprint.foundation,
    inputMode: snapshot.blueprint.inputMode,
    coreAction: snapshot.blueprint.coreAction,
    funTarget: snapshot.blueprint.funTarget,
    smallestPlayableResult: snapshot.blueprint.smallestPlayableResult,
    firstPlayableMilestone: snapshot.blueprint.firstPlayableMilestone,
    questCount: snapshot.blueprint.quests.length,
    quests: snapshot.blueprint.quests.map((quest) => ({ title: quest.title, visibleOutcome: quest.visibleOutcome })),
  },
  provenance: {
    model: snapshot.provenance.model,
    reasoningEffort: snapshot.provenance.reasoningEffort,
    sandbox: snapshot.provenance.sandbox,
    network: snapshot.provenance.network,
    sanitizedThreadId: snapshot.provenance.threadId ? `${snapshot.provenance.threadId.slice(0, 12)}…` : null,
    attempts: snapshot.provenance.attempts,
    latencyMs: snapshot.provenance.latencyMs,
    usage: snapshot.provenance.usage,
  },
  validation: {
    result: "PASS",
    problems: snapshot.validationProblems,
  },
  sideEffects: {
    projectFilesWritten: snapshot.effects.projectFilesWritten,
    commandsRun: snapshot.effects.commandsRun,
    godotProcessesStarted: snapshot.effects.godotProcessesStarted,
    projectDirectoryListUnchanged: true,
    projectDirectoriesBefore: beforeProjects,
    projectDirectoriesAfter: afterProjects,
  },
  startedAt: startedAt.toISOString(),
  finishedAt: new Date().toISOString(),
};

await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`FORGE_BLUEPRINT_REHEARSAL_OK project=${snapshot.blueprint.projectName} quests=${snapshot.blueprint.quests.length} attempts=${snapshot.provenance.attempts} latency_ms=${snapshot.provenance.latencyMs ?? "unknown"}`);
console.log(`Evidence: ${evidencePath}`);
