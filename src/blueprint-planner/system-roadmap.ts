import { createHash } from "node:crypto";
import { z } from "zod";

import {
  acceptedSystemRoadmapSchema,
  systemRoadmapModelOutputSchema,
  systemRoadmapPlanningResultSchema,
  type AcceptedSystemRoadmap,
  type ProjectModel,
  type SystemRoadmapPlanningResult,
  type SystemRoadmapProposalSystem,
  type SystemRoadmapQuestion,
} from "../contracts/index.js";
import type { BlueprintProvenance, BlueprintUsage } from "./shared.js";
import type { BlueprintModelExecutor, BlueprintModelSession } from "./types.js";

export const activeSystemRoadmapWorkPhases = new Set([
  "contract_review", "approved", "implementing", "scope_review", "verifying", "waiting_for_playtest",
  "completion_pending", "failed", "interrupted",
]);

export type SystemRoadmapPlanningPhase =
  | "idle" | "planning" | "clarification" | "review" | "revising"
  | "accepting" | "accepted" | "failed" | "cancelled";

export interface SystemRoadmapPlanningSnapshot {
  phase: SystemRoadmapPlanningPhase;
  projectId: string | null;
  idea: string;
  answers: Array<{ questionId: string; answer: string }>;
  clarificationQuestions: SystemRoadmapQuestion[];
  proposal: SystemRoadmapProposalSystem[] | null;
  proposalFingerprint: string | null;
  sourceFingerprint: string | null;
  provenance: BlueprintProvenance;
  error: string | null;
  effects: { planningRecordsWritten: 0 | 1; gameFilesWritten: 0; commandsRun: 0 };
}

export type SystemRoadmapPlanningEvent = { type: "refresh" };
type Subscriber = (event: SystemRoadmapPlanningEvent) => void;

const outputSchema = z.toJSONSchema(systemRoadmapModelOutputSchema, { target: "draft-07", reused: "inline" });

function provenance(): BlueprintProvenance {
  return {
    model: "gpt-5.6", reasoningEffort: "high", sandbox: "read-only", network: "disabled",
    threadId: null, attempts: 0, latencyMs: null, usage: null,
  };
}

