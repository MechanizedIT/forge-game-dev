# Repository Context Tool Evaluation

This note evaluates navigation aids only. None is installed or added as a Forge dependency by this task. The curated [repository guide](../REPOSITORY_GUIDE.md), source/contracts, persisted artifacts, tests, and Git remain authoritative.

## Graphify

[Graphify](https://graphify.com/docs) builds an on-device, queryable knowledge graph from repository content and exposes CLI/MCP queries. Its relationship-oriented output is the best match for Forge questions such as “which service mutates this artifact?” or “what consumes the registry?” The project also labels graph relationships by confidence and emits derived graph/report files.

Potential value: faster cross-subsystem discovery, especially around host routes, project creation, registry, and generated-world consumers.

Risks for Forge now: installation and generated graph state add another moving part during Build Week; inferred edges can be mistaken for authority; broad indexing can pull in historical evidence, generated output, caches, or user-local artifacts; freshness must be measured after refactors.

Verdict: best candidate for one bounded post-Build-Week experiment, not for the judge-path repository today.

## Repomix

[Repomix](https://repomix.com/guide/) packs selected repository content into one AI-friendly output and supports include/ignore controls. It is useful for a one-off external review or handoff when the recipient cannot browse the checkout.

Potential value: portable, reproducible context bundle with a deliberately narrow include set.

Risks for Forge: “whole repository” packing works against the goal of loading only relevant context; a large snapshot obscures authoritative ownership, becomes stale immediately, and may duplicate historical evidence or generated files. It provides aggregation, not state-owner or mutation-boundary semantics.

Verdict: optional for an explicitly scoped export, not the default navigation layer and not a committed generated index.

## Aider-style repository maps

[Aider's repository map](https://aider.chat/docs/repomap.html) extracts important symbols/signatures and ranks relevant portions of a dependency graph to a token budget. This is a strong lightweight model for code-first orientation: show key definitions and imports, then open only selected files.

Potential value: low-volume symbol context for implementation tasks, especially in TypeScript modules with clear imports/exports.

Risks for Forge: symbol graphs do not capture persisted-artifact authority, human approval gates, truthful UI claims, or historical architecture decisions. A generated map must remain derived and be refreshed from source.

Verdict: adopt the principle—ranked, bounded symbol context—without adding another tool during Build Week.

## Recommended bounded experiment

After Build Week, test Graphify in a disposable branch or separate checkout with no production dependency or committed output by default.

1. Index only [source](../../src), [tests](../../tests), the two Godot fixture manifests/scripts under [fixtures](../../fixtures/godot), and the curated [repository guide](../REPOSITORY_GUIDE.md). Exclude `node_modules`, `dist`, `.git`, `.tools`, local workspaces, screenshots, and dated evidence/closeouts.
2. Ask five fixed questions: sample completion owner; blueprint-to-creation boundary; registry writer/readers; generated Chronicle versus idea activity; Godot verifier consumers.
3. Compare every answer with `rg`, the ownership matrix, and protecting tests. Record unsupported, inferred, missing, and stale edges.
4. Make one small branch-only rename or import change, rebuild, and measure whether the answer updates without retaining stale relationships.
5. Keep the tool only if all authoritative owners are identified, inferred claims are visibly distinguishable, exclusions hold, refresh is repeatable, and total navigation context is materially smaller than focused manual search.

Do not let graph output update runtime artifacts, replace local `AGENTS.md`, or become required for the judge path. If the experiment succeeds, document a pinned optional developer command and a deletion/freshness policy in a separately approved task.
