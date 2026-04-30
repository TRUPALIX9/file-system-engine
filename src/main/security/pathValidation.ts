import { resolve, sep } from "node:path";
import { AppError } from "@main/app/AppError";

function normalizeForComparison(pathValue: string): string {
  return process.platform === "win32" ? pathValue.toLowerCase() : pathValue;
}

export function assertPathInsideRoot(rootPath: string, requestedPath: string): string {
  const resolvedRoot = resolve(rootPath);
  const resolvedPath = resolve(requestedPath);
  const comparableRoot = normalizeForComparison(resolvedRoot);
  const comparablePath = normalizeForComparison(resolvedPath);
  const rootWithSeparator = comparableRoot.endsWith(sep)
    ? comparableRoot
    : `${comparableRoot}${sep}`;

  if (comparableRoot === comparablePath || comparablePath.startsWith(rootWithSeparator)) {
    return resolvedPath;
  }

  throw new AppError("path-outside-provider");
}
