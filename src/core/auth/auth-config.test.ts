import { describe, expect, it } from "vitest";
import { loadAuthConfig, SESSION_TTL_MS } from "./auth-config";

const SECRET = Buffer.alloc(32, 7).toString("base64");

const VALID = {
  AUTH_SESSION_SECRET: SECRET,
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "s3cr3t-passphrase",
};

describe("loadAuthConfig", () => {
  it("loads a valid config and decodes the secret to a >=32-byte buffer", () => {
    const config = loadAuthConfig(VALID);
    expect(config.admin).toEqual({ username: "admin", password: "s3cr3t-passphrase" });
    expect(config.sessionSecret.length).toBeGreaterThanOrEqual(32);
  });

  it("throws when AUTH_SESSION_SECRET is missing", () => {
    expect(() => loadAuthConfig({ ...VALID, AUTH_SESSION_SECRET: undefined })).toThrow(/AUTH_SESSION_SECRET/);
  });

  it("throws when the secret decodes to fewer than 32 bytes", () => {
    expect(() => loadAuthConfig({ ...VALID, AUTH_SESSION_SECRET: Buffer.alloc(16, 1).toString("base64") })).toThrow(
      /32 bytes/,
    );
  });

  it("throws when ADMIN_USERNAME is missing or empty", () => {
    expect(() => loadAuthConfig({ ...VALID, ADMIN_USERNAME: "" })).toThrow(/ADMIN_USERNAME/);
    expect(() => loadAuthConfig({ ...VALID, ADMIN_USERNAME: undefined })).toThrow(/ADMIN_USERNAME/);
  });

  it("throws when ADMIN_PASSWORD is missing or empty", () => {
    expect(() => loadAuthConfig({ ...VALID, ADMIN_PASSWORD: "" })).toThrow(/ADMIN_PASSWORD/);
    expect(() => loadAuthConfig({ ...VALID, ADMIN_PASSWORD: undefined })).toThrow(/ADMIN_PASSWORD/);
  });

  it("exposes a positive session TTL", () => {
    expect(SESSION_TTL_MS).toBeGreaterThan(0);
  });
});
