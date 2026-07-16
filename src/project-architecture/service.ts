import { lstat, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";

import {
  gameAreaMutationSchema,
  projectArchitectureSchema,
  type AcceptedSystemQuestPlan,
  type GameArea,
  type GameAreaCategory,
  type GameAreaMutation,
  type ProjectArchitecture,
  type ProjectModel,
} from "../contracts/index.js";
import { writeJsonAtomic, writeTextAtomic } from "../quest-runner/artifacts.js";

export const ARCHITECTURE_RELATIVE_PATH = ".forge/architecture.json";
export const ARCHITECTURE_CONTEXT_LIMITS = {
  primaryAreas: 1,
  secondaryAreas: 3,
  previousSteps: 5,
  relatedFiles: 12,
} as const;

export interface ArchitectureWarning {
  warningId: string;
  message: string;
  areaIds: string[];
  filePaths: string[];
  advisory: true;
}

export interface ArchitectureContextArea {
  id: string;
  name: string;
  description: string;
  constraints: string[];
  relatedFiles: string[];
  dependencyNames: string[];
}

export interface ArchitectureContextPackage {
  primaryArea: ArchitectureContextArea | null;
  secondaryAreas: ArchitectureContextArea[];
  relatedPreviousSteps: Array<{
    stepId: string;
    summary: string;
    changedFiles: string[];
    verificationOutcome: "pending" | "passed" | "failed";
    playtestOutcome: "worked" | "did_not_work" | "not_ready" | "retry" | "cancel" | "not_run";
    occurredAt: string;
  }>;
  selectedFiles: string[];
  regressionChecks: string[];
  projectConstraints: string[];
  limits: typeof ARCHITECTURE_CONTEXT_LIMITS;
}

interface AreaDefinition {
  key: string;
  name: string;
  description: string;
  category: GameAreaCategory;
  terms: string[];
}

const areaDefinitions: AreaDefinition[] = [
  { key: "player-movement", name: "Player Movement", description: "How the player moves, jumps, accelerates, and responds to input.", category: "gameplay", terms: ["move", "movement", "jump", "dash", "walk", "run", "thruster", "velocity", "player_controller"] },
  { key: "inventory", name: "Inventory", description: "Items the player collects, holds, spends, or equips.", category: "data", terms: ["inventory", "item", "scrap", "collect", "pickup", "loot"] },
  { key: "combat", name: "Combat", description: "Damage, attacks, enemies, health, and combat reactions.", category: "gameplay", terms: ["combat", "attack", "damage", "enemy", "weapon", "health", "target"] },
  { key: "levels", name: "Levels", description: "Playable spaces, encounters, objectives, and level flow.", category: "world", terms: ["level", "world", "arena", "room", "objective", "platform", "scene"] },
  { key: "camera", name: "Camera", description: "How the game view follows, frames, and communicates action.", category: "presentation", terms: ["camera", "screen shake", "zoom"] },
  { key: "ui", name: "UI", description: "Menus, HUD elements, prompts, labels, and player-facing status.", category: "presentation", terms: ["ui", "hud", "menu", "label", "button", "panel", "prompt"] },
  { key: "audio", name: "Audio", description: "Sound effects, music, mixing, and audio feedback.", category: "presentation", terms: ["audio", "sound", "music", "sfx", "voice"] },
  { key: "saving", name: "Saving", description: "Persistent progress, settings, checkpoints, and load behavior.", category: "data", terms: ["save", "saving", "load", "persist", "checkpoint"] },
  { key: "upgrades", name: "Upgrades", description: "Player improvements, unlocks, and upgrade rules.", category: "gameplay", terms: ["upgrade", "unlock", "skill", "perk"] },
  { key: "animation", name: "Animation", description: "Character and world animation states and visual motion feedback.", category: "presentation", terms: ["animation", "animate", "sprite", "blend"] },
  { key: "build-export", name: "Build and Export", description: "Project startup, build settings, exports, and release checks.", category: "platform", terms: ["build", "export", "release", "project.godot"] },
];

function unique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function boundedText(value: string, maximum: number, fallback = ""): string {
  const normalized = value.trim() || fallback;
  if (normalized.length <= maximum) return normalized;
  return `${normalized.slice(0, maximum - 1).trimEnd()}…`;
}

function slug(value: string): string {
  const result = value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 60);
  return result || "game-area";
}