function blankSnapshot(): SystemRoadmapPlanningSnapshot {
  return {
    phase: "idle", projectId: null, idea: "", answers: [], clarificationQuestions: [],
    proposal: null, proposalFingerprint: null, sourceFingerprint: null,
    provenance: provenance(), error: null,
    effects: { planningRecordsWritten: 0, gameFilesWritten: 0, commandsRun: 0 },
  };
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

export function fingerprintSystemRoadmap(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function fingerprintProjectStructure(model: ProjectModel): string {
  return fingerprintSystemRoadmap({
    projectId: model.project.projectId,
    systems: model.systems.map((system) => ({ systemId: system.systemId, questIds: system.questIds })),
  });
}

export function hasActiveSystemRoadmapWork(model: ProjectModel): boolean {
  return model.workSessions.some((session) => activeSystemRoadmapWorkPhases.has(session.phase)
    || (session.phase === "cancelled" && (session.recovery.action === "rollback" || session.recovery.action === "manual")));
}

function proposalProblems(result: SystemRoadmapPlanningResult, model: ProjectModel, clarificationSpent: boolean): string[] {
  if (result.resultType === "clarification") {
    if (clarificationSpent) return ["The one clarification round is already complete; return a proposal."];
    const ids = result.clarificationQuestions.map((question) => question.questionId);
    return new Set(ids).size === ids.length ? [] : ["Clarification question IDs must be unique."];
  }
  const currentIds = model.systems.map((system) => system.systemId);
  const proposedExisting = result.systems.flatMap((system) => system.existingSystemId ? [system.existingSystemId] : []);
  if (new Set(proposedExisting).size !== proposedExisting.length) return ["An existing system may appear only once."];
  const unknown = proposedExisting.filter((id) => !currentIds.includes(id));
  if (unknown.length > 0) return [`Unknown existing system IDs: ${unknown.join(", ")}.`];
  const missing = currentIds.filter((id) => !proposedExisting.includes(id));
  if (missing.length > 0) return [`Every existing system must remain: ${missing.join(", ")}.`];
  const currentPopulatedOrder = model.systems.filter((system) => system.questIds.length > 0).map((system) => system.systemId);
  const proposedPopulatedOrder = result.systems.flatMap((system) => system.existingSystemId && currentPopulatedOrder.includes(system.existingSystemId) ? [system.existingSystemId] : []);
  if (currentPopulatedOrder.some((systemId, index) => proposedPopulatedOrder[index] !== systemId)) {
    return ["Existing systems that contain quests must keep their relative order."];
  }
  return [];
}

function modelSummary(model: ProjectModel): string {
  return JSON.stringify({
    project: { projectId: model.project.projectId, name: model.project.name, vision: model.project.vision },
    systems: model.systems.map((system) => ({
      systemId: system.systemId, title: system.title, outcome: system.outcome,
      quests: system.questIds.map((questId) => {
        const quest = model.quests.find((candidate) => candidate.questId === questId)!;
        return { questId, title: quest.title, outcome: quest.playerVisibleOutcome };
      }),
    })),
  });
}

function planningPrompt(model: ProjectModel, idea: string, answers: SystemRoadmapPlanningSnapshot["answers"], revision: string | null): string {
  return `You help a game creator organize one existing Forge-owned Godot project into broad systems.\n\nCREATOR IDEA\n${idea}\n\nCURRENT FORGE PLAN\n${modelSummary(model)}\n\n${answers.length ? `ANSWERS\n${JSON.stringify(answers)}\n` : ""}${revision ? `REVISION REQUEST\n${revision}\n` : ""}\nReturn strict JSON matching the supplied schema. Always include both lists. For clarification, return 1 to 3 clarificationQuestions and an empty systems list. For a proposal, return an empty clarificationQuestions list and 3 to 6 ordered broad systems. Ask clarification only if an answer materially changes the broad roadmap, and never after answers were supplied. Preserve every current system exactly once using its exact existingSystemId. Existing systems that contain quests must keep their relative order. Use null only for a genuinely new empty system. Keep titles and outcomes ordinary, concrete, and player-visible. Do not create quests. Do not mention or use supported game types, capabilities, starters, templates, verification profiles, tools, files, commands, or implementation details. A creator's idea is eligible because they chose it.`;
}

function repairPrompt(problems: string[]): string {
  return `Your last result was invalid. Return one complete corrected JSON result only. Fix these problems:\n- ${problems.join("\n- ")}`;
}

function messageFrom(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parsePlanningResult(text: string): { result: SystemRoadmapPlanningResult | null; problems: string[] } {
  try {
    const value = JSON.parse(text) as unknown;
    const direct = systemRoadmapPlanningResultSchema.safeParse(value);
    if (direct.success) return { result: direct.data, problems: [] };
    const envelope = systemRoadmapModelOutputSchema.safeParse(value);
    if (!envelope.success) {
      return { result: null, problems: direct.error.issues.map((issue) => `${issue.path.join(".") || "result"}: ${issue.message}`) };
    }
    if (envelope.data.resultType === "clarification" && envelope.data.systems.length > 0) {
      return { result: null, problems: ["systems: must be empty when clarification questions are returned"] };
    }
    if (envelope.data.resultType === "proposal" && envelope.data.clarificationQuestions.length > 0) {
      return { result: null, problems: ["clarificationQuestions: must be empty when systems are returned"] };
    }
    const candidate = envelope.data.resultType === "clarification"
      ? { resultType: "clarification" as const, clarificationQuestions: envelope.data.clarificationQuestions }
      : { resultType: "proposal" as const, systems: envelope.data.systems };
    const parsed = systemRoadmapPlanningResultSchema.safeParse(candidate);
    return parsed.success
      ? { result: parsed.data, problems: [] }
      : { result: null, problems: parsed.error.issues.map((issue) => `${issue.path.join(".") || "result"}: ${issue.message}`) };
  } catch {
    return { result: null, problems: ["The response was not valid JSON."] };
  }
}

function slugify(value: string): string {
  const slug = value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 56);
  return slug || "system";
}

function acceptedSystems(proposal: SystemRoadmapProposalSystem[], model: ProjectModel) {
  const used = new Set(model.systems.map((system) => system.systemId));
  return proposal.map((system) => {
    let systemId = system.existingSystemId;
    if (!systemId) {
      const base = `system-${slugify(system.title)}`;
      systemId = base;
      let suffix = 2;
      while (used.has(systemId)) systemId = `${base.slice(0, 58)}-${suffix++}`;
      used.add(systemId);
    }
    return {
      systemId,
      title: system.title,
      outcome: system.outcome,
      questIds: model.systems.find((current) => current.systemId === system.existingSystemId)?.questIds ?? [],
    };
  });
}

export class SystemRoadmapPlanningConflictError extends Error {
  constructor(message: string) { super(message); this.name = "SystemRoadmapPlanningConflictError"; }
}

export class SystemRoadmapPlanningService {
  private snapshot = blankSnapshot();
  private subscribers = new Set<Subscriber>();
  private session: BlueprintModelSession | null = null;
  private activeRun: Promise<void> | null = null;
  private abortController: AbortController | null = null;
  private sourceModel: ProjectModel | null = null;
  private clarificationSpent = false;
  private pendingRevision: string | null = null;
  private generation = 0;

  constructor(private readonly executor: BlueprintModelExecutor, private readonly now: () => number = () => Date.now()) {}

  getSnapshot(): SystemRoadmapPlanningSnapshot { return structuredClone(this.snapshot); }
  getSnapshotForProject(projectId: string): SystemRoadmapPlanningSnapshot {
    if (this.snapshot.projectId !== projectId && ["accepted", "cancelled"].includes(this.snapshot.phase)) return blankSnapshot();
    return this.getSnapshot();
  }
  subscribe(subscriber: Subscriber): () => void { this.subscribers.add(subscriber); return () => this.subscribers.delete(subscriber); }
  private emit(): void { for (const subscriber of this.subscribers) subscriber({ type: "refresh" }); }

  begin(model: ProjectModel, ideaValue: string): void {
    if (this.activeRun) throw new SystemRoadmapPlanningConflictError("System planning is already running.");
    if (hasActiveSystemRoadmapWork(model)) throw new SystemRoadmapPlanningConflictError("Finish or cancel the active work session before reshaping systems.");
    if (model.systems.length > 6) throw new SystemRoadmapPlanningConflictError("This alpha planner can reshape up to six systems.");
    const idea = ideaValue.trim();
    if (idea.length < 12 || idea.length > 1_500) throw new Error("Describe the game idea in 12 to 1,500 characters.");
    this.sourceModel = structuredClone(model);
    this.clarificationSpent = false;
    this.pendingRevision = null;
    this.session = this.executor.start();
    this.snapshot = { ...blankSnapshot(), phase: "planning", projectId: model.project.projectId, idea, sourceFingerprint: fingerprintProjectStructure(model) };
    this.startGeneration(null);
  }

  submitAnswers(values: Array<{ questionId: string; answer: string }>): void {
    if (this.activeRun) throw new SystemRoadmapPlanningConflictError("System planning is already running.");
    if (this.snapshot.phase !== "clarification" || !this.sourceModel || !this.session) throw new SystemRoadmapPlanningConflictError("There are no planning questions to answer.");
    const expected = this.snapshot.clarificationQuestions.map((question) => question.questionId);
    if (values.length !== expected.length || values.some((value, index) => value.questionId !== expected[index] || value.answer.trim().length < 1 || value.answer.trim().length > 240)) {
      throw new Error("Answer each shown question in order using 1 to 240 characters.");
    }
    this.clarificationSpent = true;
    this.snapshot = { ...this.snapshot, phase: "planning", answers: values.map((value) => ({ ...value, answer: value.answer.trim() })), clarificationQuestions: [], error: null };
    this.startGeneration(null);
  }

  revise(requestValue: string): void {
    if (this.activeRun) throw new SystemRoadmapPlanningConflictError("System planning is already running.");
    if (this.snapshot.phase !== "review" || !this.sourceModel || !this.session) throw new SystemRoadmapPlanningConflictError("There is no system roadmap to revise.");
    const request = requestValue.trim();
    if (request.length < 3 || request.length > 500) throw new Error("Describe the revision in 3 to 500 characters.");
    this.snapshot = { ...this.snapshot, phase: "revising", proposal: null, proposalFingerprint: null, error: null };
    this.pendingRevision = request;
    this.startGeneration(request);
  }

  retry(): void {
    if (this.activeRun) throw new SystemRoadmapPlanningConflictError("System planning is already running.");
    if (this.snapshot.phase !== "failed" || !this.sourceModel || !this.session) throw new SystemRoadmapPlanningConflictError("There is no failed planning step to retry.");
    this.snapshot = { ...this.snapshot, phase: "planning", error: null };
    this.startGeneration(this.pendingRevision);
  }

  cancel(decision: string): void {
    if (decision !== "CANCEL SYSTEM PLANNING") throw new Error("Use the exact cancel decision.");
    if (!["planning", "clarification", "review", "revising", "failed"].includes(this.snapshot.phase)) {
      throw new SystemRoadmapPlanningConflictError("System planning cannot be cancelled in its current state.");
    }
    this.generation += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.activeRun = null;
    this.session = null;
    this.sourceModel = null;
    this.pendingRevision = null;
    this.snapshot = { ...this.snapshot, phase: "cancelled", error: null };
    this.emit();
  }

  async accept(
    decision: string,
    fingerprint: string,
    currentModel: ProjectModel,
    persist: (roadmap: AcceptedSystemRoadmap) => Promise<void>,
  ): Promise<void> {
    if (this.activeRun) throw new SystemRoadmapPlanningConflictError("System planning is already running.");
    if (decision !== "ACCEPT SYSTEM ROADMAP") throw new Error("Use the exact accept decision.");
    if (this.snapshot.phase !== "review" || !this.snapshot.proposal || !this.snapshot.proposalFingerprint || !this.snapshot.sourceFingerprint) {
      throw new SystemRoadmapPlanningConflictError("There is no reviewed system roadmap to accept.");
    }
    if (fingerprint !== this.snapshot.proposalFingerprint) throw new SystemRoadmapPlanningConflictError("This system roadmap changed. Review the latest version before accepting.");
    if (currentModel.project.projectId !== this.snapshot.projectId || fingerprintProjectStructure(currentModel) !== this.snapshot.sourceFingerprint) {
      throw new SystemRoadmapPlanningConflictError("The project plan changed while this roadmap was open. Start again from the latest workspace.");
    }
    if (hasActiveSystemRoadmapWork(currentModel)) throw new SystemRoadmapPlanningConflictError("Finish or cancel the active work session before accepting systems.");
    const result: SystemRoadmapPlanningResult = { resultType: "proposal", systems: this.snapshot.proposal };
    const problems = proposalProblems(result, currentModel, true);
    if (problems.length) throw new SystemRoadmapPlanningConflictError(problems[0]!);
    const roadmap = acceptedSystemRoadmapSchema.parse({
      schemaVersion: 1, projectId: currentModel.project.projectId, creatorIdea: this.snapshot.idea,
      sourceFingerprint: this.snapshot.sourceFingerprint, proposalFingerprint: fingerprint,
      acceptedAt: new Date(this.now()).toISOString(), systems: acceptedSystems(this.snapshot.proposal, currentModel),
    });
    this.snapshot = { ...this.snapshot, phase: "accepting", error: null };
    this.emit();
    try {
      await persist(roadmap);
      this.snapshot = { ...this.snapshot, phase: "accepted", effects: { ...this.snapshot.effects, planningRecordsWritten: 1 } };
      this.emit();
    } catch (error) {
      this.snapshot = { ...this.snapshot, phase: "review", error: `Forge could not save this roadmap. ${messageFrom(error)}` };
      this.emit();
      throw error;
    }
  }

  async waitForIdle(): Promise<void> { await this.activeRun; }

  private startGeneration(revision: string | null): void {
    const generation = ++this.generation;
    this.abortController = new AbortController();
    this.activeRun = this.generate(generation, revision).finally(() => {
      if (this.generation === generation) this.activeRun = null;
    });
    this.emit();
  }

  private async generate(generation: number, revision: string | null): Promise<void> {
    if (!this.sourceModel || !this.session) return;
    const started = this.now();
    try {
      let turn = await this.session.run(planningPrompt(this.sourceModel, this.snapshot.idea, this.snapshot.answers, revision), outputSchema, this.abortController?.signal);
      let attempts = 1;
      let parsed = parsePlanningResult(turn.finalResponse);
      let problems = parsed.result ? proposalProblems(parsed.result, this.sourceModel, this.clarificationSpent) : parsed.problems;
      let usage = turn.usage;
      if (!parsed.result || problems.length) {
        const repaired = await this.session.run(repairPrompt(problems), outputSchema, this.abortController?.signal);
        attempts += 1;
        usage = combineUsage(usage, repaired.usage);
        turn = repaired;
        parsed = parsePlanningResult(repaired.finalResponse);
        problems = parsed.result ? proposalProblems(parsed.result, this.sourceModel, this.clarificationSpent) : parsed.problems;
      }
      if (!parsed.result || problems.length) throw new Error(problems[0] ?? "Forge could not understand the planning result.");
      if (generation !== this.generation) return;
      const result = parsed.result;
      this.snapshot = {
        ...this.snapshot,
        phase: result.resultType === "clarification" ? "clarification" : "review",
        clarificationQuestions: result.resultType === "clarification" ? result.clarificationQuestions : [],
        proposal: result.resultType === "proposal" ? result.systems : null,
        proposalFingerprint: result.resultType === "proposal" ? fingerprintSystemRoadmap(result.systems) : null,
        provenance: {
          ...this.snapshot.provenance, threadId: turn.threadId, attempts: this.snapshot.provenance.attempts + attempts,
          latencyMs: this.now() - started, usage: combineUsage(this.snapshot.provenance.usage, usage),
        },
        error: null,
      };
      this.pendingRevision = null;
      this.emit();
    } catch (error) {
      if (generation !== this.generation) return;
      this.snapshot = { ...this.snapshot, phase: "failed", error: `Forge could not shape the roadmap. ${messageFrom(error)}` };
      this.emit();
    }
  }
}
