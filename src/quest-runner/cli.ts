import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { OfficialCodexExecutor } from "./sdk.js";
import { executePreparedQuest, prepareQuestRun } from "./workflow.js";

const args = process.argv.slice(2);
const questId = args.find((argument) => !argument.startsWith("--")) ?? "";

async function requestApproval(): Promise<boolean> {
  if (args.includes("confirm-run") || args.includes("--approve")) return true;
  if (!stdin.isTTY) {
    console.error("Live Codex execution requires an interactive APPROVE response or confirm-run.");
    return false;
  }
  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await prompt.question("Type APPROVE to let Codex modify the demo workspace: ");
    return answer.trim() === "APPROVE";
  } finally {
    prompt.close();
  }
}

try {
  const prepared = await prepareQuestRun({ questId });
  console.log(`\nQuest: ${prepared.bundle.quest.title}`);
  console.log(prepared.bundle.quest.playerOutcome);
  console.log(`\nWhy it matters: ${prepared.bundle.quest.whyItMatters}`);
  console.log(`\nCodex may change only: ${prepared.context.allowedChangeFiles.join(", ")}`);
  console.log("Forge will run automated checks afterward. The roadmap will remain available until you play and confirm it.");

  const approved = await requestApproval();
  if (!approved) {
    await executePreparedQuest(prepared, { approved: false });
    console.log("Quest cancelled. No Codex run started and the quest was not completed.");
    process.exitCode = 2;
  } else {
    const result = await executePreparedQuest(prepared, {
      approved: true,
      codexExecutor: new OfficialCodexExecutor(),
      onProgress: (message) => console.log(`• ${message}`),
    });
    if (result.status === "ready_for_play") {
      console.log("\nAutomated review: CONDITIONAL PASS");
      console.log("Enemy Targeting is ready to play, but the quest is not complete yet.");
      console.log("Run npm run demo:play, then confirm ‘I saw it work’ in the next milestone.");
      console.log(`Evidence: ${result.runDirectory}`);
    } else if (result.status === "failed") {
      console.error("\nAutomated review: FAIL");
      for (const concern of result.review.concerns) console.error(`- ${concern}`);
      console.error(`Evidence: ${result.runDirectory}`);
      process.exitCode = 1;
    } else {
      throw new Error("Approved quest run was unexpectedly cancelled");
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
