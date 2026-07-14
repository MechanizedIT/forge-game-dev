# Showcase Content Refresh

The showcase deliberately keeps public truth in a few typed sources.

1. Update `src/content/release.ts` only when the represented product release changes. Confirm the tag and source commit directly with Git.
2. Update public URLs in `src/content/links.ts` or through the documented build variables.
3. Change interface concepts in `src/content/interface-tour.ts` only when the operational product vocabulary changes.
4. Update `src/content/walkthroughs.ts` from a completed, reviewed workflow. Each path must stay between one and seven steps.
5. Add evidence through `src/content/evidence.ts` and follow [EVIDENCE.md](EVIDENCE.md).
6. Keep every `working-now` claim in `src/content/vision.ts` linked to current repository evidence. Move unimplemented ideas to `next` or `future`.
7. Keep proof counts only in `src/content/proof.ts`; never copy the same numeric facts into another showcase source.
8. Run `npm run showcase:check` and `npm run showcase:review`.

Do not copy private plans, raw transcripts, local paths, credentials, `/feedback` IDs, or visitor-specific content into the public site.
