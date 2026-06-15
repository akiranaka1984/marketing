import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret, loadKey } from "./crypto";

const key = randomBytes(32);
const secret = "EAAB-meta-access-token-1234567890";

describe("crypto", () => {
  it("round-trips a secret", () => {
    expect(decryptSecret(encryptSecret(secret, key), key)).toBe(secret);
  });

  it("never leaks plaintext into the ciphertext", () => {
    expect(encryptSecret(secret, key)).not.toContain(secret);
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptSecret(secret, key)).not.toBe(encryptSecret(secret, key));
  });

  it("fails to decrypt with the wrong key", () => {
    const encoded = encryptSecret(secret, key);
    expect(() => decryptSecret(encoded, randomBytes(32))).toThrow();
  });

  it("detects tampering (GCM auth tag)", () => {
    const encoded = encryptSecret(secret, key);
    const parts = encoded.split(":");
    const ct = Buffer.from(parts[3], "base64");
    ct[0] ^= 0xff;
    parts[3] = ct.toString("base64");
    expect(() => decryptSecret(parts.join(":"), key)).toThrow();
  });

  it("rejects malformed or unversioned ciphertext", () => {
    expect(() => decryptSecret("not-valid", key)).toThrow(/malformed/);
    expect(() => decryptSecret("v2:a:b:c", key)).toThrow(/unsupported|malformed/);
  });

  it("round-trips with matching AAD", () => {
    const encoded = encryptSecret(secret, key, "tenant:meta:token");
    expect(decryptSecret(encoded, key, "tenant:meta:token")).toBe(secret);
  });

  it("fails when AAD does not match", () => {
    const encoded = encryptSecret(secret, key, "tenant:meta:token");
    expect(() => decryptSecret(encoded, key, "other:meta:token")).toThrow();
    expect(() => decryptSecret(encoded, key)).toThrow();
  });

  it("loadKey validates length", () => {
    expect(() => loadKey(randomBytes(32).toString("base64"))).not.toThrow();
    expect(() => loadKey(randomBytes(16).toString("base64"))).toThrow(/32 bytes/);
  });

  it("encryptSecret rejects a wrong-sized key", () => {
    expect(() => encryptSecret(secret, randomBytes(16))).toThrow();
  });
});
