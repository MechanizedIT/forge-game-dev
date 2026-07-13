import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

import { launchPreparedGame } from "../godot/run-fixture.js";
import { completeQuestAfterPlay } from "./completion.js";
import { OfficialCodexExecutor } from "./sdk.js";
import {
  executePreparedQuest,
  prepareQuestRun,
  QuestAlreadyCompletedError,
} from "./workflow.js";

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

async function finishCreatorPlay(
  prepared: Awaited<ReturnType<typeof prepareQuestRun>>,
  result: Awaited<ReturnType<typeof executePreparedQuest>> & { status: "ready_for_play" },
): Promise<void> {
  console.log("\nAutomated checks passed. Enemy Targeting is ready for your visual check.");
  console.log("In the game, verify all three behaviors:");
  console.log("- The enemy is IDLE when the player is more than 220 pixels away.");
  console.log("- The enemy changes to CHASING and approaches inside 220 pixels.");
  console.log("- The enemy returns to IDLE when the player retreats beyond 220 pixels.");

  if (!stdin.isTTY) {
    console.log("No interactive creator confirmation was available. The quest remains incomplete.");
    console.log(`Evidence: ${result.runDirectory}`);
    process.exitCode = 2;
    return;
  }

  const prompt = createInterface({ input: stdin, output: stdout });
  try {
    const launchChoice = await prompt.question(
      "Type LAUNCH to open the verified demo game, or CANCEL: ",
    );
    if (launchChoice.trim() !== "LAUNCH") {
      console.log("Launch cancelled. The quest remains incomplete.");
      process.exitCode = 2;
      return;
    }

    const completion = await completeQuestAfterPlay(prepared, result, {
      launchGame: async (workspacePath) => {
        const launch = await launchPreparedGame(workspacePath);
        return { version: launch.version };
      },
      requestCreatorResponse: async () => {
        while (true) {
          const answer = (
            await prompt.question(
              "Enter I SAW IT WORK, IT DID NOT WORK, or CANCEL: ",
            )
          ).trim();
          if (
            answer === "I SAW IT WORK" ||
            answer === "IT DID NOT WORK" ||
            answer === "CANCEL"
          ) {
            return answer;
          }
          console.log("Please enter one of the three exact responses shown.");
        }
      },
    });

    if (completion.status === "completed") {
      console.log("\nQuest complete: Enemy Targeting");
      console.log("Your confirmation and completed roadmap state were saved.");
      console.log(`Evidence: ${result.runDirectory}`);
    } else if (completion.status === "reported_failure") {
      console.error("\nThe quest remains incomplete because the visible check did not pass.");
      console.error("Review the saved evidence before repairing or explicitly resetting the workspace.");
      process.exitCode = 1;
    } else if (completion.status === "cancelled") {
      console.log("\nConfirmation cancelled. The quest remains incomplete.");
      process.exitCode = 2;
    } else if (completion.status === "launch_failed") {
      console.error(`\nGame launch failed: ${completion.error}`);
      console.error("The quest remains incomplete.");
      process.exitCode = 1;
    } else {
      console.error(`\nThe quest cannot be completed: ${completion.reason}`);
      process.exitCode = 1;
    }
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
      await finishCreatorPlay(prepared, result);
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
  if (error instanceof QuestAlreadyCompletedError) {
    console.log("Enemy Targeting is already complete; Forge will not rebuild it silently.");
    console.log(`Completed: ${error.completion.completedAt}`);
    console.log("Use npm run demo:play to experience it again, or reset explicitly to start over.");
  } else {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
