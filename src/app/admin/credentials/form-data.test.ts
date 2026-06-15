import { describe, expect, it } from "vitest";
import { requireString } from "./form-data";

describe("requireString", () => {
  it("returns string field values verbatim", () => {
    const fd = new FormData();
    fd.set("tenantId", "  b-ticket ");
    expect(requireString(fd, "tenantId")).toBe("  b-ticket ");
  });

  it("rejects a File value instead of coercing it to '[object File]'", () => {
    const fd = new FormData();
    fd.set("secret", new File(["x"], "leak.txt"));
    expect(() => requireString(fd, "secret")).toThrow(/must be a string/);
  });

  it("rejects a missing field", () => {
    expect(() => requireString(new FormData(), "name")).toThrow(/must be a string/);
  });
});
