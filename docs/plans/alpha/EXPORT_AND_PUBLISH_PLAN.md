# Export and Publish Plan

## Recommendation

Add **Open in Godot** only if it remains an isolated tail of Task A. Do not make Web export a proof-alpha dependency. After the core loop and fresh proof game pass, spend at most one hour on a read-only export-readiness probe. If a matching pinned template and controlled preset are not already available, stop and capture native gameplay.

## Open in Godot editor

Official Godot command-line documentation defines `-e/--editor` to start the editor and `--path <directory>` to select a directory containing `project.godot`: [Command line tutorial](https://docs.godotengine.org/en/stable/tutorials/editor/command_line_tutorial.html).

Safe host action:

```text
POST /api/projects/:projectId/editor
body: {}
server resolves registered canonical path
server resolves pinned verified Godot executable
server launches ["--editor", "--path", canonicalProjectPath]
```

Rules:

- same-origin request and safe project ID only;
- no caller path, executable, argument, scene, or command;
- revalidate registry containment and `project.godot` before launch;
- track transient state by project ID: `idle | launching | running | failed`;
- allow different registered projects; reject a duplicate launch while the same editor process is known running;
- use a visible detached Windows process with bounded spawn-error capture;
- never mutate roadmap, verification, Git, recency, or project files;
- UI actions remain **Play**, **Open in Godot**, **Open Folder**, with an adjacent plain error/status.

This is a small P1 convenience, not evidence that Forge edits through the Godot editor. If reliable already-running detection or process cleanup expands, cut it from Task A.

## Current export feasibility

Repository and generated-project inspection found no `export_presets.cfg`, export-template bootstrap, export command, package manifest, or Web hosting path. Godot's official [Exporting projects](https://docs.godotengine.org/en/stable/tutorials/export/exporting_projects.html) states that command-line `--export-release` still requires a named export preset and installed matching templates. The preset can be committed, while credentials belong in `.godot/export_credentials.cfg` and generally must not be committed.

Godot's [Web export documentation](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html) recommends the newer single-threaded Web export for compatibility; threaded exports require secure context/cross-origin isolation headers. Web output is multiple served files and browser behavior still needs testing.

Therefore Web export is technically possible for Signal Sweep, but **not realistic as a guaranteed pre-freeze feature**.

## One-hour readiness gate

Run only after Task A, Task B, and the proof quest pass:

1. Check whether the exact pinned Godot 4.7 Web export template is already installed; do not download/install during the probe.
2. Check for an owner-approved controlled single-threaded `Web` preset; do not hand-edit a generated project's state speculatively.
3. If both exist, export to a local ignored `build/web/` through a Forge-owned fixed command and output path.
4. Serve locally, test current Edge/Chrome load, input, relay behavior, audio assumptions, refresh, console errors, and package inventory.
5. Record template/preset/Godot version and hashes in a deterministic package manifest.

Any missing template, preset design debate, engine-version mismatch, browser failure, service-worker/header issue, or need to modify gameplay kills the attempt. No feature work crosses the freeze.

## Ownership

| Step | Owner | Before submission? |
| --- | --- | --- |
| Validate project health | Deterministic Forge/Godot | Yes, P0 |
| Launch editor | Deterministic host action | Optional P1 |
| Report export readiness | Deterministic checklist/probe | P2 after core |
| Maintain preset/template supply | Future deterministic Forge owner | No unless readiness gate is already green |
| Export local package/manifest | Future fixed Forge command | Optional P2 |
| Open export folder | Existing controlled folder pattern, dedicated output only | Optional P2 |
| Choose host/account/license | Owner | Yes, manual when needed |
| Deploy/public publish | Owner with explicit approval | Never automatic |
| Itch/Steam/store account and credentials | Owner outside Forge | Deferred |
| Showcase embed/link | Typed post-freeze content refresh | Only after evidence/privacy review |

## Guaranteed native-capture path

Use pinned Godot Play from Project World, capture a 15–25 second Signal Sweep run, and pair it with Forge screenshots of contract, verification, completion, Chronicle/Git, and restart. Store the original locally, add only an optimized approved derivative to public evidence, and record provenance/consent. The showcase may link to a public video supplied by the owner; it does not need an embedded playable Web build to prove the product.

## Publishing guidance

Before publication, the owner confirms repository visibility, license, video/Devpost URLs, tester permissions, and whether a game build may be public. Forge may generate a checklist and deterministic manifest. It must not create accounts, collect credentials, log into services, upload, or deploy without explicit authorization.
