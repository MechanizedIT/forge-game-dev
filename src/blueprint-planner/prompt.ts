import type { ClarificationTopic } from "../contracts/index.js";

function formattedAnswers(answers: Partial<Record<ClarificationTopic, string>>): string {
  const entries = Object.entries(answers);
  return entries.length === 0
    ? "No clarification answers have been provided."
    : entries.map(([topic, answer]) => `- ${topic}: ${answer}`).join("\n");
}
export function buildBlueprintPrompt(
  idea: string,
  answers: Partial<Record<ClarificationTopic, string>>,
): string {
  const clarificationComplete = Object.keys(answers).length > 0;
  return `You are the focused planning stage inside Forge, a game-development companion.

Turn the creator's idea into either one bounded clarification screen or a complete creator-facing game blueprint. Return only the structured result requested by the supplied JSON schema.

Creator idea:
${idea}

Clarification answers:
${formattedAnswers(answers)}

Rules:
- The required foundation is exactly top_down_arena for Godot 4, 2D, and GDScript.
- Plan a first playable result, not a complete game.
- Use only code-native visual concepts and no external assets, packages, source files, paths, commands, storage instructions, or workflow-state claims.
- A complete blueprint needs three to five ordered quests. Temporary references Q1 through Q5 exist only to express ordering and are not durable IDs.
- Every quest needs a visible outcome, at least one acceptance criterion, and at least one linked verification idea.
- Dependencies must refer only to blueprint quests and must be acyclic.
- Keep documentation and Chronicle summaries concise and creator-facing.
- Ask clarification only if material information is missing. Allowed topics are game_style, core_action, fun_target, input_mode, and smallest_playable_result.
- Ask no more than three questions, do not repeat information already in the idea, and use controlled choices where appropriate.
- ${clarificationComplete ? "Clarification is complete. Return a full blueprint and no further questions." : "If the idea is already specific enough, return the full blueprint immediately."}
`;
}

export function buildRepairPrompt(
  idea: string,
  answers: Partial<Record<ClarificationTopic, string>>,
  validationProblems: string[],
): string {
  return `Return one complete corrected planning result using the supplied JSON schema.

Preserve this creator idea:
${idea}

Preserve these clarification answers:
${formattedAnswers(answers)}

Correct only these validation problems:
${validationProblems.map((problem) => `- ${problem}`).join("\n")}

Do not include commentary, a partial patch, hidden reasoning, paths, commands, files, packages, or workflow-state claims. ${Object.keys(answers).length > 0 ? "Clarification is complete; return a full blueprint." : "Return either a permitted clarification screen or a full blueprint."}`;
}
