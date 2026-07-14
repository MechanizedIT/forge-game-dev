# Future Cloud and Local Companion Architecture

This note describes a possible future direction, not a Build Week capability.

A hosted Forge account and control plane could coordinate optional project metadata, device status, roadmap views, and auditable requests. A secure local Forge companion would pair explicitly with that service and retain control of local capabilities.

The boundary should remain:

```text
Hosted control plane
  → explicit, auditable request
  → secure device pairing and capability check
  → local Forge companion
  → local project files, Codex, Godot, Git, and OS actions
  → evidence and approved summary returned
```

Project files should remain local by default. Every remote request should declare its purpose, allowed capability, project scope, expiry, and expected evidence. The local companion should reject unpaired, stale, ambiguous, or over-broad requests. Optional cloud project metadata should never become authority for local source state without an explicit reconciliation and creator decision.

No hosted account, pairing, synchronization, authentication, remote execution, or cloud project state is implemented in Forge v0.2 or this showcase.
