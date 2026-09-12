import { describe, expect, it } from "vitest";
import { EXISTS_MARKER, shellQuote, unlessExists } from "./AndroidAdbProvider";

describe("unlessExists", () => {
  it("only runs the command when the quoted destination is free", () => {
    expect(unlessExists("/sdcard/Pictures/it's.jpg", "mv -- '/sdcard/a.jpg' '/sdcard/Pictures/it'\\''s.jpg'")).toBe(
      `if [ -e '/sdcard/Pictures/it'\\''s.jpg' ] || [ -L '/sdcard/Pictures/it'\\''s.jpg' ]; then echo ${EXISTS_MARKER}; ` +
        `else mv -- '/sdcard/a.jpg' '/sdcard/Pictures/it'\\''s.jpg'; fi`
    );
  });
});

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
