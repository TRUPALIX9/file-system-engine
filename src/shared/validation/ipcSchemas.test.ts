import { describe, expect, it } from "vitest";
import { IPC_CHANNELS, IPC_EVENT_CHANNELS } from "@shared/ipc";
import { browseRequestSchema, executeOperationPlanRequestSchema, ipcRequestSchemas } from "./ipcSchemas";

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

  it("keeps every declared invoke channel covered by a schema", () => {
    const eventChannels: readonly string[] = IPC_EVENT_CHANNELS;
    const invokeChannels = Object.values(IPC_CHANNELS).filter((channel) => !eventChannels.includes(channel));
    expect(Object.keys(ipcRequestSchemas).sort()).toEqual(invokeChannels.sort());
  });

  it("rejects a delete operation without an explicit source", () => {
    const result = executeOperationPlanRequestSchema.safeParse({
      planId: "cleanup",
      confirmed: true,
      operations: [
        {
          id: "delete-1",
          kind: "delete",
          destructive: true,
          requiresConfirmation: true
        }
      ]
    });

    expect(result.success).toBe(false);
  });
});
