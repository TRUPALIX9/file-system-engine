import { describe, expect, it } from "vitest";
import { shellQuote } from "./AndroidAdbProvider";

describe("shellQuote", () => {
  it("wraps a plain path in single quotes", () => {
    expect(shellQuote("/sdcard/DCIM/Camera")).toBe("'/sdcard/DCIM/Camera'");
  });

  it("keeps command substitution and variables literal", () => {
    expect(shellQuote("/sdcard/$(reboot)`id`$HOME")).toBe("'/sdcard/$(reboot)`id`$HOME'");
  });

  it("escapes embedded single quotes so they cannot end the quoted string", () => {
    expect(shellQuote("/sdcard/it's here")).toBe("'/sdcard/it'\\''s here'");
  });

  it("keeps double quotes and semicolons inside the argument", () => {
    expect(shellQuote('/sdcard/x";touch pwned;"')).toBe(`'/sdcard/x";touch pwned;"'`);
  });
});
