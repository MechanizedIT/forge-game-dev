import { useMemo, useState, type FormEvent } from "react";

import {
  confirmGeneratedQuest,
  launchGeneratedProject,
  mutateForgePresentation,
  openCreatedProjectFolder,
  uploadForgePresentationImage,
} from "../../dashboard/api.js";
import type {
  ForgePlaytestResult,
  ForgeTunable,
  GeneratedProjectWorldSnapshot,
} from "../../generated-project-world/shared.js";
import { Icon } from "./components.js";
import type { ForgeEntity } from "./model.js";

function relatedFiles(
  snapshot: GeneratedProjectWorldSnapshot,
  entity: ForgeEntity,
): string[] {
  if (entity.kind !== "part") return [];
  const native = snapshot.systemQuestPlan?.systems
    .flatMap((system) => system.quests)
    .find((step) => step.questId === entity.id);
  return native?.workOrder
    ? [...native.workOrder.existingFiles, ...native.workOrder.newFiles]
    : entity.relatedFiles;
}

export function ContextualPlaytest({
  context,
  onClose,
  onFollowUp,
  onSnapshot,
  snapshot,
}: {
  context: ForgeEntity;
  onClose: () => void;
  onFollowUp: (
    result: "needs_change" | "broken",
    note: string,
    files: string[],
  ) => void;
  onSnapshot: (snapshot: GeneratedProjectWorldSnapshot) => void;
  snapshot: GeneratedProjectWorldSnapshot;
}) {
  const [launched, setLaunched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const files = relatedFiles(snapshot, context);
  const run =
    context.kind === "part"
      ? (snapshot.quests.find((item) => item.questId === context.id)?.run ??
        null)
      : null;
  const canComplete =
    context.kind === "part" && run?.phase === "waiting_for_playtest";

  const launch = async () => {
    setBusy(true);
    try {
      await launchGeneratedProject(snapshot.project.projectId);
      setLaunched(true);
      setError(null);
    } catch (next) {
      setError(next instanceof Error ? next.message : String(next));
    } finally {
      setBusy(false);
    }
  };
  const record = async (result: ForgePlaytestResult) => {
    setBusy(true);
    try {
      if (result === "worked" && canComplete) {
        await confirmGeneratedQuest(
          snapshot.project.projectId,
          context.id,
          "worked",
        );
      }
      const next = await mutateForgePresentation(snapshot.project.projectId, {
        action: "record_feedback",
        entityId: context.id,
        result,
        note:
          note ||
          (result === "worked" ? "Confirmed this Step works in the game." : ""),
        relatedFiles: files,
      });
      onSnapshot(next);
      if (result === "needs_change" || result === "broken")
        onFollowUp(result, note, files);
      else if (result === "worked") onClose();
      else setLaunched(false);
    } catch (next) {
      setError(next instanceof Error ? next.message : String(next));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="forgie-backdrop" role="presentation">
      <section aria-modal="true" className="playtest-dialog" role="dialog">
        <header>
          <div>
            <p className="panel-kicker">
              Test{" "}
              {context.kind === "world"
                ? "World"
                : context.kind === "building"
                  ? "Experience"
                  : "Step"}
            </p>
            <h2>{context.name}</h2>
          </div>
          <button aria-label="Close playtest" onClick={onClose} type="button">
            <Icon name="close" />
          </button>
        </header>
        {!launched ? (
          <>
            <p>
              Launch the current Godot World. You can test it even when this
              Step has not been built yet.
            </p>
            {run?.phase === "waiting_for_playtest" && (
              <p className="workflow-notice">
                This Step has a checked result ready for your playtest.
              </p>
            )}
            <button
              className="forge-primary-button wide"
              disabled={busy}
              onClick={() => void launch()}
              type="button"
            >
              <Icon name="play" /> {busy ? "Opening Godot…" : "Launch Game"}
            </button>
          </>
        ) : (
          <>
            <p>Play for a moment, then tell Forgie what happened.</p>
            <label className="playtest-note">
              <span>What did you notice or want changed?</span>
              <textarea
                onChange={(event) => setNote(event.target.value)}
                placeholder="The jump works, but the landing feels too slow…"
                value={note}
              />
            </label>
            <div className="playtest-results">
              <button
                className="forge-primary-button"
                disabled={busy}
                onClick={() => void record("worked")}
                type="button"
              >
                Worked
              </button>
              <button
                disabled={busy}
                onClick={() => void record("needs_change")}
                type="button"
              >
                Needs a Change
              </button>
              <button
                disabled={busy}
                onClick={() => void record("broken")}
                type="button"
              >
                Broken
              </button>
              <button
                disabled={busy}
                onClick={() => void record("not_sure")}
                type="button"
              >
                Not Sure
              </button>
            </div>
            {!canComplete && context.kind === "part" && (
              <small>
                Worked records this playtest. It completes the Step only when a
                checked build is waiting for confirmation.
              </small>
            )}
          </>
        )}
        {error && (
          <p className="workflow-error" role="alert">
            {error}
          </p>
        )}
      </section>
    </div>
  );
}

export function RealAssetsScreen({
  current,
  onSnapshot,
  snapshot,
}: {
  current: ForgeEntity;
  onSnapshot: (snapshot: GeneratedProjectWorldSnapshot) => void;
  snapshot: GeneratedProjectWorldSnapshot;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<
    "all" | "images" | "audio" | "scenes" | "scripts" | "other"
  >("all");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assets = useMemo(
    () =>
      (snapshot.assets ?? []).filter(
        (asset) =>
          (filter === "all" || asset.category === filter) &&
          `${asset.name} ${asset.relativePath}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [filter, query, snapshot.assets],
  );
  const choose = async (relativePath: string) => {
    setBusy(true);
    try {
      onSnapshot(
        await mutateForgePresentation(snapshot.project.projectId, {
          action: "choose_image",
          entityId: current.id,
          relativePath,
        }),
      );
      setError(null);
    } catch (next) {
      setError(next instanceof Error ? next.message : String(next));
    } finally {
      setBusy(false);
    }
  };
  const upload = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      onSnapshot(
        await uploadForgePresentationImage(
          snapshot.project.projectId,
          current.id,
          file,
        ),
      );
      setError(null);
    } catch (next) {
      setError(next instanceof Error ? next.message : String(next));
    } finally {
      setBusy(false);
    }
  };
  const restore = async () => {
    setBusy(true);
    try {
      onSnapshot(
        await mutateForgePresentation(snapshot.project.projectId, {
          action: "restore_image",
          entityId: current.id,
        }),
      );
    } catch (next) {
      setError(next instanceof Error ? next.message : String(next));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="tool-screen assets-screen">
      <header className="tool-screen-header">
        <div>
          <p className="screen-kicker">World files</p>
          <h1>Assets</h1>
          <p>
            Browse the World’s images, audio, scenes, scripts, and other useful
            files.
          </p>
        </div>
        <div className="asset-image-actions">
          <label className="forge-primary-button">
            Upload image
            <input
              accept="image/png,image/jpeg,image/webp"
              disabled={busy}
              hidden
              onChange={(event) => void upload(event.target.files?.[0])}
              type="file"
            />
          </label>
          <button disabled={busy} onClick={() => void restore()} type="button">
            Restore default image
          </button>
        </div>
      </header>
      <div className="atlas-toolbar">
        <label>
          <Icon name="search" />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search Assets"
            value={query}
          />
        </label>
        <div>
          {(
            ["all", "images", "audio", "scenes", "scripts", "other"] as const
          ).map((category) => (
            <button
              aria-pressed={filter === category}
              key={category}
              onClick={() => setFilter(category)}
              type="button"
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      {error && (
        <p className="workflow-error" role="alert">
          {error}
        </p>
      )}
      <div className="asset-grid">
        {assets.map((asset) => (
          <article className="asset-card" key={asset.relativePath}>
            {asset.previewUrl ? (
              <img alt="" src={asset.previewUrl} />
            ) : (
              <span className="atlas-type-icon">
                <Icon
                  name={asset.category === "scripts" ? "build" : "folder"}
                />
              </span>
            )}
            <div>
              <small>{asset.category}</small>
              <strong>{asset.name}</strong>
              <code>{asset.relativePath}</code>
            </div>
            <div>
              {asset.category === "images" && (
                <button
                  disabled={busy}
                  onClick={() => void choose(asset.relativePath)}
                  type="button"
                >
                  Use for{" "}
                  {current.kind === "world"
                    ? "World"
                    : current.kind === "building"
                      ? "Experience"
                      : "Step"}
                </button>
              )}
              <button
                onClick={() =>
                  void openCreatedProjectFolder(snapshot.project.projectId)
                }
                type="button"
              >
                Open location
              </button>
            </div>
          </article>
        ))}
      </div>
      {!assets.length && (
        <p className="column-empty">No matching Assets were found.</p>
      )}
    </section>
  );
}

export function RealEntityEditScreen({
  entity,
  onCancel,
  onSnapshot,
  snapshot,
}: {
  entity: ForgeEntity;
  onCancel: () => void;
  onSnapshot: (snapshot: GeneratedProjectWorldSnapshot) => void;
  snapshot: GeneratedProjectWorldSnapshot;
}) {
  const [name, setName] = useState(entity.name);
  const [description, setDescription] = useState(entity.description);
  const [outcome, setOutcome] = useState(entity.outcome);
  const [success, setSuccess] = useState(entity.acceptanceCriteria.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      onSnapshot(
        await mutateForgePresentation(snapshot.project.projectId, {
          action: "edit_entity",
          entityId: entity.id,
          name,
          description,
          outcome,
          acceptanceCriteria: success
            .split(/\n/u)
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      );
      onCancel();
    } catch (next) {
      setError(next instanceof Error ? next.message : String(next));
    } finally {
      setBusy(false);
    }
  };
  const label =
    entity.kind === "world"
      ? "World"
      : entity.kind === "building"
        ? "Experience"
        : "Step";
  return (
    <section className="tool-screen entity-form-screen">
      <header>
        <p className="screen-kicker">Edit {label}</p>
        <h1>{entity.name}</h1>
      </header>
      <form onSubmit={(event) => void submit(event)}>
        <label>
          <span>{label} name</span>
          <input
            maxLength={80}
            onChange={(event) => setName(event.target.value)}
            value={name}
          />
        </label>
        <label>
          <span>
            {label === "Step" ? "What needs to change" : "Description"}
          </span>
          <textarea
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>
        <label>
          <span>
            {label === "Experience"
              ? "Playable outcome"
              : label === "Step"
                ? "Intended change"
                : "World outcome"}
          </span>
          <textarea
            onChange={(event) => setOutcome(event.target.value)}
            value={outcome}
          />
        </label>
        <label>
          <span>
            {label === "Step" ? "What success looks like" : "Key outcomes"}
          </span>
          <textarea
            onChange={(event) => setSuccess(event.target.value)}
            value={success}
          />
        </label>
        {error && (
          <p className="workflow-error" role="alert">
            {error}
          </p>
        )}
        <footer>
          <button disabled={busy} onClick={onCancel} type="button">
            Cancel
          </button>
          <button
            className="forge-primary-button"
            disabled={busy || !name.trim() || !outcome.trim()}
            type="submit"
          >
            Save {label}
          </button>
        </footer>
      </form>
    </section>
  );
}

export function TuningSection({
  entity,
  onSnapshot,
  snapshot,
}: {
  entity: ForgeEntity;
  onSnapshot: (snapshot: GeneratedProjectWorldSnapshot) => void;
  snapshot: GeneratedProjectWorldSnapshot;
}) {
  const existing = (snapshot.presentation?.tunables ?? []).filter(
    (item) => item.entityId === entity.id,
  );
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [filePath, setFilePath] = useState(
    entity.relatedFiles[0] ?? "scripts/main.gd",
  );
  const [propertyName, setPropertyName] = useState("");
  const [value, setValue] = useState(0);
  const [minimum, setMinimum] = useState(0);
  const [maximum, setMaximum] = useState(100);
  const save = async (tunable: ForgeTunable) =>
    onSnapshot(
      await mutateForgePresentation(snapshot.project.projectId, {
        action: "save_tunable",
        tunable,
      }),
    );
  const add = async () => {
    const tunableId = `${entity.id}-${propertyName}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "");
    await save({
      tunableId,
      entityId: entity.id,
      label,
      filePath,
      propertyName,
      valueType: "number",
      value,
      defaultValue: value,
      minimum,
      maximum,
    });
    setAdding(false);
  };
  return (
    <section className="detail-card tuning-section">
      <header>
        <div>
          <p className="panel-kicker">Tuning</p>
          <h2>Feel and balance</h2>
        </div>
        <button onClick={() => setAdding((open) => !open)} type="button">
          {adding ? "Cancel" : "Add value"}
        </button>
      </header>
      {existing.map((tunable) => (
        <label className="tuning-row" key={tunable.tunableId}>
          <span>
            <strong>{tunable.label}</strong>
            <small>
              {tunable.filePath} · {tunable.propertyName}
            </small>
          </span>
          {tunable.valueType === "boolean" ? (
            <input
              checked={Boolean(tunable.value)}
              onChange={(event) =>
                void save({ ...tunable, value: event.target.checked })
              }
              type="checkbox"
            />
          ) : (
            <>
              <input
                max={tunable.maximum}
                min={tunable.minimum}
                onChange={(event) =>
                  void save({ ...tunable, value: Number(event.target.value) })
                }
                type="range"
                value={Number(tunable.value)}
              />
              <input
                max={tunable.maximum}
                min={tunable.minimum}
                onChange={(event) =>
                  void save({ ...tunable, value: Number(event.target.value) })
                }
                type="number"
                value={Number(tunable.value)}
              />
            </>
          )}
          <button
            onClick={() =>
              void mutateForgePresentation(snapshot.project.projectId, {
                action: "reset_tunable",
                tunableId: tunable.tunableId,
              }).then(onSnapshot)
            }
            type="button"
          >
            Reset
          </button>
        </label>
      ))}
      {adding && (
        <div className="tuning-add">
          <label>
            <span>Label</span>
            <input
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Run speed"
              value={label}
            />
          </label>
          <label>
            <span>Script or settings file</span>
            <input
              onChange={(event) => setFilePath(event.target.value)}
              value={filePath}
            />
          </label>
          <label>
            <span>Property name</span>
            <input
              onChange={(event) => setPropertyName(event.target.value)}
              placeholder="run_speed"
              value={propertyName}
            />
          </label>
          <label>
            <span>Default value</span>
            <input
              onChange={(event) => setValue(Number(event.target.value))}
              type="number"
              value={value}
            />
          </label>
          <label>
            <span>Minimum</span>
            <input
              onChange={(event) => setMinimum(Number(event.target.value))}
              type="number"
              value={minimum}
            />
          </label>
          <label>
            <span>Maximum</span>
            <input
              onChange={(event) => setMaximum(Number(event.target.value))}
              type="number"
              value={maximum}
            />
          </label>
          <button
            className="forge-primary-button"
            disabled={
              !label.trim() || !propertyName.trim() || maximum <= minimum
            }
            onClick={() => void add()}
            type="button"
          >
            Save tuning value
          </button>
        </div>
      )}
      {!existing.length && !adding && (
        <p>
          Add an explicit World value such as speed, jump height, gravity,
          spacing, or volume. Forge stores the link and value in this World’s
          metadata.
        </p>
      )}
      <button
        className="forge-secondary-button"
        onClick={() => void launchGeneratedProject(snapshot.project.projectId)}
        type="button"
      >
        <Icon name="play" /> Test
      </button>
    </section>
  );
}

export function RealRepairScreen({
  context,
  onContinue,
  onSnapshot,
  snapshot,
}: {
  context: ForgeEntity;
  onContinue: (note: string, files: string[]) => void;
  onSnapshot: (snapshot: GeneratedProjectWorldSnapshot) => void;
  snapshot: GeneratedProjectWorldSnapshot;
}) {
  const [expected, setExpected] = useState(context.outcome);
  const [actual, setActual] = useState("");
  const [files, setFiles] = useState(relatedFiles(snapshot, context));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const note = `Expected: ${expected.trim()}\nActual: ${actual.trim()}`;
    onSnapshot(
      await mutateForgePresentation(snapshot.project.projectId, {
        action: "record_feedback",
        entityId: context.id,
        result: "broken",
        note,
        relatedFiles: files,
      }),
    );
    onContinue(note, files);
  };
  return (
    <section className="tool-screen repair-screen">
      <header className="tool-screen-header">
        <div>
          <p className="screen-kicker">Repair with the existing Step runner</p>
          <h1>Repair {context.name}</h1>
          <p>
            Forgie will turn this into a small follow-up Step, keep the likely
            files, and use the same checkpoint, Codex, checks, playtest, and
            undo path.
          </p>
        </div>
      </header>
      <form className="repair-intake" onSubmit={(event) => void submit(event)}>
        <label>
          <span>What should happen?</span>
          <textarea
            onChange={(event) => setExpected(event.target.value)}
            value={expected}
          />
        </label>
        <label>
          <span>What happened instead?</span>
          <textarea
            onChange={(event) => setActual(event.target.value)}
            value={actual}
          />
        </label>
        <label>
          <span>Likely files</span>
          <textarea
            onChange={(event) =>
              setFiles(
                event.target.value
                  .split(/[\n,]/u)
                  .map((item) => item.trim())
                  .filter(Boolean)
                  .slice(0, 4),
              )
            }
            value={files.join("\n")}
          />
        </label>
        <button
          className="forge-primary-button"
          disabled={!expected.trim() || !actual.trim()}
          type="submit"
        >
          <Icon name="repair" /> Prepare Repair Step
        </button>
      </form>
    </section>
  );
}
