import { execFile } from "node:child_process";
import { readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function parseMdlsTags(output: string): string[] {
  const trimmed = output.trim();

  if (!trimmed || trimmed === "(null)") {
    return [];
  }

  return trimmed
    .split("\n")
    .map((line) => line.trim().replace(/^"|"$/g, ""))
    .filter((line) => line && line !== "(" && line !== ")")
    .map((tag) => tag.replace(/\\n\d+$/, ""));
}

export async function readMacOsTags(path: string): Promise<string[]> {
  if (process.platform !== "darwin") {
    return [];
  }

  try {
    const { stdout } = await execFileAsync("/usr/bin/mdls", [
      "-raw",
      "-name",
      "kMDItemUserTags",
      path
    ]);

    return parseMdlsTags(stdout);
  } catch {
    return [];
  }
}

export async function setMacOsTags(_path: string, _tags: string[]): Promise<void> {
  if (process.platform !== "darwin") {
    return;
  }

  const path = _path;
  const tags = _tags.map((tag) => tag.trim()).filter(Boolean);
  const basePath = join(tmpdir(), `file-system-engine-tags-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const xmlPath = `${basePath}.plist`;
  const binaryPath = `${basePath}.binary.plist`;
  const escapedTags = tags
    .map((tag) => tag.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;"))
    .map((tag) => `    <string>${tag}\\n0</string>`)
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <array>
${escapedTags}
  </array>
</plist>
`;

  try {
    await writeFile(xmlPath, xml, "utf8");
    await execFileAsync("/usr/bin/plutil", ["-convert", "binary1", "-o", binaryPath, xmlPath]);
    const binary = await readFile(binaryPath);
    await execFileAsync("/usr/bin/xattr", [
      "-w",
      "-x",
      "com.apple.metadata:_kMDItemUserTags",
      binary.toString("hex"),
      path
    ]);
  } finally {
    await Promise.allSettled([rm(xmlPath, { force: true }), rm(binaryPath, { force: true })]);
  }
}
