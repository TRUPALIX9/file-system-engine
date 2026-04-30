import { platform } from "node:os";
import type { DesktopPlatform } from "@shared/types";

export function getDesktopPlatform(): DesktopPlatform {
  const current = platform();

  if (current === "darwin") {
    return "macos";
  }

  if (current === "win32") {
    return "windows";
  }

  if (current === "linux") {
    return "linux";
  }

  return "unknown";
}
