# Public Link Configuration

The canonical repository URL is fixed in `src/content/links.ts`:

`https://github.com/MechanizedIT/forge-game-dev`

The demo video, live showcase, and Devpost URLs are optional. When absent, the site renders truthful pending text instead of a broken or fake link.

Configure them either by editing the typed source or by setting these public build-time variables:

- `VITE_SHOWCASE_DEMO_URL`
- `VITE_SHOWCASE_LIVE_URL`
- `VITE_SHOWCASE_DEVPOST_URL`
- `VITE_SHOWCASE_DEMO_POSTER` (defaults to `/hero-workshop.webp`)

Only normal public HTTPS URLs are allowed. Do not use local video paths, private plan or share URLs, account links, signed URLs, credentials, tokens, or `/feedback` IDs. Rebuild and run `npm run showcase:check` after configuration.

The demo supports any normal external URL. YouTube and Vimeo links open in their public player rather than being converted into a local or autoplaying video. No final video file belongs in Git.
