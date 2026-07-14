import { access, cp, mkdir, rename, rm, stat } from "node:fs/promises";
import path from "node:path";

import { initializeWorkspaceGitBaseline } from "./git-workspace.js";
import { baselineFixturePath, resolveDemoWorkspace, resolveForgeHome } from "./paths.js";

export interface WorkspaceOptions {
  forgeHome?: string;
  fixturePath?: string;
}

export interface WorkspaceResult {
  status: "created" | "preserved" | "reset" | "cancelled";
  workspacePath: string;
}

export type DemoQuestState = "available" | "in progress" | "completed";

export function classifyDemoQuestState(
  roadmapState: string | undefined,
  workspaceHasChanges: boolean,
): DemoQuestState {
  if (roadmapState === "completed") return "completed";
  return workspaceHasChanges ? "in progress" : "available";
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function requireFixture(fixturePath: string): Promise<void> {
  const projectFile = path.join(fixturePath, "project.godot");
  const fixtureStats = await stat(projectFile).catch(() => null);
  if (!fixtureStats?.isFile()) {
    throw new Error(`Forge baseline fixture is missing project.godot: ${fixturePath}`);
  }
}

function assertSafeWorkspaceTarget(forgeHome: string, workspacePath: string): void {
  const resolvedHome = path.resolve(forgeHome);
  const resolvedWorkspace = path.resolve(workspacePath);
  const expectedWorkspace = path.join(resolvedHome, "demo-workspace");
  const relative = path.relative(resolvedHome, resolvedWorkspace);

  if (
    resolvedWorkspace !== expectedWorkspace ||
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    throw new Error(`Refusing to reset unsafe demo workspace path: ${resolvedWorkspace}`);
  }
}

function temporarySibling(workspacePath: string, operation: string): string {
  return `${workspacePath}.${operation}-${process.pid}-${Date.now()}`;
}

export async function prepareDemoWorkspace(
  options: WorkspaceOptions = {},
): Promise<WorkspaceResult> {
  const forgeHome = path.resolve(options.forgeHome ?? resolveForgeHome());
  const fixturePath = path.resolve(options.fixturePath ?? baselineFixturePath);
  const workspacePath = resolveDemoWorkspace(forgeHome);

  await requireFixture(fixturePath);
  if (await pathExists(workspacePath)) {
    return { status: "preserved", workspacePath };
  }

  await mkdir(forgeHome, { recursive: true });
  const temporaryPath = temporarySibling(workspacePath, "preparing");

  try {
    await cp(fixturePath, temporaryPath, { recursive: true, errorOnExist: true, force: false });
    await initializeWorkspaceGitBaseline(temporaryPath);
    await rename(temporaryPath, workspacePath);
    return { status: "created", workspacePath };
  } catch (error) {
    await rm(temporaryPath, { recursive: true, force: true });
    if (await pathExists(workspacePath)) {
      return { status: "preserved", workspacePath };
    }
    throw error;
  }
}

export async function resetDemoWorkspace(
  confirmed: boolean,
  options: WorkspaceOptions = {},
): Promise<WorkspaceResult> {
  const forgeHome = path.resolve(options.forgeHome ?? resolveForgeHome());
  const fixturePath = path.resolve(options.fixturePath ?? baselineFixturePath);
  const workspacePath = resolveDemoWorkspace(forgeHome);

  if (!confirmed) {
    return { status: "cancelled", workspacePath };
  }

  assertSafeWorkspaceTarget(forgeHome, workspacePath);
  await requireFixture(fixturePath);
  await mkdir(forgeHome, { recursive: true });

  const replacementPath = temporarySibling(workspacePath, "resetting");
  try {
    await cp(fixturePath, replacementPath, { recursive: true, errorOnExist: true, force: false });
    await initializeWorkspaceGitBaseline(replacementPath);
    await rm(workspacePath, { recursive: true, force: true });
    await rename(replacementPath, workspacePath);
    return { status: "reset", workspacePath };
  } catch (error) {
    await rm(replacementPath, { recursive: true, force: true });
    throw error;
  }
}
