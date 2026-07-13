import { playFixture } from "../godot/run-fixture.js";
import { prepareDemoWorkspace, resetDemoWorkspace } from "./workspace.js";

const command = process.argv[2];

try {
  if (command === "prepare") {
    const result = await prepareDemoWorkspace();
    console.log(`Demo workspace ${result.status}: ${result.workspacePath}`);
  } else if (command === "reset") {
    const confirmed = process.argv.includes("--yes") || process.argv.includes("confirm-reset");
    const result = await resetDemoWorkspace(confirmed);
    if (result.status === "cancelled") {
      console.error(
        "Reset cancelled. Re-run with confirm-reset to replace the demo workspace.",
      );
      process.exitCode = 2;
    } else {
      console.log(`Demo workspace reset: ${result.workspacePath}`);
    }
  } else if (command === "play") {
    await playFixture();
  } else {
    console.error("Usage: demo <prepare|play> | demo reset confirm-reset");
    process.exitCode = 2;
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
