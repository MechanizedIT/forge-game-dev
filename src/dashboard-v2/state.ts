export const workshopViews = ["launchpad", "sample_world", "create_placeholder"] as const;

export type WorkshopView = (typeof workshopViews)[number];
export type LaunchChoice = "explore_sample" | "create_game";

export function viewForLaunchChoice(choice: LaunchChoice): WorkshopView {
  return choice === "explore_sample" ? "sample_world" : "create_placeholder";
}

export function returnToLaunchpad(): WorkshopView {
  return "launchpad";
}
