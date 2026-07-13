export const pinnedGodotBuild = {
  version: "4.7-stable",
  artifact: "Godot_v4.7-stable_win64.exe.zip",
  archiveBytes: 83_764_371,
  downloadUrl:
    "https://github.com/godotengine/godot-builds/releases/download/4.7-stable/Godot_v4.7-stable_win64.exe.zip",
  sha256: "02a5312236f4e0209c78bcb2f52135b1963e6b8888c873c9cee81459e60bcd71",
  executable: "Godot_v4.7-stable_win64.exe",
  platform: "windows",
  architecture: "x86_64",
} as const;

export const pinnedGodotCacheMarker = "forge-godot-verified.json";

export function isApprovedGodotVersion(version: string): boolean {
  return version.startsWith("4.7.");
}
