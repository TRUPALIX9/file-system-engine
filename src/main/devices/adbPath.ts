import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

const execAsync = promisify(exec);

let cachedAdbPath: string | null = null;

export async function getAdbPath(): Promise<string> {
  if (cachedAdbPath) return cachedAdbPath;

  // 1. Try common locations first (since system PATH is failing for the user)
  const home = homedir();
  const candidates = [
    join(home, "Library", "Android", "sdk", "platform-tools", "adb"),
    "/usr/local/bin/adb",
    "/opt/homebrew/bin/adb",
    join(process.env.LOCALAPPDATA || "", "Android", "Sdk", "platform-tools", "adb.exe"),
  ];

  for (const path of candidates) {
    if (existsSync(path)) {
      // Use quotes only if there are spaces
      cachedAdbPath = path.includes(" ") ? `"${path}"` : path;
      return cachedAdbPath;
    }
  }

  // 2. Try system PATH as fallback
  try {
    await execAsync("adb version");
    cachedAdbPath = "adb";
    return cachedAdbPath;
  } catch {
    // Not in PATH
  }

  return "adb";
}
