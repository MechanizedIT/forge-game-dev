# Forge Public Showcase

The showcase is a static, content-driven explanation of Forge v0.2. It gives judges and prospective creators a no-install guided replay of the two verified release workflows without running Forge, Codex, GPT-5.6, Godot, Git, or any local project operation.

## Commands

From the repository root:

```powershell
npm run showcase
npm run showcase:build
npm run showcase:check
npm run showcase:review
```

`showcase:build` writes static assets to `showcase/dist/`. `showcase:review` uses the existing pinned Playwright and Microsoft Edge setup at `1440×900`, `768×900`, and `390×844`.

## Structure

- `src/content/release.ts` owns the represented version, tag, source commit, revision, and capture date.
- `src/content/links.ts` owns the public repository and optional demo/live/Devpost URLs.
- `src/content/interface-tour.ts` owns the onboarding vocabulary.
- `src/content/walkthroughs.ts` owns both seven-step guided replays.
- `src/content/evidence.ts` owns public asset provenance and classifications.
- `src/content/vision.ts` owns working-now, next, future, and limitation claims.
- `src/content/proof.ts` is the single numeric proof source for the site.
- `scripts/validate.ts` enforces truth, privacy, evidence, link, static-runtime, and performance boundaries.
- `scripts/review.ts` exercises responsive layout, navigation, focus, video, deep-link, and reduced-motion behavior.

The site imports no operational Forge service or state machine. All visitor interaction is local browser navigation over committed content.

## Documentation

- [Deployment](docs/DEPLOYMENT.md)
- [Content refresh](docs/CONTENT_REFRESH.md)
- [Evidence selection and sanitation](docs/EVIDENCE.md)
- [Public links](docs/PUBLIC_LINKS.md)
- [Generated asset record](docs/IMAGE_ASSETS.md)
- [Static architecture decision](docs/ADR_STATIC_SHOWCASE.md)
- [Future cloud/local companion note](docs/FUTURE_CLOUD_LOCAL_COMPANION.md)
