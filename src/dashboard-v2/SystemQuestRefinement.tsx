import { useEffect, useMemo, useState } from "react";

import {
  acceptSystemQuestPlanning,
  acceptSystemQuestWorkOrder,
  answerSystemQuestPlanning,
  cancelSystemQuestPlanning,
  listSystemQuestFiles,
  loadSystemQuestPlanning,
  retrySystemQuestPlanning,
  reviewSystemQuestWorkOrder,
  reviseSystemQuestPlanning,
  startSystemQuestPlanning,
  subscribeToSystemQuestPlanning,
} from "../dashboard/api.js";
import type { AcceptedNativeQuest, ProjectModel } from "../contracts/index.js";
import type { SystemQuestPlanningSnapshot } from "../blueprint-planner/system-quest.js";
import type { SystemQuestFileCandidate } from "../generated-project-world/shared.js";

export type SystemQuestListItem = AcceptedNativeQuest & { status: ProjectModel["quests"][number]["status"] };

export interface QuestFileRecommendation {
  existingFiles: string[];
  suggestedNewFile: string | null;
}

const recommendationStopWords = new Set([
  "after", "ahead", "appear", "appears", "before", "being", "clear", "different", "each", "from", "game", "have", "into", "more", "quest", "should", "than", "that", "their", "there", "these", "this", "varied", "when", "where", "with",
]);

function normalizedWords(value: string): string[] {
  return value.toLowerCase().split(/[^a-z0-9]+/u).filter((word) => word.length >= 3).map((word) => {
    if (word.endsWith("ies") && word.length > 4) return `${word.slice(0, -3)}y`;
    if (word.endsWith("s") && word.length > 4) return word.slice(0, -1);
    return word;
  }).filter((word) => !recommendationStopWords.has(word));
}

export function recommendQuestFiles(quest: Pick<AcceptedNativeQuest, "title" | "playerVisibleOutcome" | "doneWhen">, candidates: SystemQuestFileCandidate[]): QuestFileRecommendation {
  const questWords = new Set(normalizedWords([quest.title, quest.playerVisibleOutcome, ...quest.doneWhen].join(" ")));
  const gameFiles = candidates.filter((candidate) => !/(?:^|\/)verify_project\.gd$/iu.test(candidate.relativePath));
  const ranked = gameFiles.map((candidate) => {
    const pathWords = new Set(normalizedWords(candidate.relativePath));
    const matches = [...pathWords].filter((word) => questWords.has(word)).length;
    const fallback = candidate.relativePath === "scripts/main.gd" ? 3 : candidate.relativePath === "scenes/main.tscn" ? 2 : candidate.relativePath.endsWith(".gd") ? 1 : 0;
    return { relativePath: candidate.relativePath, matches, score: matches * 10 + fallback };
  }).sort((left, right) => right.score - left.score || left.relativePath.localeCompare(right.relativePath));
  const matched = ranked.filter((candidate) => candidate.matches > 0).slice(0, 2).map((candidate) => candidate.relativePath);
  const fallbacks = ["scripts/main.gd", "scenes/main.tscn"].filter((relativePath) => gameFiles.some((candidate) => candidate.relativePath === relativePath));
  const existingFiles = matched.length ? [...matched, ...fallbacks.filter((relativePath) => !matched.includes(relativePath))].slice(0, 2) : (fallbacks.length ? fallbacks : ranked.slice(0, 2).map((candidate) => candidate.relativePath));
  const slug = quest.title.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/gu, "_").replace(/^_+|_+$/gu, "").slice(0, 48) || "quest_change";
  const suggestedNewFile = `scripts/${slug}.gd`;
  return { existingFiles, suggestedNewFile: gameFiles.some((candidate) => candidate.relativePath === suggestedNewFile) ? null : suggestedNewFile };
}

