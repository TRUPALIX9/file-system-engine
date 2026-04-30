import { describe, expect, it } from "vitest";
import { IPC_CHANNELS } from "@shared/ipc";
import { browseRequestSchema, ipcRequestSchemas } from "./ipcSchemas";

describe("ipc request schemas", () => {
  it("accepts a desktop browse request", () => {
    const result = browseRequestSchema.safeParse({
      location: {
        providerId: "desktop:test",
        providerKind: "desktop-filesystem",
        path: "/"
      },
      includeHidden: false
    });

    expect(result.success).toBe(true);
  });

  it("rejects unknown browse request fields", () => {
    const result = browseRequestSchema.safeParse({
      location: {
        providerId: "desktop:test",
        providerKind: "desktop-filesystem",
        path: "/"
      },
      shellCommand: "rm -rf /"
    });

    expect(result.success).toBe(false);
  });

  it("keeps every declared IPC channel covered by a schema", () => {
    expect(Object.keys(ipcRequestSchemas).sort()).toEqual(Object.values(IPC_CHANNELS).sort());
  });
});
