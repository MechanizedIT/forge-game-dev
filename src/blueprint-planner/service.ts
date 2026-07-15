import { createHash } from "node:crypto";
import { z } from "zod";

import {
  clarificationTopics,
  gameBlueprintPlanningResultSchema,
  type ClarificationTopic,
  type GameBlueprintPlanningResult,
  type CreatorRevisionEvent,
} from "../contracts/index.js";
import { buildBlueprintPrompt, buildRepairPrompt } from "./prompt.js";
import {
  blueprintPlanningStages,
  type BlueprintPlanningEvent,
  type BlueprintPlanningSnapshot,
  type BlueprintPlanningStage,
  type BlueprintUsage,
} from "./shared.js";
import type { BlueprintModelExecutor, BlueprintModelSession, BlueprintModelTurn } from "./types.js";
import type { ApprovedBlueprintEnvelope } from "../project-creation/shared.js";
import {
  acceptRoadmap,
  buildBlueprintProposal,
  createSignalSweepRoadmap,
  reviseAcceptedRoadmap,
  type RoadmapEdit,
} from "./starter-catalog.js";

type Subscriber = (event: BlueprintPlanningEvent) => void;

const planningOutputSchema = z.toJSONSchema(gameBlueprintPlanningResultSchema, {
  target: "draft-07",
  reused: "inline",
});

function blankSnapshot(): BlueprintPlanningSnapshot {
  return {
    phase: "intake",
    idea: "",
    answers: {},
    stage: null,
    completedStages: [],
    clarificationQuestions: [],
    blueprint: null,
    proposal: null,
    acceptedRoadmap: null,
    revisionEvents: [],
    provenance: {
      model: "gpt-5.6",
      reasoningEffort: "high",
      sandbox: "read-only",
      network: "disabled",
      threadId: null,
      attempts: 0,
      latencyMs: null,
      usage: null,
    },
    validationPassed: false,
    validationProblems: [],
    error: null,
    approval: null,
    effects: { projectFilesWritten: 0, commandsRun: 0, godotProcessesStarted: 0 },
  };
}

export function fingerprintBlueprint(blueprint: unknown): string {
  return createHash("sha256").update(JSON.stringify(blueprint), "utf8").digest("hex");
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function validationProblems(error: z.ZodError): string[] {
  return error.issues.slice(0, 12).map((issue) => {
    const location = issue.path.length > 0 ? issue.path.join(".") : "result";
    return `${location}: ${issue.message}`;
  });
}

function combineUsage(current: BlueprintUsage | null, next: BlueprintUsage | null): BlueprintUsage | null {
  if (!current) return next;
  if (!next) return current;
  return {
    inputTokens: current.inputTokens + next.inputTokens,
    cachedInputTokens: current.cachedInputTokens + next.cachedInputTokens,
    outputTokens: current.outputTokens + next.outputTokens,
    reasoningOutputTokens: current.reasoningOutputTokens + next.reasoningOutputTokens,
  };
}

function answeredTopicsFromIdea(idea: string): Set<ClarificationTopic> {
  const normalized = idea.toLowerCase();
  const topics = new Set<ClarificationTopic>();
  if (/top[- ]down|platformer|arena|movement game|shooter|puzzle/u.test(normalized)) topics.add("game_style");
  if (/push|jump|collect|dash|shoot|dodge|move|attack|pull|throw/u.test(normalized)) topics.add("core_action");
  if (/feel|fun|satisfying|tense|fast|precise|chaotic|relaxing|rhythm/u.test(normalized)) topics.add("fun_target");
  if (/keyboard|controller|gamepad|wasd|arrow keys/u.test(normalized)) topics.add("input_mode");
  if (/smallest playable|first playable|player can|win when|playable result/u.test(normalized)) topics.add("smallest_playable_result");
  return topics;
}

function clarificationProblems(
  result: GameBlueprintPlanningResult,
  idea: string,
  answers: Partial<Record<ClarificationTopic, string>>,
): string[] {
  if (result.resultType !== "clarification") return [];
  if (Object.keys(answers).length > 0) return ["Clarification is already complete; return a full blueprint."];
  const answered = answeredTopicsFromIdea(idea);
  const seen = new Set<ClarificationTopic>();
  const problems: string[] = [];
  result.clarificationQuestions.forEach((question, index) => {
    if (seen.has(question.topic)) problems.push(`clarificationQuestions.${index}: duplicate topic ${question.topic}`);
    if (answered.has(question.topic)) problems.push(`clarificationQuestions.${index}: ${question.topic} is already answered by the idea`);
    seen.add(question.topic);
  });
  return problems;
}

export class BlueprintPlanningConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BlueprintPlanningConflictError";
  }
}

