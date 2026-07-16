import { createHash } from "node:crypto";
import { z } from "zod";

import {
  acceptedSystemQuestBatchSchema,
  systemQuestModelOutputSchema,
  systemQuestPlanningResultSchema,
  type AcceptedSystemQuestBatch,
  type AcceptedSystemQuestPlan,
  type ProjectModel,
  type SystemQuestPlanningResult,
  type SystemQuestProposalItem,
  type SystemQuestQuestion,
} from "../contracts/index.js";
import { hasActiveSystemRoadmapWork } from "./system-roadmap.js";
import type { BlueprintProvenance, BlueprintUsage } from "./shared.js";
import type { BlueprintModelExecutor, BlueprintModelSession } from "./types.js";
import type { ArchitectureContextPackage, ArchitectureWarning } from "../project-architecture/service.js";

export type SystemQuestPlanningPhase =
  | "idle" | "planning" | "clarification" | "review" | "revising" | "accepting_quests"
  | "quests_accepted" | "choosing_files" | "work_order_review" | "accepting_work_order"
  | "ready" | "failed" | "cancelled";

export interface SystemQuestWorkOrderDraft {
  questId: string;
  existingFiles: string[];
  newFiles: string[];
  fingerprint: string;
  architectureContext?: ArchitectureContextPackage;
  architectureWarnings?: ArchitectureWarning[];
}

export interface SystemQuestPlanningSnapshot {
  phase: SystemQuestPlanningPhase;
  projectId: string | null;
  systemId: string | null;
  description: string;
  answers: Array<{ questionId: string; answer: string }>;
  clarificationQuestions: SystemQuestQuestion[];
  proposal: SystemQuestProposalItem[] | null;
  proposalFingerprint: string | null;
  sourceFingerprint: string | null;
  firstQuestId: string | null;
  workOrder: SystemQuestWorkOrderDraft | null;
  provenance: BlueprintProvenance;
  error: string | null;
  effects: { planningRecordsWritten: 0 | 1 | 2; gameFilesWritten: 0; commandsRun: 0 };
}

export type SystemQuestPlanningEvent = { type: "refresh" };
type Subscriber = (event: SystemQuestPlanningEvent) => void;

const outputSchema = z.toJSONSchema(systemQuestModelOutputSchema, { target: "draft-07", reused: "inline" });

function blankProvenance(): BlueprintProvenance {
  return { model: "gpt-5.6", reasoningEffort: "high", sandbox: "read-only", network: "disabled", threadId: null, attempts: 0, latencyMs: null, usage: null };
}

