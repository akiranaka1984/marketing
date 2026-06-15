import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { InMemoryCredentialStore } from "./credential-store";
import {
  CredentialService,
  createInMemoryCredentialService,
} from "./credential-service";

const key = randomBytes(32);
const make = () => new CredentialService(new InMemoryCredentialStore(key));
const base = { tenantId: "b-ticket", channel: "meta" as const, name: "accessToken" };

describe("CredentialService", () => {
  it("stores and retrieves through validation", async () => {
    const svc = make();
    await svc.set({ ...base, secret: "EAAB-token" });
    expect(await svc.get(base)).toBe("EAAB-token");
    expect(await svc.has(base)).toBe(true);
  });

  it("trims identity fields but preserves the secret verbatim", async () => {
    const svc = make();
    await svc.set({ tenantId: "  b-ticket ", channel: "meta", name: " accessToken ", secret: "  tok  " });
    expect(await svc.get(base)).toBe("  tok  ");
  });

  it("rejects blank identity fields and blank secrets", async () => {
    const svc = make();
    await expect(svc.set({ ...base, tenantId: "   ", secret: "x" })).rejects.toThrow();
    await expect(svc.set({ ...base, name: "", secret: "x" })).rejects.toThrow();
    await expect(svc.set({ ...base, secret: "   " })).rejects.toThrow();
    await expect(svc.set({ ...base, secret: "" })).rejects.toThrow();
  });

  it("rejects an unknown channel", async () => {
    const svc = make();
    await expect(
      svc.set({ tenantId: "b-ticket", channel: "carrier-pigeon" as never, name: "x", secret: "y" }),
    ).rejects.toThrow();
  });

  it("removes a credential", async () => {
    const svc = make();
    await svc.set({ ...base, secret: "x" });
    await svc.remove(base);
    expect(await svc.has(base)).toBe(false);
    expect(await svc.get(base)).toBeNull();
  });

  it("reports field status for a tenant+channel", async () => {
    const svc = make();
    await svc.set({ ...base, name: "accessToken", secret: "a" });
    expect(await svc.fieldStatus("b-ticket", "meta", ["accessToken", "adAccountId"])).toEqual({
      accessToken: true,
      adAccountId: false,
    });
  });

  it("lists stored identities sorted, without secrets", async () => {
    const svc = make();
    await svc.set({ tenantId: "daimasu", channel: "meta", name: "accessToken", secret: "x" });
    await svc.set({ ...base, name: "adAccountId", secret: "y" });
    await svc.set({ ...base, name: "accessToken", secret: "z" });
    const listed = await svc.list();
    expect(listed).toEqual([
      { tenantId: "b-ticket", channel: "meta", name: "accessToken" },
      { tenantId: "b-ticket", channel: "meta", name: "adAccountId" },
      { tenantId: "daimasu", channel: "meta", name: "accessToken" },
    ]);
  });

  it("factory fails fast without an encryption key", () => {
    expect(() => createInMemoryCredentialService(undefined)).toThrow(/CREDENTIAL_ENCRYPTION_KEY/);
  });

  it("factory builds a working service from a base64 key", async () => {
    const svc = createInMemoryCredentialService(randomBytes(32).toString("base64"));
    await svc.set({ ...base, secret: "z" });
    expect(await svc.get(base)).toBe("z");
  });
});
