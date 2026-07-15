import path from "node:path";

import { repositoryRoot } from "../demo/paths.js";
import { ensurePinnedGodot } from "./bootstrap.js";
import { runCaptured, type CapturedProcessResult } from "./process.js";

export const gravityOrbPresenceProfileId = "gravity_orb_presence_v1" as const;
export const gravityOrbPresenceSuccessMarker = "FORGE_GRAVITY_ORB_PRESENCE_V1_OK" as const;
export const relayActivationProfileId = "relay_activation_v1" as const;
export const relayActivationSuccessMarker = "FORGE_RELAY_ACTIVATION_V1_OK" as const;

export interface GeneratedMechanicVerificationResult {
  profile: typeof gravityOrbPresenceProfileId;
  godotVersion: string;
  successMarker: typeof gravityOrbPresenceSuccessMarker;
  output: string;
}

export async function verifyRelayActivation(options: {
  projectPath: string;
  forgeHome: string;
  resolveGodot?: typeof ensurePinnedGodot;
  run?: (executable: string, args: string[]) => CapturedProcessResult;
}): Promise<{ profile: typeof relayActivationProfileId; godotVersion: string; successMarker: typeof relayActivationSuccessMarker; output: string }> {
  const godot = await (options.resolveGodot ?? ensurePinnedGodot)({ forgeHome: options.forgeHome });
  const profilePath = path.join(repositoryRoot, "src", "godot", "verification-profiles", "relay_activation_v1.gd");
  const result = (options.run ?? runCaptured)(godot.executable, ["--headless", "--path", path.resolve(options.projectPath), "--script", profilePath]);
  const output = result.output.replaceAll(path.resolve(options.projectPath), ".").slice(-8_000).trim();
  const fatal = /(?:SCRIPT ERROR|PARSE ERROR|Failed loading resource|Failed to load script|No loader found|ERROR:)/iu.test(output);
  if (result.status !== 0 || fatal || !output.includes(relayActivationSuccessMarker)) throw new Error(`Relay activation mechanic verification failed (${result.status}): ${output || "no output"}`);
  return { profile: relayActivationProfileId, godotVersion: godot.version, successMarker: relayActivationSuccessMarker, output };
}

export async function verifyGravityOrbPresence(options: {
  projectPath: string;
  forgeHome: string;
  resolveGodot?: typeof ensurePinnedGodot;
  run?: (executable: string, args: string[]) => CapturedProcessResult;
}): Promise<GeneratedMechanicVerificationResult> {
  const godot = await (options.resolveGodot ?? ensurePinnedGodot)({ forgeHome: options.forgeHome });
  const profilePath = path.join(repositoryRoot, "src", "godot", "verification-profiles", "gravity_orb_presence_v1.gd");
  const result = (options.run ?? runCaptured)(godot.executable, [
    "--headless",
    "--path",
    path.resolve(options.projectPath),
    "--script",
    profilePath,
  ]);
  const output = result.output.replaceAll(path.resolve(options.projectPath), ".").slice(-8_000).trim();
  const fatal = /(?:SCRIPT ERROR|PARSE ERROR|Failed loading resource|Failed to load script|No loader found|ERROR:)/iu.test(output);
  if (result.status !== 0 || fatal || !output.includes(gravityOrbPresenceSuccessMarker)) {
    throw new Error(`Gravity orb mechanic verification failed (${result.status}): ${output || "no output"}`);
  }
  return {
    profile: gravityOrbPresenceProfileId,
    godotVersion: godot.version,
    successMarker: gravityOrbPresenceSuccessMarker,
    output,
  };
}