function normalizedText(values: readonly string[]): string {
  return values.join(" ").toLowerCase().replaceAll("_", " ").replaceAll("-", " ");
}

function scoreDefinition(definition: AreaDefinition, text: string): number {
  return definition.terms.reduce((score, term) => score + (text.includes(term.replaceAll("_", " ")) ? 1 : 0), 0);
}

function matchingDefinitions(values: readonly string[]): AreaDefinition[] {
  const text = normalizedText(values);
  return areaDefinitions
    .map((definition) => ({ definition, score: scoreDefinition(definition, text) }))
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.definition.name.localeCompare(right.definition.name))
    .map((item) => item.definition);
}

function blankArea(definition: AreaDefinition, now: string): GameArea {
  return {
    id: `area-${definition.key}`,
    name: definition.name,
    description: definition.description,
    category: definition.category,
    relatedFilePaths: [],
    dependencyIds: [],
    relatedExperienceIds: [],
    relatedStepIds: [],
    constraints: [],
    recentChanges: [],
    updatedAt: now,
  };
}

function fallbackArea(name: string, outcome: string, now: string): GameArea {
  return {
    id: `area-${slug(name)}`,
    name,
    description: outcome,
    category: "gameplay",
    relatedFilePaths: [],
    dependencyIds: [],
    relatedExperienceIds: [],
    relatedStepIds: [],
    constraints: [],
    recentChanges: [],
    updatedAt: now,
  };
}