function blankSnapshot(): SystemQuestPlanningSnapshot {
  return {
    phase: "idle", projectId: null, systemId: null, description: "", answers: [], clarificationQuestions: [],
    proposal: null, proposalFingerprint: null, sourceFingerprint: null, firstQuestId: null, workOrder: null,
    provenance: blankProvenance(), error: null, effects: { planningRecordsWritten: 0, gameFilesWritten: 0, commandsRun: 0 },
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

export function fingerprintSystemQuestValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");
}

export function fingerprintSystemQuestStructure(model: ProjectModel, systemId: string): string {
  const selectedSystem = model.systems.find((system) => system.systemId === systemId);
  return fingerprintSystemQuestValue({
    projectId: model.project.projectId,
    systems: model.systems.map((system) => ({ systemId: system.systemId, questIds: system.questIds })),
    selectedSystem: selectedSystem ? {
      systemId: selectedSystem.systemId,
      title: selectedSystem.title,
      outcome: selectedSystem.outcome,
      quests: selectedSystem.questIds.map((questId) => {
        const quest = model.quests.find((candidate) => candidate.questId === questId)!;
        return { questId, title: quest.title, playerVisibleOutcome: quest.playerVisibleOutcome };
      }),
    } : { systemId },
  });
}

function slugify(value: string): string {
  const slug = value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return slug || "quest";
}

function proposalProblems(result: SystemQuestPlanningResult, remaining: number, clarificationSpent: boolean): string[] {
  if (result.resultType === "clarification") {
    if (clarificationSpent) return ["The one clarification round is already complete; return quests."];
    const ids = result.clarificationQuestions.map((question) => question.questionId);
    return new Set(ids).size === ids.length ? [] : ["Clarification question IDs must be unique."];
  }
  if (result.quests.length > Math.min(4, remaining)) return [`Return no more than ${Math.min(4, remaining)} new quests.`];
  const titles = result.quests.map((quest) => quest.title.toLowerCase());
  if (new Set(titles).size !== titles.length) return ["Quest titles must be distinct."];
  for (let index = 0; index < result.quests.length; index += 1) {
    const dependencies = result.quests[index]!.dependencyIndexes;
    if (new Set(dependencies).size !== dependencies.length || dependencies.some((dependency) => dependency >= index)) {
      return ["Quest dependencies must point only to earlier proposed quests."];
    }
  }
  return [];
}

function modelSummary(model: ProjectModel, systemId: string): string {
  const system = model.systems.find((candidate) => candidate.systemId === systemId)!;
  return JSON.stringify({
    system: { systemId, title: system.title, outcome: system.outcome },
    existingQuests: system.questIds.map((questId) => {
      const quest = model.quests.find((candidate) => candidate.questId === questId)!;
      return { questId, title: quest.title, playerVisibleOutcome: quest.playerVisibleOutcome };
    }),
  });
}

function planningPrompt(model: ProjectModel, systemId: string, description: string, answers: SystemQuestPlanningSnapshot["answers"], revision: string | null, remaining: number): string {
  return `You help a game creator turn one broad game system into a few small quests.\n\nSELECTED SYSTEM\n${modelSummary(model, systemId)}\n\nCREATOR DESCRIPTION\n${description}\n\n${answers.length ? `ANSWERS\n${JSON.stringify(answers)}\n\n` : ""}${revision ? `REVISION REQUEST\n${revision}\n\n` : ""}Return strict JSON matching the supplied schema. Always include both lists. For clarification, return 1 to 3 clarificationQuestions and an empty quests list. For a proposal, return an empty clarificationQuestions list and 1 to ${Math.min(4, remaining)} ordered new quests. Ask clarification only when an answer materially changes the quest list, and never after answers were supplied. Each quest needs a player-visible outcome, why it matters, one to four plain done-when checks, explicit excluded scope, and dependencyIndexes pointing only to earlier proposed quests. Do not repeat an existing quest. Do not mention files, tools, commands, game types, capabilities, starters, templates, profiles, or verifiers. Forge planning records only; no game file changes.`;
}

function parseResult(text: string): { result: SystemQuestPlanningResult | null; problems: string[] } {
  try {
    const value = JSON.parse(text) as unknown;
    const direct = systemQuestPlanningResultSchema.safeParse(value);
    if (direct.success) return { result: direct.data, problems: [] };
    const envelope = systemQuestModelOutputSchema.safeParse(value);
    if (!envelope.success) return { result: null, problems: direct.error.issues.map((issue) => `${issue.path.join(".") || "result"}: ${issue.message}`) };
    if (envelope.data.resultType === "clarification" && envelope.data.quests.length > 0) {
      return { result: null, problems: ["quests: must be empty when clarification questions are returned"] };
    }
    if (envelope.data.resultType === "proposal" && envelope.data.clarificationQuestions.length > 0) {
      return { result: null, problems: ["clarificationQuestions: must be empty when quests are returned"] };
    }
    const candidate = envelope.data.resultType === "clarification"
      ? { resultType: "clarification" as const, clarificationQuestions: envelope.data.clarificationQuestions }
      : { resultType: "proposal" as const, quests: envelope.data.quests };
    const parsed = systemQuestPlanningResultSchema.safeParse(candidate);
    return parsed.success ? { result: parsed.data, problems: [] } : { result: null, problems: parsed.error.issues.map((issue) => `${issue.path.join(".") || "result"}: ${issue.message}`) };
  } catch { return { result: null, problems: ["The response was not valid JSON."] }; }
}

function messageFrom(error: unknown): string { return error instanceof Error ? error.message : String(error); }

export class SystemQuestPlanningConflictError extends Error {
  constructor(message: string) { super(message); this.name = "SystemQuestPlanningConflictError"; }
}

export class SystemQuestPlanningService {
  private snapshot = blankSnapshot();
  private subscribers = new Set<Subscriber>();
  private session: BlueprintModelSession | null = null;
  private sourceModel: ProjectModel | null = null;
  private activeRun: Promise<void> | null = null;
  private abortController: AbortController | null = null;
  private clarificationSpent = false;
  private pendingRevision: string | null = null;
  private remaining = 0;
  private generation = 0;

  constructor(private readonly executor: BlueprintModelExecutor, private readonly now: () => number = () => Date.now()) {}

  getSnapshot(): SystemQuestPlanningSnapshot { return structuredClone(this.snapshot); }

  getSnapshotFor(projectId: string, systemId: string, persisted: AcceptedSystemQuestPlan | null, targetQuestId?: string): SystemQuestPlanningSnapshot {
    if (this.snapshot.projectId === projectId && this.snapshot.systemId === systemId && (!targetQuestId || this.snapshot.firstQuestId === targetQuestId) && !["idle", "cancelled"].includes(this.snapshot.phase)) return this.getSnapshot();
    const saved = persisted?.systems.find((system) => system.systemId === systemId) ?? null;
    if (!saved) return { ...blankSnapshot(), projectId, systemId };
    const first = targetQuestId ? saved.quests.find((quest) => quest.questId === targetQuestId) : saved.quests.find((quest) => !quest.workOrder) ?? saved.quests[0];
    if (!first) throw new SystemQuestPlanningConflictError("Choose a saved quest from this system.");
    return {
      ...blankSnapshot(), phase: first.workOrder ? "ready" : "quests_accepted", projectId, systemId,
      description: saved.creatorDescription, sourceFingerprint: saved.sourceFingerprint,
      proposalFingerprint: saved.proposalFingerprint, firstQuestId: first.questId,
      workOrder: first.workOrder ? { questId: first.questId, existingFiles: first.workOrder.existingFiles, newFiles: first.workOrder.newFiles, fingerprint: first.workOrder.fingerprint } : null,
      effects: { planningRecordsWritten: first.workOrder ? 2 : 1, gameFilesWritten: 0, commandsRun: 0 },
    };
  }

  restorePersisted(projectId: string, systemId: string, persisted: AcceptedSystemQuestPlan | null, targetQuestId?: string): void {
    const saved = persisted?.systems.find((system) => system.systemId === systemId);
    if (!saved) throw new SystemQuestPlanningConflictError("Accept quests before reviewing a work order.");
    const first = targetQuestId ? saved.quests.find((quest) => quest.questId === targetQuestId) : saved.quests.find((quest) => !quest.workOrder) ?? saved.quests[0];
    if (!first) throw new SystemQuestPlanningConflictError("Choose a saved quest from this system.");
    if (this.snapshot.projectId === projectId && this.snapshot.systemId === systemId && this.snapshot.firstQuestId === first.questId && !["idle", "cancelled"].includes(this.snapshot.phase)) return;
    this.snapshot = {
      ...blankSnapshot(), phase: first.workOrder ? "ready" : "quests_accepted", projectId, systemId,
      description: saved.creatorDescription, sourceFingerprint: saved.sourceFingerprint,
      proposalFingerprint: saved.proposalFingerprint, firstQuestId: first.questId,
      workOrder: first.workOrder ? { questId: first.questId, existingFiles: first.workOrder.existingFiles, newFiles: first.workOrder.newFiles, fingerprint: first.workOrder.fingerprint } : null,
      effects: { planningRecordsWritten: first.workOrder ? 2 : 1, gameFilesWritten: 0, commandsRun: 0 },
    };
    this.emit();
  }

  subscribe(subscriber: Subscriber): () => void { this.subscribers.add(subscriber); return () => this.subscribers.delete(subscriber); }
  private emit(): void { for (const subscriber of this.subscribers) subscriber({ type: "refresh" }); }

  begin(model: ProjectModel, systemId: string, descriptionValue: string): void {
    if (this.activeRun) throw new SystemQuestPlanningConflictError("Quest planning is already running.");
    const system = model.systems.find((candidate) => candidate.systemId === systemId);
    if (!system) throw new SystemQuestPlanningConflictError("Choose a system from the current project roadmap.");
    if (hasActiveSystemRoadmapWork(model)) throw new SystemQuestPlanningConflictError("Finish or safely close the active work session before refining quests.");
    const description = descriptionValue.trim();
    if (description.length < 12 || description.length > 1_500) throw new Error("Describe the system in 12 to 1,500 characters.");
    this.sourceModel = structuredClone(model);
    this.remaining = 4;
    this.clarificationSpent = false;
    this.pendingRevision = null;
    this.session = this.executor.start();
    this.snapshot = { ...blankSnapshot(), phase: "planning", projectId: model.project.projectId, systemId, description, sourceFingerprint: fingerprintSystemQuestStructure(model, systemId) };
    this.startGeneration(null);
  }

  submitAnswers(values: Array<{ questionId: string; answer: string }>): void {
    if (this.activeRun) throw new SystemQuestPlanningConflictError("Quest planning is already running.");
    if (this.snapshot.phase !== "clarification" || !this.sourceModel || !this.session) throw new SystemQuestPlanningConflictError("There are no quest questions to answer.");
    const expected = this.snapshot.clarificationQuestions.map((question) => question.questionId);
    if (values.length !== expected.length || values.some((value, index) => value.questionId !== expected[index] || value.answer.trim().length < 1 || value.answer.trim().length > 240)) throw new Error("Answer each shown question in order using 1 to 240 characters.");
    this.clarificationSpent = true;
    this.snapshot = { ...this.snapshot, phase: "planning", answers: values.map((value) => ({ ...value, answer: value.answer.trim() })), clarificationQuestions: [], error: null };
    this.startGeneration(null);
  }

  revise(requestValue: string): void {
    if (this.activeRun) throw new SystemQuestPlanningConflictError("Quest planning is already running.");
    if (this.snapshot.phase !== "review" || !this.sourceModel || !this.session) throw new SystemQuestPlanningConflictError("There is no quest proposal to revise.");
    const request = requestValue.trim();
    if (request.length < 3 || request.length > 500) throw new Error("Describe the revision in 3 to 500 characters.");
    this.pendingRevision = request;
    this.snapshot = { ...this.snapshot, phase: "revising", proposal: null, proposalFingerprint: null, error: null };
    this.startGeneration(request);
  }

  retry(): void {
    if (this.activeRun) throw new SystemQuestPlanningConflictError("Quest planning is already running.");
    if (this.snapshot.phase !== "failed" || !this.sourceModel || !this.session) throw new SystemQuestPlanningConflictError("There is no failed quest-planning step to retry.");
    this.snapshot = { ...this.snapshot, phase: "planning", error: null };
    this.startGeneration(this.pendingRevision);
  }

  cancel(decision: string, persisted: AcceptedSystemQuestPlan | null): void {
    if (decision !== "CANCEL QUEST PLANNING") throw new Error("Use the exact cancel decision.");
    if (["accepting_quests", "accepting_work_order", "ready"].includes(this.snapshot.phase)) throw new SystemQuestPlanningConflictError("Quest planning cannot be cancelled during or after this save.");
    this.generation += 1;
    this.abortController?.abort();
    this.abortController = null;
    this.activeRun = null;
    this.session = null;
    this.sourceModel = null;
    this.pendingRevision = null;
    const saved = persisted?.systems.find((system) => system.systemId === this.snapshot.systemId) ?? null;
    this.snapshot = {
      ...blankSnapshot(),
      phase: "cancelled",
      projectId: this.snapshot.projectId,
      systemId: this.snapshot.systemId,
      description: saved?.creatorDescription ?? this.snapshot.description,
    };
    this.emit();
  }

  async acceptQuests(decision: string, fingerprint: string, currentModel: ProjectModel, persisted: AcceptedSystemQuestPlan | null, persist: (batch: AcceptedSystemQuestBatch) => Promise<AcceptedSystemQuestPlan>): Promise<void> {
    if (this.activeRun) throw new SystemQuestPlanningConflictError("Quest planning is already running.");
    if (decision !== "ACCEPT SYSTEM QUESTS") throw new Error("Use the exact quest acceptance decision.");
    if (this.snapshot.phase !== "review" || !this.snapshot.proposal || !this.snapshot.proposalFingerprint || !this.snapshot.sourceFingerprint || !this.snapshot.systemId) throw new SystemQuestPlanningConflictError("There is no reviewed quest proposal to accept.");
    if (fingerprint !== this.snapshot.proposalFingerprint) throw new SystemQuestPlanningConflictError("This quest proposal changed. Review the latest version before accepting.");
    if (currentModel.project.projectId !== this.snapshot.projectId || fingerprintSystemQuestStructure(currentModel, this.snapshot.systemId) !== this.snapshot.sourceFingerprint) throw new SystemQuestPlanningConflictError("The project plan changed while these quests were open. Start again from the latest workspace.");
    if (hasActiveSystemRoadmapWork(currentModel)) throw new SystemQuestPlanningConflictError("Finish or safely close the active work session before accepting quests.");
    const currentSystem = currentModel.systems.find((system) => system.systemId === this.snapshot.systemId)!;
    const problems = proposalProblems({ resultType: "proposal", quests: this.snapshot.proposal }, 4, true);
    if (problems.length) throw new SystemQuestPlanningConflictError(problems[0]!);
    const existingNative = new Set(persisted?.systems.flatMap((system) => system.quests.map((quest) => quest.questId)) ?? []);
    const used = new Set(currentModel.quests.map((quest) => quest.questId));
    const assigned: string[] = [];
    for (const proposal of this.snapshot.proposal) {
      const base = `quest-${slugify(proposal.title)}`;
      let questId = base;
      let suffix = 2;
      while (used.has(questId)) questId = `${base.slice(0, 54)}-${suffix++}`;
      used.add(questId);
      assigned.push(questId);
    }
    const batch = acceptedSystemQuestBatchSchema.parse({
      systemId: this.snapshot.systemId,
      baseQuestIds: currentSystem.questIds.filter((questId) => !existingNative.has(questId)),
      creatorDescription: this.snapshot.description,
      sourceFingerprint: this.snapshot.sourceFingerprint,
      proposalFingerprint: fingerprint,
      acceptedAt: new Date(this.now()).toISOString(),
      quests: this.snapshot.proposal.map((proposal, index) => ({
        questId: assigned[index], title: proposal.title, playerVisibleOutcome: proposal.playerVisibleOutcome,
        whyItMatters: proposal.whyItMatters, doneWhen: proposal.doneWhen, excludedScope: proposal.excludedScope,
        dependsOn: proposal.dependencyIndexes.map((dependency) => assigned[dependency]!),
      })),
    });
    this.snapshot = { ...this.snapshot, phase: "accepting_quests", error: null };
    this.emit();
    try {
      await persist(batch);
      const firstQuestId = batch.quests[0]!.questId;
      this.snapshot = { ...this.snapshot, phase: "quests_accepted", firstQuestId, effects: { ...this.snapshot.effects, planningRecordsWritten: 1 } };
      this.emit();
    } catch (error) {
      this.snapshot = { ...this.snapshot, phase: "review", error: `Forge could not save these quests. ${messageFrom(error)}` };
      this.emit();
      throw error;
    }
  }

  setWorkOrderReview(draft: SystemQuestWorkOrderDraft): void {
    if (!["quests_accepted", "choosing_files", "work_order_review"].includes(this.snapshot.phase) || draft.questId !== this.snapshot.firstQuestId) throw new SystemQuestPlanningConflictError("Choose files for the selected accepted quest.");
    this.snapshot = { ...this.snapshot, phase: "work_order_review", workOrder: structuredClone(draft), error: null };
    this.emit();
  }

  async acceptWorkOrder(decision: string, fingerprint: string, persist: () => Promise<AcceptedSystemQuestPlan>): Promise<void> {
    if (decision !== "ACCEPT QUEST WORK ORDER") throw new Error("Use the exact work-order acceptance decision.");
    if (this.snapshot.phase !== "work_order_review" || !this.snapshot.workOrder || fingerprint !== this.snapshot.workOrder.fingerprint) throw new SystemQuestPlanningConflictError("Review the current exact file scope before accepting it.");
    this.snapshot = { ...this.snapshot, phase: "accepting_work_order", error: null };
    this.emit();
    try {
      await persist();
      this.snapshot = { ...this.snapshot, phase: "ready", effects: { ...this.snapshot.effects, planningRecordsWritten: 2 } };
      this.emit();
    } catch (error) {
      this.snapshot = { ...this.snapshot, phase: "work_order_review", error: `Forge could not save this work order. ${messageFrom(error)}` };
      this.emit();
      throw error;
    }
  }

  async waitForIdle(): Promise<void> { await this.activeRun; }

  private startGeneration(revision: string | null): void {
    const generation = ++this.generation;
    this.abortController = new AbortController();
    this.activeRun = this.generate(generation, revision).finally(() => { if (this.generation === generation) this.activeRun = null; });
    this.emit();
  }

  private async generate(generation: number, revision: string | null): Promise<void> {
    if (!this.sourceModel || !this.session || !this.snapshot.systemId) return;
    const started = this.now();
    try {
      let turn = await this.session.run(planningPrompt(this.sourceModel, this.snapshot.systemId, this.snapshot.description, this.snapshot.answers, revision, this.remaining), outputSchema, this.abortController?.signal);
      let attempts = 1;
      let parsed = parseResult(turn.finalResponse);
      let problems = parsed.result ? proposalProblems(parsed.result, this.remaining, this.clarificationSpent) : parsed.problems;
      let usage = turn.usage;
      if (!parsed.result || problems.length) {
        const repaired = await this.session.run(`Your last result was invalid. Return one corrected JSON result only. Fix:\n- ${problems.join("\n- ")}`, outputSchema, this.abortController?.signal);
        attempts += 1;
        usage = combineUsage(usage, repaired.usage);
        turn = repaired;
        parsed = parseResult(repaired.finalResponse);
        problems = parsed.result ? proposalProblems(parsed.result, this.remaining, this.clarificationSpent) : parsed.problems;
      }
      if (!parsed.result || problems.length) throw new Error(problems[0] ?? "Forge could not understand the quest proposal.");
      if (generation !== this.generation) return;
      const result = parsed.result;
      this.snapshot = {
        ...this.snapshot,
        phase: result.resultType === "clarification" ? "clarification" : "review",
        clarificationQuestions: result.resultType === "clarification" ? result.clarificationQuestions : [],
        proposal: result.resultType === "proposal" ? result.quests : null,
        proposalFingerprint: result.resultType === "proposal" ? fingerprintSystemQuestValue(result.quests) : null,
        provenance: { ...this.snapshot.provenance, threadId: turn.threadId, attempts: this.snapshot.provenance.attempts + attempts, latencyMs: this.now() - started, usage: combineUsage(this.snapshot.provenance.usage, usage) },
        error: null,
      };
      this.pendingRevision = null;
      this.emit();
    } catch (error) {
      if (generation !== this.generation) return;
      this.snapshot = { ...this.snapshot, phase: "failed", error: `Forge could not shape these quests. ${messageFrom(error)}` };
      this.emit();
    }
  }
}
