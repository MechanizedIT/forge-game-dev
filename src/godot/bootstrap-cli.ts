import { ensurePinnedGodot } from "./bootstrap.js";

const confirmed = process.argv.includes("confirm-download");

try {
  const result = await ensurePinnedGodot({ allowDownload: confirmed });
  console.log(`Godot ${result.version}`);
  console.log(`Source: ${result.source}`);
  console.log(`Executable: ${result.executable}`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
