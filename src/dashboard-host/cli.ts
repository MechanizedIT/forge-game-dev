import { spawn } from "node:child_process";
import path from "node:path";

import { OfficialBlueprintModelExecutor } from "../blueprint-planner/sdk.js";
import { BlueprintPlanningService } from "../blueprint-planner/service.js";
import { SystemRoadmapPlanningService } from "../blueprint-planner/system-roadmap.js";
import { repositoryRoot } from "../demo/paths.js";
import { launchPreparedGame } from "../godot/run-fixture.js";
import { OfficialCodexExecutor } from "../quest-runner/sdk.js";
import { ForgeDashboardService } from "./service.js";
import { createForgeDashboardServer } from "./server.js";
import { ProjectCreationService } from "../project-creation/service.js";
import { GeneratedProjectWorldService } from "../generated-project-world/service.js";
import { GeneratedQuestRunnerService } from "../generated-quest-runner/service.js";

function parsePort(value: string | undefined): number {
  const port = Number(value ?? "4173");
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error("FORGE_PORT must be an integer from 1 to 65535.");
  }
  return port;
}

function openBrowser(url: string): void {
  if (process.env.FORGE_NO_OPEN === "1") return;
  const command =
    process.platform === "win32"
      ? { executable: "cmd.exe", args: ["/d", "/s", "/c", `start "" "${url}"`] }
      : process.platform === "darwin"
        ? { executable: "open", args: [url] }
        : { executable: "xdg-open", args: [url] };
  const child = spawn(command.executable, command.args, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.on("error", () => {});
  child.unref();
}

const port = parsePort(process.env.FORGE_PORT);
const legacyMode = process.argv.includes("--legacy");
const v02Mode = process.argv.includes("--v0.2");
const service = new ForgeDashboardService({
  codexExecutor: new OfficialCodexExecutor(),
  gameLauncher: async (workspacePath) => {
    const result = await launchPreparedGame(workspacePath);
    return { version: result.version };
  },
});
const planningService = new BlueprintPlanningService(
  new OfficialBlueprintModelExecutor(repositoryRoot),
);
const creationService = new ProjectCreationService();
const generatedRunner = new GeneratedQuestRunnerService({
  codexExecutor: new OfficialCodexExecutor(),
});
await generatedRunner.recoverActiveRuns();
const generatedWorldService = new GeneratedProjectWorldService({ generatedRunner });
const systemRoadmapPlanningService = new SystemRoadmapPlanningService(
  new OfficialBlueprintModelExecutor(repositoryRoot),
);
const server = createForgeDashboardServer(
  service,
  path.join(repositoryRoot, "dist", "dashboard"),
  planningService,
  creationService,
  generatedWorldService,
  generatedRunner,
  systemRoadmapPlanningService,
);

server.once("error", (error: NodeJS.ErrnoException) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Forge could not start because http://127.0.0.1:${port} is already in use.`);
    console.error("Close the other Forge terminal, or choose another port before retrying:");
    console.error("$env:FORGE_PORT=4174; npm run forge");
    process.exit(1);
  }
  console.error(`Forge could not start: ${error.message}`);
  process.exit(1);
});

server.listen(port, "127.0.0.1", () => {
  const startPath = legacyMode ? "/legacy.html" : v02Mode ? "/v0.2.html" : "";
  const url = `http://127.0.0.1:${port}${startPath}`;
  console.log(`Forge Workshop is ready: ${url}`);
  console.log("Close this terminal or press Ctrl+C to stop Forge.");
  openBrowser(url);
});

for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
