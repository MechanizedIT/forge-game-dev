# Evidence Selection and Sanitization

Public walkthrough evidence comes from the final Task 7 Edge review. Each asset records a stable public filename, repository source path, application state, task, release commit, capture date, classification, alternative text, and public-safe review status in `src/content/evidence.ts`.

## Selection rules

- Prefer a real final release state over a recreated illustration.
- Use a real screenshot only for the exact state it depicts.
- Keep automated proof and creator playtesting visibly separate.
- Never present the generated hero or a code-native diagram as captured evidence.
- Do not alter screenshot meaning. Resize and WebP compression are allowed.
- Avoid redundant raw captures in `showcase/public/`; the authoritative originals remain under `docs/evidence/`.

## Public-safe review

Before adding an image, inspect it for absolute machine paths, usernames, keys, private URLs, account data, private plan IDs, `/feedback` IDs, developer-only debug output, and unintended personal information. Project identifiers may appear only when they are fixture/rehearsal identifiers already preserved in sanitized repository evidence and do not identify a person or account.

The Task 8 copies were resized to at most 1280 pixels on the longest edge and encoded as WebP without cropping or redaction. Their visual meaning is unchanged.

## Classifications

- **Real Forge application state:** a captured operational application state.
- **Real Godot state:** a captured Godot result or play state.
- **Decorative generated illustration:** atmosphere only; never proof.
- **Code-native product illustration:** an explanatory composition; never captured proof.

Validation rejects any walkthrough evidence entry classified as an illustration and rejects missing internal source references.