export function friendlyQuestPlanningError(message: string | null): string {
  if (!message || /invalid_json_schema|response_format|text\.format\.schema|invalid_request_error|\{\s*"type"\s*:/iu.test(message)) {
    return "Forge could not suggest Steps this time. Your description is still here, so you can try again safely.";
  }
  return message.replaceAll("quest", "Step").replaceAll("Quest", "Step").replaceAll("system", "Experience").replaceAll("System", "Experience");
}

export function SystemQuestRefinement({ creationMode = false, initialDescription = "", preferredFiles = [], projectId, singleStep = false, systemId, systemTitle, systemOutcome, systemQuests, targetQuestId, onClose, onChanged, onReady }: {
  creationMode?: boolean;
  initialDescription?: string;
  preferredFiles?: string[];
  projectId: string;
  systemId: string;
  systemTitle: string;
  systemOutcome: string;
  systemQuests: SystemQuestListItem[];
  targetQuestId?: string;
  singleStep?: boolean;
  onClose: () => void;
  onChanged: () => Promise<void>;
  onReady: (questId: string) => Promise<void> | void;
}) {
  const [snapshot, setSnapshot] = useState<SystemQuestPlanningSnapshot | null>(null);
  const [description, setDescription] = useState(initialDescription);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [revision, setRevision] = useState("");
  const [files, setFiles] = useState<SystemQuestFileCandidate[]>([]);
  const [existingFiles, setExistingFiles] = useState<string[]>([]);
  const [newFileText, setNewFileText] = useState("");
  const [chosenQuestId, setChosenQuestId] = useState<string | undefined>(targetQuestId);
  const [fileChoiceOpen, setFileChoiceOpen] = useState(Boolean(targetQuestId));
  const [recommendation, setRecommendation] = useState<QuestFileRecommendation>({ existingFiles: [], suggestedNewFile: null });
  const [recommendationAppliedQuestId, setRecommendationAppliedQuestId] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => setSnapshot(await loadSystemQuestPlanning(projectId, systemId, targetQuestId));
  useEffect(() => {
    let active = true;
    void loadSystemQuestPlanning(projectId, systemId, targetQuestId).then((value) => {
      if (active) { setSnapshot(value); setDescription(value.description || initialDescription); setBusy(false); }
    }).catch((next) => {
      if (active) { setError(friendlyQuestPlanningError(next instanceof Error ? next.message : String(next))); setBusy(false); }
    });
    const unsubscribe = subscribeToSystemQuestPlanning(projectId, systemId, () => void refresh().catch(() => {}), () => {});
    return () => { active = false; unsubscribe(); };
  }, [projectId, systemId, targetQuestId]);

  useEffect(() => {
    if (!snapshot || !["quests_accepted", "choosing_files", "work_order_review", "ready"].includes(snapshot.phase)) return;
    void listSystemQuestFiles(projectId, systemId).then(setFiles).catch((next) => setError(next instanceof Error ? next.message : String(next)));
  }, [projectId, snapshot?.phase, systemId]);

  const recommendedQuest = useMemo(() => systemQuests.find((quest) => quest.status === "available" && !quest.implementation && !quest.workOrder) ?? null, [systemQuests]);
  const activeQuestId = snapshot?.workOrder?.questId ?? chosenQuestId ?? targetQuestId ?? snapshot?.firstQuestId ?? recommendedQuest?.questId;
  const chosenQuest = systemQuests.find((quest) => quest.questId === activeQuestId) ?? null;
  const newFiles = useMemo(() => newFileText.split(/[,\n]/u).map((value) => value.trim()).filter(Boolean), [newFileText]);

  useEffect(() => {
    if (!chosenQuestId && recommendedQuest) setChosenQuestId(recommendedQuest.questId);
  }, [chosenQuestId, recommendedQuest]);

  useEffect(() => {
    if (!fileChoiceOpen || !chosenQuest || files.length === 0 || recommendationAppliedQuestId === chosenQuest.questId) return;
    const next = recommendQuestFiles(chosenQuest, files);
    setRecommendation(next);
    setExistingFiles(preferredFiles.length ? preferredFiles.filter((file) => files.some((candidate) => candidate.relativePath === file)).slice(0, 4) : next.existingFiles);
    setNewFileText("");
    setRecommendationAppliedQuestId(chosenQuest.questId);
  }, [chosenQuest, fileChoiceOpen, files, preferredFiles, recommendationAppliedQuestId]);

  const run = async (operation: () => Promise<SystemQuestPlanningSnapshot>, changed = false): Promise<boolean> => {
    if (busy) return false;
    setBusy(true);
    try {
      const value = await operation();
      setSnapshot(value);
      setError(null);
      if (changed) await onChanged();
      return true;
    } catch (next) {
      setError(friendlyQuestPlanningError(next instanceof Error ? next.message : String(next)));
      return false;
    } finally { setBusy(false); }
  };
  const cancel = () => void run(() => cancelSystemQuestPlanning(projectId, systemId));
  const leaveSavedQuests = () => void run(() => cancelSystemQuestPlanning(projectId, systemId)).then((success) => { if (success) onClose(); });

  if (busy && !snapshot) return <main className="system-quest-refinement"><p className="v2-eyebrow">Step guide</p><h1>Opening this Experience…</h1></main>;
  if (!snapshot) return <main className="system-quest-refinement"><h1>Forge stopped safely.</h1><p role="alert">{error}</p><button className="v2-button button-quiet" onClick={() => void refresh()} type="button">Retry</button></main>;

  const preparingQuest = Boolean(chosenQuest && (fileChoiceOpen || ["work_order_review", "accepting_work_order", "ready"].includes(snapshot.phase)));
  const common = preparingQuest && chosenQuest
    ? <header><p className="v2-eyebrow">Prepare one Step · {systemTitle}</p><h1>{chosenQuest.title}</h1><p>{chosenQuest.playerVisibleOutcome}</p><small>No Godot file changes. Codex has not started.</small></header>
    : <header><p className="v2-eyebrow">{creationMode ? "Recommend Steps" : "Edit this Experience"}</p><h1>{systemTitle}</h1><p>{systemOutcome}</p><small>No Godot file changes. Codex has not started.</small></header>;

  if (snapshot.phase === "idle" || (snapshot.phase === "cancelled" && !fileChoiceOpen)) return <main className="system-quest-refinement">{common}{error && <p className="workflow-error" role="alert">{error}</p>}<label><span>{singleStep ? "What needs to change?" : "What should the player experience here?"}</span><textarea maxLength={1500} minLength={12} onChange={(event) => setDescription(event.target.value)} placeholder="The beacon should feel useful before the storm becomes dangerous…" rows={5} value={description} /></label><div className="system-quest-actions"><button className="v2-button button-quiet" onClick={onClose} type="button">Back to World</button><button className="v2-button button-ember" disabled={busy || description.trim().length < 12} onClick={() => void run(() => startSystemQuestPlanning(projectId, systemId, singleStep ? `Recommend exactly one bounded Step. ${description}` : description))} type="button">{singleStep ? "Review Step" : "Suggest Steps"}</button></div></main>;

  if (["planning", "revising", "accepting_quests", "accepting_work_order"].includes(snapshot.phase)) return <main className="system-quest-refinement">{common}<section className="workspace-empty"><strong>{snapshot.phase === "accepting_quests" || snapshot.phase === "accepting_work_order" ? "Saving the exact choice…" : "Forgie is shaping focused Steps…"}</strong><p>Your words stay here while Forge finishes this one Step.</p></section></main>;

  if (snapshot.phase === "clarification") return <main className="system-quest-refinement">{common}<section><h2>One small question round</h2><p>Forge needs only these answers before suggesting Steps.</p>{snapshot.clarificationQuestions.map((question) => <label key={question.questionId}><span>{question.question}</span><small>{question.whyItMatters}</small><input maxLength={240} onChange={(event) => setAnswers((current) => ({ ...current, [question.questionId]: event.target.value }))} value={answers[question.questionId] ?? ""} /></label>)}</section>{error && <p className="workflow-error" role="alert">{error}</p>}<div className="system-quest-actions"><button className="v2-button button-quiet" onClick={cancel} type="button">Cancel</button><button className="v2-button button-ember" disabled={busy || snapshot.clarificationQuestions.some((question) => !(answers[question.questionId] ?? "").trim())} onClick={() => void run(() => answerSystemQuestPlanning(projectId, systemId, snapshot.clarificationQuestions.map((question) => ({ questionId: question.questionId, answer: answers[question.questionId] ?? "" }))))} type="button">Use these answers</button></div></main>;

  if (snapshot.phase === "failed") return <main className="system-quest-refinement">{common}<p className="workflow-error" role="alert">{friendlyQuestPlanningError(snapshot.error)}</p><div className="system-quest-actions"><button className="v2-button button-quiet" onClick={cancel} type="button">Cancel</button><button className="v2-button button-ember" onClick={() => void run(() => retrySystemQuestPlanning(projectId, systemId))} type="button">Retry the same step</button></div></main>;

  if (snapshot.phase === "review" && snapshot.proposal && snapshot.proposalFingerprint) return <main className="system-quest-refinement">{common}<section><h2>Review suggested Steps</h2><p>Only new Steps for {systemTitle} are shown. Saved Steps stay unchanged.</p><div className="workspace-quest-grid system-quest-proposal">{snapshot.proposal.map((quest, index) => <article className="workspace-quest-card" key={`${index}-${quest.title}`}><small>Suggested Step {index + 1}</small><strong>{quest.title}</strong><p>{quest.playerVisibleOutcome}</p><details><summary>Success looks like</summary><ul>{quest.doneWhen.map((item) => <li key={item}>{item}</li>)}</ul><strong>Not included</strong><ul>{quest.excludedScope.map((item) => <li key={item}>{item}</li>)}</ul></details><div className="suggested-step-actions"><button onClick={() => setRevision(`Edit the Step named ${quest.title}: `)} type="button">Edit</button><button onClick={() => void run(() => reviseSystemQuestPlanning(projectId, systemId, `Remove the Step named ${quest.title}. Keep the other suggested Steps.`))} type="button">Remove</button></div></article>)}</div><button className="v2-button button-quiet" onClick={() => setRevision("Add another bounded Step that helps create this Experience: ")} type="button">Add another Step</button></section><label><span>Describe the change</span><input maxLength={500} onChange={(event) => setRevision(event.target.value)} placeholder="Make the first Step smaller…" value={revision} /></label>{(error || snapshot.error) && <p className="workflow-error" role="alert">{error ?? snapshot.error}</p>}<div className="system-quest-actions"><button className="v2-button button-quiet" onClick={cancel} type="button">Cancel</button><button aria-label="Apply Step edits" className="v2-button button-quiet" disabled={busy || revision.trim().length < 3} onClick={() => void run(() => reviseSystemQuestPlanning(projectId, systemId, revision))} title="Apply Step edits" type="button"><span aria-hidden="true">✎</span><span className="sr-only">Apply Step edits</span></button><button className="v2-button button-ember" disabled={busy} onClick={() => void run(() => acceptSystemQuestPlanning(projectId, systemId, snapshot.proposalFingerprint!), true).then((saved) => { if (saved && creationMode) onClose(); })} type="button">{creationMode ? "Create Experience" : singleStep ? "Add Step" : "Confirm Steps"}</button></div></main>;

  if (snapshot.phase === "quests_accepted" && !fileChoiceOpen) return <main className="system-quest-refinement">{common}<section><h2>Steps saved for {systemTitle}</h2><p>Choose one Step to prepare. Forge recommends the next available Step.</p><div className="workspace-quest-grid system-quest-proposal">{systemQuests.map((quest) => {
    const recommended = quest.questId === recommendedQuest?.questId;
    const actionable = quest.status === "available" && !quest.implementation;
    return <article className={`workspace-quest-card state-${quest.status}`} key={quest.questId}><small>{recommended ? "Recommended next · " : ""}{quest.status}</small><strong>{quest.title}</strong><p>{quest.playerVisibleOutcome}</p><button className={recommended ? "v2-button button-ember" : "v2-button button-quiet"} disabled={!actionable} onClick={() => { if (quest.workOrder) void onReady(quest.questId); else { setChosenQuestId(quest.questId); setFileChoiceOpen(true); } }} type="button">{quest.implementation ? "Completed" : quest.status !== "available" ? "Waiting for an earlier Step" : quest.workOrder ? "Open Step" : "Prepare this Step"}</button></article>;
  })}</div></section>{error && <p className="workflow-error" role="alert">{error}</p>}<div className="system-quest-actions"><button className="v2-button button-quiet" onClick={leaveSavedQuests} type="button">Back to Experience</button></div></main>;

  if (snapshot.phase === "work_order_review" && snapshot.workOrder) return <main className="system-quest-refinement">{common}<section className="generated-contract"><header><p className="v2-eyebrow">Check the work plan</p><h2>Files Codex may change</h2></header><div className="generated-contract-grid"><article><h3>Existing files</h3>{snapshot.workOrder.existingFiles.length ? snapshot.workOrder.existingFiles.map((file) => <code className="contract-file" key={file}>{file}</code>) : <p>None.</p>}</article><article><h3>New files</h3>{snapshot.workOrder.newFiles.length ? snapshot.workOrder.newFiles.map((file) => <code className="contract-file" key={file}>{file}</code>) : <p>None.</p>}</article></div><p>Confirming this plan does not start Codex or change the game.</p></section>{(error || snapshot.error) && <p className="workflow-error" role="alert">{error ?? snapshot.error}</p>}<div className="system-quest-actions"><button className="v2-button button-quiet" onClick={cancel} type="button">Change files</button><button className="v2-button button-ember" onClick={() => void run(() => acceptSystemQuestWorkOrder(projectId, systemId, snapshot.workOrder!.fingerprint), true)} type="button">Confirm this plan</button></div></main>;

  if (snapshot.phase === "ready") return <main className="system-quest-refinement">{common}<section className="workspace-empty"><strong>Work plan saved.</strong><p>This Step and its chosen files are saved. Codex has not started and no Godot file changed.</p>{snapshot.workOrder && <code>{[...snapshot.workOrder.existingFiles, ...snapshot.workOrder.newFiles].join(" · ")}</code>}</section><button className="v2-button button-ember" disabled={!snapshot.workOrder} onClick={() => { if (snapshot.workOrder) void onReady(snapshot.workOrder.questId); }} type="button">Open Step</button></main>;

  if (!chosenQuest) return <main className="system-quest-refinement">{common}<p className="workflow-error" role="alert">Choose an available saved Step before selecting files.</p><button className="v2-button button-quiet" onClick={leaveSavedQuests} type="button">Back to Experience</button></main>;

  return <main className="system-quest-refinement">{common}<section><h2>Recommended files for: {chosenQuest.title}</h2><p>{chosenQuest.playerVisibleOutcome}</p><details open><summary>Success looks like</summary><ul>{chosenQuest.doneWhen.map((item) => <li key={item}>{item}</li>)}</ul></details><div className="workspace-recommendation"><strong>Forge suggests starting here</strong><p>Suggestions are based on this Step and the game files already found. They are preselected; advanced users can change them.</p>{recommendation.existingFiles.map((file) => <code className="contract-file" key={file}>{file}</code>)}{recommendation.suggestedNewFile && <button className="v2-button button-quiet" disabled={existingFiles.length + newFiles.length >= 4 || newFiles.includes(recommendation.suggestedNewFile)} onClick={() => setNewFileText((current) => [current.trim(), recommendation.suggestedNewFile].filter(Boolean).join("\n"))} type="button">Add suggested new file: {recommendation.suggestedNewFile}</button>}</div><details><summary>Review Files</summary><fieldset><legend>Existing files</legend>{files.length ? files.map((file) => <label className="system-quest-file" key={file.relativePath}><input checked={existingFiles.includes(file.relativePath)} disabled={!existingFiles.includes(file.relativePath) && existingFiles.length + newFiles.length >= 4} onChange={(event) => setExistingFiles((current) => event.target.checked ? [...current, file.relativePath] : current.filter((item) => item !== file.relativePath))} type="checkbox" /><code>{file.relativePath}</code>{recommendation.existingFiles.includes(file.relativePath) && <small>Suggested</small>}</label>) : <p>No eligible existing files were found under scenes/ or scripts/.</p>}</fieldset><label><span>New files</span><textarea onChange={(event) => setNewFileText(event.target.value)} placeholder="scripts/welcome_beacon.gd" rows={3} value={newFileText} /><small>One path per line or comma. The parent folder must already exist.</small></label></details></section>{error && <p className="workflow-error" role="alert">{error}</p>}<div className="system-quest-actions"><button className="v2-button button-quiet" onClick={leaveSavedQuests} type="button">Back to Experience</button><button className="v2-button button-ember" disabled={busy || existingFiles.length + newFiles.length < 1 || existingFiles.length + newFiles.length > 4} onClick={() => void run(() => reviewSystemQuestWorkOrder(projectId, systemId, existingFiles, newFiles, chosenQuest.questId))} type="button">Use recommended files</button></div></main>;
}
