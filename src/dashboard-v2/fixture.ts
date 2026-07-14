export type WorkshopQuestState = "completed" | "available" | "planned" | "future" | "idea";

export interface WorkshopQuestNode {
  id: string;
  title: string;
  summary: string;
  state: WorkshopQuestState;
  region: string;
  recommended?: boolean;
}

export interface SampleWorldFixture {
  projectName: string;
  engine: string;
  status: string;
  currentPlayableState: string;
  quests: WorkshopQuestNode[];
}

export const sampleWorldFixture: SampleWorldFixture = {
  projectName: "Sample Game",
  engine: "Godot 4.7",
  status: "Verified demo",
  currentPlayableState:
    "The player moves with arrow keys or WASD. The enemy is visible, but it stays idle and does not react yet.",
  quests: [
    {
      id: "player-movement",
      title: "Player Movement",
      summary: "Responsive movement is playable and verified.",
      state: "completed",
      region: "Foundation",
    },
    {
      id: "enemy-targeting",
      title: "Enemy Targeting",
      summary: "Make the enemy notice, chase, and release the player.",
      state: "available",
      region: "First Encounter",
      recommended: true,
    },
    {
      id: "game-feel",
      title: "Game Feel",
      summary: "Clarify movement and reactions with small feedback cues.",
      state: "planned",
      region: "Response",
    },
    {
      id: "polish",
      title: "Polish",
      summary: "Shape the scene into a confident playable slice.",
      state: "future",
      region: "Finish",
    },
    {
      id: "new-idea",
      title: "New Idea",
      summary: "Describe another possibility for this game.",
      state: "idea",
      region: "Unplanned",
    },
  ],
};
