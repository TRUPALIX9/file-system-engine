import { execFile } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

const execFileAsync = promisify(execFile);

let cachedAdbPath: string | null = null;

/** Absolute path to adb (or "adb" from PATH). Use with execFile only; it is not shell-quoted. */
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
      // Returned unquoted: callers pass it to execFile, never to a shell.
      cachedAdbPath = path;
      return cachedAdbPath;
    }
  }

  // 2. Try system PATH as fallback
  try {
    await execFileAsync("adb", ["version"]);
    cachedAdbPath = "adb";
    return cachedAdbPath;
  } catch {
    // Not in PATH
  }

  return "adb";
}
