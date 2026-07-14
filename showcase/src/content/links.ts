export interface PublicLinks {
  repository: string;
  demoVideo?: string | undefined;
  liveSite?: string | undefined;
  devpost?: string | undefined;
}

const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env ?? {};
const configured = (value: string | undefined): string | undefined => value?.trim() || undefined;

export const publicLinks: PublicLinks = {
  repository: "https://github.com/MechanizedIT/forge-game-dev",
  demoVideo: configured(env.VITE_SHOWCASE_DEMO_URL),
  liveSite: configured(env.VITE_SHOWCASE_LIVE_URL),
  devpost: configured(env.VITE_SHOWCASE_DEVPOST_URL),
};

export const demoPoster = configured(env.VITE_SHOWCASE_DEMO_POSTER) ?? "/hero-workshop.webp";

export const linkLabels = {
  demoPending: "Demo video coming soon",
  livePending: "Live showcase URL pending",
  devpostPending: "Devpost submission pending",
} as const;
