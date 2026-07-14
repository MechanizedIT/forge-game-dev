# Static and Vercel Deployment

The showcase requires no secrets, database, authentication, functions, runtime API, Supabase, Godot, or Codex. Deployment is intentionally left to the repository owner.

## Build contract

| Setting | Value |
| --- | --- |
| Repository/project root | Repository root |
| Required Node version | `20.19+` or `22.12+` |
| Install command | `npm ci` |
| Build command | `npm run showcase:build` |
| Static output | `showcase/dist` |
| SPA rewrite | None; this is one static route with query-string walkthrough deep links |

Preview the production output locally with:

```powershell
npm run showcase:build
npm run showcase:preview
```

## Vercel

1. Connect the public repository in Vercel only when the owner is ready.
2. Keep **Root Directory** at the repository root.
3. Vercel reads the committed root `vercel.json`, which runs the showcase build and publishes `showcase/dist`.
4. Select a Node version compatible with the root `package.json` engine.
5. Add only the optional public build variables documented in [PUBLIC_LINKS.md](PUBLIC_LINKS.md).
6. Deploy, then set the final live URL and rebuild so canonical metadata points to it.

No custom domain is assumed. No external deployment was performed during Task 8.

## Generic static host

Run `npm ci` and `npm run showcase:build`, then publish the contents of `showcase/dist/` at the site root. The host must serve `index.html`, assets, and WebP/SVG files as ordinary static files. No fallback rewrite is required.
