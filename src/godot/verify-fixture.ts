import { verifyFixture } from "./run-fixture.js";

try {
  const result = await verifyFixture();
  console.log(`Godot ${result.version}`);
  console.log(`Workspace: ${result.workspacePath}`);
  console.log(result.output);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
