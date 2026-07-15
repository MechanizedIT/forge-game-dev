import { randomUUID } from "node:crypto";
import { access, lstat, readFile, realpath, rename, stat } from "node:fs/promises";
import path from "node:path";

import {
  generatedRoadmapV2Schema,
  godotVerificationResultSchema,
  projectRegistrySchema,
  roadmapSchema,
  type ProjectRegistry,
  type ProjectRegistryEntry,
} from "../contracts/index.js";
import { writeJsonAtomic } from "../quest-runner/artifacts.js";
import { assertDirectChild } from "./filesystem.js";
import type { RecentProjectSummary } from "./shared.js";

interface LoadedRegistry {
  registry: ProjectRegistry;
  malformed: boolean;
}

async function readUnknown(filePath: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(filePath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

export class ProjectRegistryConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProjectRegistryConflictError";
  }
}

export class ProjectRegistryStore {
  readonly registryPath: string;

  constructor(
    private readonly forgeHome: string,
    private readonly now: () => Date = () => new Date(),
  ) {
    this.registryPath = path.join(path.resolve(forgeHome), "project-registry.json");
  }

  private async read(): Promise<LoadedRegistry> {
    try {
      const value = JSON.parse(await readFile(this.registryPath, "utf8")) as unknown;
      const parsed = projectRegistrySchema.safeParse(value);
      return parsed.success
        ? { registry: parsed.data, malformed: false }
        : { registry: { schemaVersion: 1, projects: [] }, malformed: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { registry: { schemaVersion: 1, projects: [] }, malformed: false };
      }
      return { registry: { schemaVersion: 1, projects: [] }, malformed: true };
    }
  }

  async load(): Promise<ProjectRegistry> {
    return (await this.read()).registry;
  }

  private async preserveMalformedRegistry(): Promise<void> {
    try {
      await access(this.registryPath);
    } catch {
      return;
    }
    const backup = path.join(
      path.dirname(this.registryPath),
      `project-registry.malformed-${this.now().getTime()}-${randomUUID().slice(0, 8)}.json`,
    );
    await rename(this.registryPath, backup);
  }

  async add(entryValue: ProjectRegistryEntry): Promise<void> {
    const entry = projectRegistrySchema.shape.projects.element.parse(entryValue);
    if (!path.isAbsolute(entry.canonicalPath) || path.resolve(entry.canonicalPath) !== entry.canonicalPath) {
      throw new Error("Project registry paths must be canonical absolute paths.");
    }
    const loaded = await this.read();
    if (loaded.registry.projects.some((project) => project.projectId === entry.projectId)) {
      throw new ProjectRegistryConflictError(`Project ID ${entry.projectId} is already registered.`);
    }
    if (loaded.malformed) await this.preserveMalformedRegistry();
    await writeJsonAtomic(this.registryPath, projectRegistrySchema.parse({
      schemaVersion: 1,
      projects: [...loaded.registry.projects, entry],
    }));
  }

  async removeOwned(projectId: string, canonicalPath: string): Promise<void> {
    const loaded = await this.read();
    if (loaded.malformed) return;
    const remaining = loaded.registry.projects.filter((project) => !(
      project.projectId === projectId && project.canonicalPath === canonicalPath
    ));
    if (remaining.length === loaded.registry.projects.length) return;
    await writeJsonAtomic(this.registryPath, projectRegistrySchema.parse({ schemaVersion: 1, projects: remaining }));
  }

  async find(projectId: string): Promise<ProjectRegistryEntry | null> {
    return (await this.load()).projects.find((project) => project.projectId === projectId) ?? null;
  }

  async resolveRegisteredProject(projectId: string): Promise<ProjectRegistryEntry> {
    const entry = await this.find(projectId);
    if (!entry) throw new Error(`Project ${projectId} is not registered.`);
    const projectsRoot = await realpath(path.join(path.resolve(this.forgeHome), "projects")).catch(() => null);
    if (!projectsRoot) throw new Error("Forge's managed projects directory is unavailable.");
    const entryStats = await lstat(entry.canonicalPath).catch(() => null);
    if (!entryStats?.isDirectory() || entryStats.isSymbolicLink()) {
      throw new Error(`Project ${projectId} is missing or moved.`);
    }
    const canonicalPath = await realpath(entry.canonicalPath).catch(() => null);
    if (!canonicalPath || canonicalPath !== entry.canonicalPath) {
      throw new Error(`Project ${projectId} is missing or moved.`);
    }
    assertDirectChild(projectsRoot, canonicalPath);
    const projectFile = await stat(path.join(canonicalPath, "project.godot")).catch(() => null);
    if (!projectFile?.isFile()) throw new Error(`Project ${projectId} is missing project.godot.`);
    return entry;
  }

  async listRecent(): Promise<RecentProjectSummary[]> {
    const registry = await this.load();
    const summaries = await Promise.all(registry.projects.map(async (project) => {
      const projectFile = await stat(path.join(project.canonicalPath, "project.godot")).catch(() => null);
      const available = projectFile?.isFile() ?? false;
      const roadmapValue = available
        ? await readUnknown(path.join(project.canonicalPath, ".forge", "roadmap.json"))
        : null;
      const generatedRoadmap = available ? generatedRoadmapV2Schema.safeParse(roadmapValue) : null;
      const legacyRoadmap = available && !generatedRoadmap?.success ? roadmapSchema.safeParse(roadmapValue) : null;
      const godot = available
        ? godotVerificationResultSchema.safeParse(await readUnknown(path.join(project.canonicalPath, ".forge", "local", "godot-verification.json")))
        : null;
      return {
        projectId: project.projectId,
        displayName: project.displayName,
        canonicalPath: project.canonicalPath,
        foundation: project.foundation,
        createdAt: project.createdAt,
        lastOpenedAt: project.lastOpenedAt,
        starterVersion: project.starterVersion,
        available,
        stateLabel: available
          ? "Created · Project World ready"
          : "Missing locally · registry entry preserved",
        questCount: generatedRoadmap?.success
          ? generatedRoadmap.data.quests.length
          : legacyRoadmap?.success
            ? legacyRoadmap.data.quests.length
            : null,
        godotSmokeCheckPassed: godot?.success ?? false,
      } satisfies RecentProjectSummary;
    }));
    return summaries.sort((left, right) => right.lastOpenedAt.localeCompare(left.lastOpenedAt));
  }

  async markOpened(projectId: string): Promise<ProjectRegistryEntry> {
    const loaded = await this.read();
    if (loaded.malformed) throw new Error("The recent-project registry is malformed; projects were preserved.");
    const index = loaded.registry.projects.findIndex((project) => project.projectId === projectId);
    const current = loaded.registry.projects[index];
    if (!current) throw new Error(`Project ${projectId} is not registered.`);
    await this.resolveRegisteredProject(projectId);
    const updated: ProjectRegistryEntry = { ...current, lastOpenedAt: this.now().toISOString() };
    const projects = [...loaded.registry.projects];
    projects[index] = updated;
    await writeJsonAtomic(this.registryPath, projectRegistrySchema.parse({ schemaVersion: 1, projects }));
    return updated;
  }
}
