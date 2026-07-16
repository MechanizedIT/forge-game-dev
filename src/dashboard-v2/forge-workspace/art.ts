const buildingArt = new URL("./assets/run-jump-building.png", import.meta.url).href;
const regionArt = new URL("./assets/crash-landing-region.png", import.meta.url).href;
const townArt = new URL("./assets/wreck-site-town.png", import.meta.url).href;
const worldArt = new URL("./assets/rust-runner-world.png", import.meta.url).href;

export const forgeArt: Record<string, string> = {
  "world-rust-runner": worldArt,
  "region-crash": regionArt,
  "region-scrap": regionArt,
  "region-crystal": worldArt,
  "region-neon": buildingArt,
  "town-wreck": townArt,
  "town-hopper": regionArt,
  "town-salvage": townArt,
  "town-relay": buildingArt,
  "building-run": buildingArt,
  "building-dodge": buildingArt,
  "building-collect": townArt,
  "building-upgrade": buildingArt,
  "part-run": buildingArt,
  "part-jump": buildingArt,
  "part-coyote": regionArt,
  "part-obstacles": buildingArt,
  default: worldArt,
};

export function imageFor(ref: string): string {
  return forgeArt[ref] ?? forgeArt.default!;
}
