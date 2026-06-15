import { describe, expect, it } from "vitest";
import { MockProfiler } from "./mock-profiler";
import { serviceProfileSchema } from "./service-profile";

const fixedNow = () => new Date("2026-06-15T00:00:00.000Z");

describe("MockProfiler", () => {
  it("produces a schema-valid profile from a minimal seed", async () => {
    const profiler = new MockProfiler(fixedNow);
    const profile = await profiler.profile({ name: "B-Ticket" });
    expect(() => serviceProfileSchema.parse(profile)).not.toThrow();
  });

  it("derives a slug serviceId from the name", async () => {
    const profiler = new MockProfiler(fixedNow);
    const profile = await profiler.profile({ name: "Dai Masu PH!" });
    expect(profile.serviceId).toBe("dai-masu-ph");
  });

  it("honors tenant-enabled channels from the seed", async () => {
    const profiler = new MockProfiler(fixedNow);
    const profile = await profiler.profile({ name: "X", channels: ["tiktok", "sms"] });
    expect(profile.channels).toEqual(["tiktok", "sms"]);
  });

  it("defaults to meta when no channels are provided", async () => {
    const profiler = new MockProfiler(fixedNow);
    const profile = await profiler.profile({ name: "X" });
    expect(profile.channels).toEqual(["meta"]);
  });

  it("marks itself as unverified (mock, zero confidence)", async () => {
    const profiler = new MockProfiler(fixedNow);
    const profile = await profiler.profile({ name: "X" });
    expect(profile.provenance.derivedBy).toBe("mock");
    expect(profile.provenance.confidence).toBe(0);
  });

  it("records the seed url as a source", async () => {
    const profiler = new MockProfiler(fixedNow);
    const profile = await profiler.profile({ name: "X", url: "https://b-ticket.app" });
    expect(profile.provenance.sources).toContain("https://b-ticket.app");
  });
});