export class BlueprintPlanningService {
  private snapshot = blankSnapshot();
  private subscribers = new Set<Subscriber>();
  private activeRun: Promise<void> | null = null;
  private session: BlueprintModelSession | null = null;
  private abortController: AbortController | null = null;
  private generation = 0;
  private originalIdea: string | null = null;
  private pendingInterpretationRevision: { priorFingerprint: string; target: string } | null = null;

  constructor(
    private readonly executor: BlueprintModelExecutor,
    private readonly now: () => number = () => Date.now(),
  ) {}

  getSnapshot(): BlueprintPlanningSnapshot {
    return structuredClone(this.snapshot);
  }

  subscribe(subscriber: Subscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  private emit(): void {
    for (const subscriber of this.subscribers) subscriber({ type: "refresh" });
  }

  private setStage(stage: BlueprintPlanningStage): void {
    const position = blueprintPlanningStages.indexOf(stage);
    this.snapshot.stage = stage;
    this.snapshot.completedStages = blueprintPlanningStages.slice(0, position);
    this.emit();
  }

  beginIdea(ideaValue: string): void {
    if (this.activeRun) throw new BlueprintPlanningConflictError("Blueprint planning is already running.");
    const idea = ideaValue.trim();
    if (idea.length < 12 || idea.length > 1_500) throw new Error("Describe the game idea in 12 to 1,500 characters.");
    this.generation += 1;
    const generation = this.generation;
    if (!this.originalIdea) this.originalIdea = idea;
    this.snapshot = { ...blankSnapshot(), phase: "planning", idea, revisionEvents: [...this.snapshot.revisionEvents] };
    this.session = this.executor.start();
    this.abortController = new AbortController();
    this.activeRun = this.generate(generation).finally(() => {
      if (this.generation === generation) this.activeRun = null;
    });
    this.emit();
  }

  submitAnswers(answersValue: Partial<Record<ClarificationTopic, string>>): void {
    if (this.activeRun) throw new BlueprintPlanningConflictError("Blueprint planning is already running.");
    if (this.snapshot.phase !== "clarification" || !this.session) throw new BlueprintPlanningConflictError("There is no clarification screen to submit.");
    const allowedTopics = new Set(this.snapshot.clarificationQuestions.map((question) => question.topic));
    const answers: Partial<Record<ClarificationTopic, string>> = {};
    for (const topic of clarificationTopics) {
      const answer = answersValue[topic]?.trim();
      if (allowedTopics.has(topic) && (!answer || answer.length > 240)) throw new Error(`Provide a focused answer for ${topic}.`);
      if (answer && allowedTopics.has(topic)) answers[topic] = answer;
    }
    this.snapshot = {
      ...this.snapshot,
      phase: "planning",
      answers,
      stage: null,
      completedStages: [],
      clarificationQuestions: [],
      validationProblems: [],
      error: null,
    };
    this.generation += 1;
    const generation = this.generation;
    this.abortController = new AbortController();
    this.activeRun = this.generate(generation).finally(() => {
      if (this.generation === generation) this.activeRun = null;
    });
    this.emit();
  }

  reviseIdea(): void {
    if (this.activeRun) throw new BlueprintPlanningConflictError("Wait for planning to stop before revising the idea.");
    const idea = this.snapshot.idea;
    if (this.snapshot.revisionEvents.length >= 3) throw new BlueprintPlanningConflictError("The three permitted pre-creation revisions have already been used.");
    this.pendingInterpretationRevision = {
      priorFingerprint: fingerprintBlueprint(this.snapshot.proposal ?? { idea }),
      target: "supported interpretation",
    };
    this.snapshot = { ...blankSnapshot(), idea, revisionEvents: [...this.snapshot.revisionEvents] };
    this.session = null;
    this.emit();
  }

  cancel(): void {
    this.generation += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.activeRun = null;
    this.session = null;
    this.originalIdea = null;
    this.pendingInterpretationRevision = null;
    this.snapshot = { ...blankSnapshot(), phase: "cancelled" };
    this.emit();
  }

  approveBlueprint(): void {
    if (this.snapshot.phase !== "review" || !this.snapshot.blueprint || !this.snapshot.proposal || !this.snapshot.validationPassed) {
      throw new BlueprintPlanningConflictError("Only a validated blueprint can be approved.");
    }
    const blueprintSha256 = fingerprintBlueprint(this.snapshot.blueprint);
    const approvedAt = new Date(this.now()).toISOString();
    const acceptedRoadmap = createSignalSweepRoadmap(blueprintSha256, this.snapshot.blueprint, this.snapshot.revisionEvents);
    this.snapshot = {
      ...this.snapshot,
      phase: "roadmap_review",
      acceptedRoadmap,
      approval: {
        blueprintSha256,
        approvedAt,
        roadmapFingerprint: null,
      },
    };
    this.emit();
  }

  reviseRoadmap(edit: RoadmapEdit): void {
    if (this.snapshot.phase !== "roadmap_review" || !this.snapshot.acceptedRoadmap) throw new BlueprintPlanningConflictError("There is no starter-aware roadmap to revise.");
    const acceptedRoadmap = reviseAcceptedRoadmap(this.snapshot.acceptedRoadmap, edit, new Date(this.now()).toISOString());
    this.snapshot = {
      ...this.snapshot,
      acceptedRoadmap,
      revisionEvents: acceptedRoadmap.revisionEvents,
      validationProblems: [],
    };
    this.emit();
  }

  acceptRoadmap(expectedFingerprint: string): void {
    if (this.snapshot.phase !== "roadmap_review" || !this.snapshot.acceptedRoadmap || !this.snapshot.approval) throw new BlueprintPlanningConflictError("There is no starter-aware roadmap to accept.");
    const acceptedRoadmap = acceptRoadmap(this.snapshot.acceptedRoadmap, expectedFingerprint, new Date(this.now()).toISOString());
    this.snapshot = {
      ...this.snapshot,
      phase: "ready",
      acceptedRoadmap,
      approval: { ...this.snapshot.approval, roadmapFingerprint: acceptedRoadmap.fingerprint },
    };
    this.emit();
  }

  getApprovedBlueprint(): ApprovedBlueprintEnvelope | null {
    if (this.snapshot.phase !== "ready" || !this.snapshot.blueprint || !this.snapshot.proposal || !this.snapshot.acceptedRoadmap || !this.snapshot.approval?.roadmapFingerprint) return null;
    return structuredClone({
      blueprint: this.snapshot.blueprint,
      proposal: this.snapshot.proposal,
      acceptedRoadmap: this.snapshot.acceptedRoadmap,
      blueprintSha256: this.snapshot.approval.blueprintSha256,
      acceptedRoadmapSha256: this.snapshot.approval.roadmapFingerprint,
      approvedAt: this.snapshot.approval.approvedAt,
      provenance: this.snapshot.provenance,
    });
  }

  async waitForIdle(): Promise<void> {
    await this.activeRun;
  }

  private async runTurn(prompt: string): Promise<BlueprintModelTurn> {
    if (!this.session) throw new Error("The GPT planning session is unavailable.");
    const turn = await this.session.run(prompt, planningOutputSchema, this.abortController?.signal);
    this.snapshot.provenance.threadId = turn.threadId;
    this.snapshot.provenance.attempts += 1;
    this.snapshot.provenance.usage = combineUsage(this.snapshot.provenance.usage, turn.usage);
    return turn;
  }

  private parseTurn(turn: BlueprintModelTurn): { result: GameBlueprintPlanningResult | null; problems: string[] } {
    let parsed: unknown;
    try {
      parsed = JSON.parse(turn.finalResponse) as unknown;
    } catch {
      return { result: null, problems: ["result: GPT returned invalid JSON"] };
    }
    const validated = gameBlueprintPlanningResultSchema.safeParse(parsed);
    if (!validated.success) return { result: null, problems: validationProblems(validated.error) };
    const focusedProblems = clarificationProblems(validated.data, this.snapshot.idea, this.snapshot.answers);
    return focusedProblems.length > 0
      ? { result: null, problems: focusedProblems }
      : { result: validated.data, problems: [] };
  }

  private async generate(generation: number): Promise<void> {
    const startedAt = this.now();
    try {
      this.setStage("Understanding your idea");
      let turn = await this.runTurn(buildBlueprintPrompt(this.snapshot.idea, this.snapshot.answers));
      if (generation !== this.generation) return;
      this.setStage("Defining the playable core");
      let parsed = this.parseTurn(turn);
      if (!parsed.result) {
        this.snapshot.validationProblems = parsed.problems;
        turn = await this.runTurn(buildRepairPrompt(this.snapshot.idea, this.snapshot.answers, parsed.problems));
        if (generation !== this.generation) return;
        parsed = this.parseTurn(turn);
      }
      if (!parsed.result) {
        this.snapshot = {
          ...this.snapshot,
          phase: "failed",
          stage: null,
          completedStages: [],
          blueprint: null,
          clarificationQuestions: [],
          validationPassed: false,
          validationProblems: parsed.problems,
          error: "Forge could not validate a safe game blueprint after one repair attempt. Your sample game is still available.",
        };
        return;
      }

      this.setStage("Building the roadmap");
      if (parsed.result.resultType === "clarification") {
        this.snapshot = {
          ...this.snapshot,
          phase: "clarification",
          stage: null,
          completedStages: [],
          clarificationQuestions: parsed.result.clarificationQuestions,
          validationProblems: [],
        };
        return;
      }

      this.setStage("Preparing the blueprint");
      if (!parsed.result.blueprint) throw new Error("The validated planning result did not contain a blueprint.");
      const proposal = buildBlueprintProposal(this.originalIdea ?? this.snapshot.idea, parsed.result.blueprint);
      let revisionEvents = this.snapshot.revisionEvents;
      if (this.pendingInterpretationRevision) {
        const event: CreatorRevisionEvent = {
          kind: "interpretation_revised",
          target: this.pendingInterpretationRevision.target,
          priorFingerprint: this.pendingInterpretationRevision.priorFingerprint,
          newFingerprint: fingerprintBlueprint(proposal),
          occurredAt: new Date(this.now()).toISOString(),
          actor: "creator",
        };
        revisionEvents = [...revisionEvents, event];
        this.pendingInterpretationRevision = null;
      }
      this.snapshot = {
        ...this.snapshot,
        phase: "review",
        stage: null,
        completedStages: [...blueprintPlanningStages],
        blueprint: parsed.result.blueprint,
        proposal,
        acceptedRoadmap: null,
        revisionEvents,
        clarificationQuestions: [],
        validationPassed: true,
        validationProblems: [],
      };
    } catch (error) {
      if (generation !== this.generation) return;
      this.snapshot = {
        ...this.snapshot,
        phase: "failed",
        stage: null,
        completedStages: [],
        blueprint: null,
        clarificationQuestions: [],
        validationPassed: false,
        validationProblems: [],
        error: `Forge stopped blueprint planning safely: ${messageFrom(error)}`,
      };
    } finally {
      if (generation === this.generation) {
        this.snapshot.provenance.latencyMs = Math.max(0, this.now() - startedAt);
        this.emit();
      }
    }
  }
}
