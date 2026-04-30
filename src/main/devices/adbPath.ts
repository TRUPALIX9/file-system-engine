import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { homedir } from "os";
import { access } from "fs/promises";

const execAsync = promisify(exec);

let cachedAdbPath: string | null = null;

export async function getAdbPath(): Promise<string> {
  if (cachedAdbPath) return cachedAdbPath;

  // 1. Try system PATH
  try {
    await execAsync("adb version");
    cachedAdbPath = "adb";
    return cachedAdbPath;
  } catch {
    // Not in PATH
  }

  // 2. Try common locations
  const commonPaths = [
    join(homedir(), "Library", "Android", "sdk", "platform-tools", "adb"), // macOS SDK
    "/usr/local/bin/adb",
    "/opt/homebrew/bin/adb",
    join(process.env.LOCALAPPDATA || "", "Android", "Sdk", "platform-tools", "adb.exe"), // Windows SDK
  ];

  for (const path of commonPaths) {
    try {
      await access(path);
      cachedAdbPath = `"${path}"`; // Quote in case of spaces
      return cachedAdbPath;
    } catch {
      // Not found at this path
    }
  }

  // Fallback to "adb" and hope for the best
  return "adb";
}
