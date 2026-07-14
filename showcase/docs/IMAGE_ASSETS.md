# Image-Generation Asset Record

## Hero workshop illustration

- **Final path:** `showcase/public/hero-workshop.webp`
- **Tool:** Built-in OpenAI image-generation tool through the `imagegen` skill
- **Classification:** Decorative generated illustration
- **Evidence:** No. It is explicitly labelled decorative in the public hero.
- **Post-processing:** Inspected for prohibited content, resized to `1536×1024`, and encoded as WebP. No semantic editing or compositing was performed.

### Final prompt

```text
Use case: stylized-concept
Asset type: wide landing-page hero illustration for the Forge public showcase
Primary request: Show a game idea becoming a navigable project world through a restrained industrial science-fiction workshop. A warm ember path of connected quest nodes begins at the lower left and moves through graphite machinery toward a small cyan Forge Companion energy core near the center-right; subtle violet possibility nodes wait farther ahead and one mint verified node glows behind. The composition should communicate human direction and machine execution working together without depicting people literally.
Scene/backdrop: dark graphite, charcoal, and gunmetal architectural workspace with an abstract game-world map, machined plates, fine circuit-like route lines, and deep atmospheric negative space
Style/medium: premium cinematic 3D concept illustration, restrained industrial science fiction, tactile metal and glass, sophisticated and warm rather than militaristic
Composition/framing: wide 3:2 landscape, visual motion from lower left to center-right, generous clean negative space along the left/top-left for adjacent hero copy, no central symmetry, no interface frame
Lighting/mood: low-key graphite environment, ember creator-intent lighting, cyan system light, subtle violet future glow, mint completion accent; focused, credible, inviting
Color palette: #080c11, #111820, #34414d, ember orange, cyan, restrained violet, mint
Materials/textures: brushed gunmetal, dark glass, precise luminous route lines, subtle wear, no fantasy ornament
Constraints: no text, no letters, no numbers, no logos, no fake application screens, no fake gameplay, no characters, no hands, no copyrighted characters, no watermark, no proof badges, no terminal, no HUD overlays, no stock-photo look
Avoid: generic SaaS gradient, steampunk, fantasy, pixel art, weapons, dystopian city, excessive neon, busy visual noise
```

## Code-native assets

- `showcase/public/og-forge.svg` is the deterministic Open Graph card source with exact title text and a roadmap motif. `showcase/public/og-forge.png` is its browser-rendered social-card output; regenerate it with `npm run showcase:og`.
- `showcase/public/favicon.svg` is the deterministic Forge diamond/core favicon.

Both are product illustrations, not evidence.