function isContained(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function architectureTarget(projectPath: string): Promise<string> {
  const root = await realpath(path.resolve(projectPath));
  const forgeDirectory = path.join(root, ".forge");
  const forgeInfo = await lstat(forgeDirectory);
  if (!forgeInfo.isDirectory() || forgeInfo.isSymbolicLink() || await realpath(forgeDirectory) !== forgeDirectory) throw new Error("Forge architecture metadata directory is unsafe.");
  const target = path.join(root, ARCHITECTURE_RELATIVE_PATH);
  if (!isContained(root, target)) throw new Error("Forge architecture metadata escaped the project.");
  const info = await lstat(target).catch(() => null);
  if (info && (!info.isFile() || info.isSymbolicLink() || await realpath(target) !== target)) throw new Error("Forge architecture metadata is unsafe.");
  return target;
}

export class ArchitectureService {
  private readonly now: () => Date;

  constructor(options: { now?: () => Date } = {}) {
    this.now = options.now ?? (() => new Date());
  }

  async load(projectPath: string, projectId: string): Promise<ProjectArchitecture | null> {
    const target = await architectureTarget(projectPath);
    if (!await stat(target).catch(() => null)) return null;
    const architecture = projectArchitectureSchema.parse(JSON.parse(await readFile(target, "utf8")) as unknown);
    if (architecture.projectId !== projectId) throw new Error("Forge architecture metadata belongs to another project.");
    return architecture;
  }

  synchronize(
    projectId: string,
    projectModel: ProjectModel,
    questPlan: AcceptedSystemQuestPlan | null,
    filePaths: readonly string[],
    existing: ProjectArchitecture | null = null,
  ): ProjectArchitecture {
    const now = this.now().toISOString();
    const areas = new Map((existing?.gameAreas ?? []).map((area) => [area.id, structuredClone(area)]));
    const ensure = (definition: AreaDefinition | GameArea): GameArea => {
      const candidate = "key" in definition ? blankArea(definition, now) : definition;
      const current = areas.get(candidate.id);
      if (current) return current;
      areas.set(candidate.id, candidate);
      return candidate;
    };
    const areasByExperience = new Map<string, GameArea[]>();
    for (const experience of projectModel.systems) {
      const matches = matchingDefinitions([experience.title, experience.outcome]);
      const linked = (matches.length ? matches.map(ensure) : [ensure(fallbackArea(experience.title, experience.outcome, now))]);
      for (const area of linked) {
        area.relatedExperienceIds = unique([...area.relatedExperienceIds, experience.systemId]);
        area.updatedAt = now;
      }
      areasByExperience.set(experience.systemId, linked);
    }
    const savedQuests = new Map((questPlan?.systems ?? []).flatMap((system) => system.quests.map((quest) => [quest.questId, quest] as const)));
    for (const step of projectModel.quests) {
      const saved = savedQuests.get(step.questId);
      const matches = matchingDefinitions([step.title, step.playerVisibleOutcome, ...step.doneWhen, ...(saved?.excludedScope ?? [])]);
      const linked = matches.length ? matches.map(ensure) : (areasByExperience.get(step.systemId) ?? []);
      const workFiles = saved?.workOrder ? [...saved.workOrder.existingFiles, ...saved.workOrder.newFiles] : [];
      for (const area of linked) {
        area.relatedStepIds = unique([...area.relatedStepIds, step.questId]);
        area.relatedExperienceIds = unique([...area.relatedExperienceIds, step.systemId]);
        area.relatedFilePaths = unique([...area.relatedFilePaths, ...workFiles]);
        area.updatedAt = now;
      }
    }
    for (const filePath of filePaths) {
      for (const definition of matchingDefinitions([filePath])) {
        const area = ensure(definition);
        area.relatedFilePaths = unique([...area.relatedFilePaths, filePath]);
        area.updatedAt = now;
      }
    }
    for (const result of projectModel.results) {
      const linked = [...areas.values()].filter((area) => area.relatedStepIds.includes(result.questId));
      for (const area of linked) {
        const changeId = `change-${slug(result.workSessionId)}`;
        if (area.recentChanges.some((change) => change.changeId === changeId)) continue;
        area.recentChanges = [...area.recentChanges, {
          changeId,
          stepId: result.questId,
          workSessionId: result.workSessionId,
          summary: boundedText(result.summary, 500, "Forge recorded a completed change."),
          changedFiles: result.changedFiles,
          unexpectedFiles: result.changedFiles.filter((file) => !area.relatedFilePaths.includes(file)),
          verificationOutcome: result.status === "completed" ? "passed" as const : "failed" as const,
          playtestOutcome: result.creatorDecision ?? "not_run" as const,
          creatorFeedback: boundedText(result.summary, 1_000),
          occurredAt: result.occurredAt,
        }].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)).slice(-20);
        area.relatedFilePaths = unique([...area.relatedFilePaths, ...result.changedFiles]);
      }
    }
    const gameAreas = [...areas.values()]
      .filter((area) => area.relatedExperienceIds.length || area.relatedStepIds.length || area.relatedFilePaths.length || area.recentChanges.length)
      .sort((left, right) => left.name.localeCompare(right.name));
    const knownIds = new Set(gameAreas.map((area) => area.id));
    for (const area of gameAreas) area.dependencyIds = area.dependencyIds.filter((id) => knownIds.has(id) && id !== area.id);
    return projectArchitectureSchema.parse({ schemaVersion: 1, projectId, gameAreas, projectConstraints: existing?.projectConstraints ?? [], updatedAt: now });
  }

  async preview(projectPath: string, projectId: string, projectModel: ProjectModel, questPlan: AcceptedSystemQuestPlan | null, filePaths: readonly string[]): Promise<ProjectArchitecture> {
    return this.synchronize(projectId, projectModel, questPlan, filePaths, await this.load(projectPath, projectId));
  }

  async save(projectPath: string, value: ProjectArchitecture): Promise<ProjectArchitecture> {
    const architecture = projectArchitectureSchema.parse(value);
    const target = await architectureTarget(projectPath);
    await this.ensureIgnored(projectPath);
    await writeJsonAtomic(target, architecture);
    return architecture;
  }

  async ensure(projectPath: string, projectId: string, projectModel: ProjectModel, questPlan: AcceptedSystemQuestPlan | null, filePaths: readonly string[]): Promise<ProjectArchitecture> {
    return this.save(projectPath, await this.preview(projectPath, projectId, projectModel, questPlan, filePaths));
  }

  async mutate(projectPath: string, projectId: string, mutationValue: GameAreaMutation): Promise<ProjectArchitecture> {
    const mutation = gameAreaMutationSchema.parse(mutationValue);
    const current = await this.load(projectPath, projectId);
    if (!current) throw new Error("Open this World once before editing its Game Areas.");
    const now = this.now().toISOString();
    const target = current.gameAreas.find((area) => area.id === mutation.areaId);
    if (!target) throw new Error("Choose a saved Game Area.");
    let next = structuredClone(current);
    if (mutation.action === "edit") {
      next.gameAreas = next.gameAreas.map((area) => area.id === mutation.areaId ? { ...area, name: mutation.name, description: mutation.description, updatedAt: now } : area);
    } else if (mutation.action === "set_files") {
      next.gameAreas = next.gameAreas.map((area) => area.id === mutation.areaId ? { ...area, relatedFilePaths: unique(mutation.relatedFilePaths), updatedAt: now } : area);
    } else if (mutation.action === "set_dependencies") {
      const known = new Set(next.gameAreas.map((area) => area.id));
      if (mutation.dependencyIds.some((id) => id === mutation.areaId || !known.has(id))) throw new Error("Choose other saved Game Areas as dependencies.");
      next.gameAreas = next.gameAreas.map((area) => area.id === mutation.areaId ? { ...area, dependencyIds: unique(mutation.dependencyIds), updatedAt: now } : area);
    } else {
      const duplicate = next.gameAreas.find((area) => area.id === mutation.duplicateAreaId);
      if (!duplicate || duplicate.id === target.id) throw new Error("Choose a different duplicate Game Area to merge.");
      const merged: GameArea = {
        ...target,
        relatedFilePaths: unique([...target.relatedFilePaths, ...duplicate.relatedFilePaths]),
        dependencyIds: unique([...target.dependencyIds, ...duplicate.dependencyIds]).filter((id) => id !== target.id && id !== duplicate.id),
        relatedExperienceIds: unique([...target.relatedExperienceIds, ...duplicate.relatedExperienceIds]),
        relatedStepIds: unique([...target.relatedStepIds, ...duplicate.relatedStepIds]),
        constraints: unique([...target.constraints, ...duplicate.constraints]),
        recentChanges: [...target.recentChanges, ...duplicate.recentChanges].sort((left, right) => left.occurredAt.localeCompare(right.occurredAt)).slice(-20),
        updatedAt: now,
      };
      next.gameAreas = next.gameAreas.filter((area) => area.id !== duplicate.id).map((area) => area.id === target.id ? merged : { ...area, dependencyIds: area.dependencyIds.map((id) => id === duplicate.id ? target.id : id) });
    }
    next.updatedAt = now;
    return this.save(projectPath, next);
  }

  warnings(architecture: ProjectArchitecture, stepId: string, selectedFiles: readonly string[]): ArchitectureWarning[] {
    const linked = architecture.gameAreas.filter((area) => area.relatedStepIds.includes(stepId));
    const selected = new Set(selectedFiles);
    const warnings: ArchitectureWarning[] = [];
    const shared = selectedFiles.filter((file) => architecture.gameAreas.filter((area) => area.relatedFilePaths.includes(file)).length > 1);
    if (shared.length) warnings.push({ warningId: "shared-files", message: "This change touches files used by several Game Areas. Forge will keep the related checks in context.", areaIds: unique(architecture.gameAreas.filter((area) => shared.some((file) => area.relatedFilePaths.includes(file))).map((area) => area.id)), filePaths: shared, advisory: true });
    const dependencies = unique(linked.flatMap((area) => area.dependencyIds));
    if (dependencies.length) warnings.push({ warningId: "dependencies", message: `This change may also affect ${dependencies.map((id) => architecture.gameAreas.find((area) => area.id === id)?.name).filter(Boolean).join(" and ")}. Forge will include relevant regression checks.`, areaIds: dependencies, filePaths: [], advisory: true });
    const expected = unique(linked.flatMap((area) => area.relatedFilePaths));
    if (expected.length && !expected.some((file) => selected.has(file))) warnings.push({ warningId: "missing-usual-file", message: "The selected files do not include a file normally associated with this Game Area. Review Files remains optional.", areaIds: linked.map((area) => area.id), filePaths: expected.slice(0, 4), advisory: true });
    const central = selectedFiles.filter((file) => architecture.gameAreas.filter((area) => area.relatedFilePaths.includes(file)).length >= 3);
    if (central.length) warnings.push({ warningId: "central-file", message: "A selected file has broad impact across the game. Forge will keep the work order narrow and rerun baseline checks.", areaIds: linked.map((area) => area.id), filePaths: central, advisory: true });
    return warnings;
  }

  selectContext(architecture: ProjectArchitecture, stepId: string, selectedFiles: readonly string[]): ArchitectureContextPackage {
    const selectedSet = new Set(selectedFiles);
    const linked = architecture.gameAreas.filter((area) => area.relatedStepIds.includes(stepId));
    const ranked = [...linked].sort((left, right) => {
      const leftMatches = left.relatedFilePaths.filter((file) => selectedSet.has(file)).length;
      const rightMatches = right.relatedFilePaths.filter((file) => selectedSet.has(file)).length;
      return rightMatches - leftMatches || right.updatedAt.localeCompare(left.updatedAt) || left.name.localeCompare(right.name);
    });
    const primary = ranked[0] ?? null;
    const secondaryCandidates = unique([
      ...ranked.slice(1).map((area) => area.id),
      ...(primary?.dependencyIds ?? []),
    ]).map((id) => architecture.gameAreas.find((area) => area.id === id)).filter((area): area is GameArea => area !== undefined);
    const toContext = (area: GameArea): ArchitectureContextArea => ({
      id: area.id,
      name: area.name,
      description: area.description,
      constraints: area.constraints,
      relatedFiles: area.relatedFilePaths.filter((file) => selectedSet.has(file)).slice(0, ARCHITECTURE_CONTEXT_LIMITS.relatedFiles),
      dependencyNames: area.dependencyIds.map((id) => architecture.gameAreas.find((candidate) => candidate.id === id)?.name).filter((name): name is string => Boolean(name)),
    });
    const relevantAreas = [primary, ...secondaryCandidates].filter((area): area is GameArea => area !== null);
    const previous = relevantAreas.flatMap((area) => area.recentChanges).filter((change) => change.stepId !== stepId);
    const byChange = new Map(previous.sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)).map((change) => [change.changeId, change]));
    const regressionChecks = unique([
      ...secondaryCandidates.map((area) => `Keep ${area.name} working while changing ${primary?.name ?? "this Step"}.`),
      ...relevantAreas.flatMap((area) => area.constraints.map((constraint) => `Respect ${area.name}: ${constraint}`)),
    ]).slice(0, 8);
    return {
      primaryArea: primary ? toContext(primary) : null,
      secondaryAreas: secondaryCandidates.slice(0, ARCHITECTURE_CONTEXT_LIMITS.secondaryAreas).map(toContext),
      relatedPreviousSteps: [...byChange.values()].slice(0, ARCHITECTURE_CONTEXT_LIMITS.previousSteps).map((change) => ({
        stepId: change.stepId,
        summary: change.summary,
        changedFiles: change.changedFiles,
        verificationOutcome: change.verificationOutcome,
        playtestOutcome: change.playtestOutcome,
        occurredAt: change.occurredAt,
      })),
      selectedFiles: selectedFiles.slice(0, ARCHITECTURE_CONTEXT_LIMITS.relatedFiles),
      regressionChecks,
      projectConstraints: architecture.projectConstraints,
      limits: ARCHITECTURE_CONTEXT_LIMITS,
    };
  }

  async recordResult(projectPath: string, projectId: string, input: {
    stepId: string;
    workSessionId: string;
    summary: string;
    changedFiles: string[];
    verificationOutcome: "pending" | "passed" | "failed";
    playtestOutcome: "worked" | "did_not_work" | "not_ready" | "retry" | "cancel" | "not_run";
    creatorFeedback: string;
  }): Promise<ProjectArchitecture | null> {
    const current = await this.load(projectPath, projectId);
    if (!current) return null;
    const now = this.now().toISOString();
    const linked = current.gameAreas.filter((area) => area.relatedStepIds.includes(input.stepId));
    const affected = new Set(linked.map((area) => area.id));
    for (const file of input.changedFiles) for (const area of current.gameAreas) if (area.relatedFilePaths.includes(file)) affected.add(area.id);
    const unexpectedByArea = new Map<string, string[]>();
    for (const area of current.gameAreas) {
      unexpectedByArea.set(area.id, input.changedFiles.filter((file) => !area.relatedFilePaths.includes(file) && current.gameAreas.some((other) => other.id !== area.id && other.relatedFilePaths.includes(file))));
    }
    const changeId = `change-${slug(input.workSessionId)}`;
    const next: ProjectArchitecture = {
      ...current,
      gameAreas: current.gameAreas.map((area) => affected.has(area.id) ? {
        ...area,
        relatedStepIds: unique([...area.relatedStepIds, input.stepId]),
        relatedFilePaths: unique([...area.relatedFilePaths, ...input.changedFiles]),
        recentChanges: [...area.recentChanges.filter((change) => change.changeId !== changeId), {
          changeId,
          stepId: input.stepId,
          workSessionId: input.workSessionId,
          summary: boundedText(input.summary, 500, "Forge recorded a completed change."),
          changedFiles: input.changedFiles,
          unexpectedFiles: unexpectedByArea.get(area.id) ?? [],
          verificationOutcome: input.verificationOutcome,
          playtestOutcome: input.playtestOutcome,
          creatorFeedback: boundedText(input.creatorFeedback, 1_000),
          occurredAt: now,
        }].slice(-20),
        updatedAt: now,
      } : area),
      updatedAt: now,
    };
    return this.save(projectPath, next);
  }

  async recordCreatorFeedback(projectPath: string, projectId: string, input: {
    stepId: string;
    summary: string;
    relatedFiles: string[];
    playtestOutcome: "worked" | "did_not_work" | "not_ready" | "retry" | "cancel" | "not_run";
  }): Promise<ProjectArchitecture | null> {
    const current = await this.load(projectPath, projectId);
    if (!current) return null;
    const now = this.now().toISOString();
    const linkedIds = new Set(current.gameAreas.filter((area) => area.relatedStepIds.includes(input.stepId)).map((area) => area.id));
    for (const file of input.relatedFiles) for (const area of current.gameAreas) if (area.relatedFilePaths.includes(file)) linkedIds.add(area.id);
    const next: ProjectArchitecture = {
      ...current,
      gameAreas: current.gameAreas.map((area) => linkedIds.has(area.id) ? {
        ...area,
        relatedFilePaths: unique([...area.relatedFilePaths, ...input.relatedFiles]),
        recentChanges: [...area.recentChanges, {
          changeId: `feedback-${slug(input.stepId)}-${this.now().getTime()}`,
          stepId: input.stepId,
          workSessionId: null,
          summary: boundedText(input.summary, 500, "Creator recorded playtest feedback."),
          changedFiles: input.relatedFiles,
          unexpectedFiles: [],
          verificationOutcome: "pending" as const,
          playtestOutcome: input.playtestOutcome,
          creatorFeedback: boundedText(input.summary, 1_000),
          occurredAt: now,
        }].slice(-20),
        updatedAt: now,
      } : area),
      updatedAt: now,
    };
    return this.save(projectPath, next);
  }

  private async ensureIgnored(projectPath: string): Promise<void> {
    const gitDirectory = path.join(projectPath, ".git");
    if (!(await stat(gitDirectory).catch(() => null))?.isDirectory()) return;
    const excludePath = path.join(gitDirectory, "info", "exclude");
    const contents = await readFile(excludePath, "utf8").catch(() => "");
    if (contents.split(/\r?\n/u).includes(ARCHITECTURE_RELATIVE_PATH)) return;
    const separator = !contents || contents.endsWith("\n") ? "" : "\n";
    await writeTextAtomic(excludePath, `${contents}${separator}${ARCHITECTURE_RELATIVE_PATH}\n`);
  }
}
