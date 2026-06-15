import { describe, expect, it } from "vitest";
import { verifyLogin, type AdminCredentials } from "./credentials";

const EXPECTED: AdminCredentials = { username: "admin", password: "s3cr3t-passphrase" };

describe("verifyLogin", () => {
  it("accepts the exact username and password", () => {
    expect(verifyLogin({ username: "admin", password: "s3cr3t-passphrase" }, EXPECTED)).toBe(true);
  });

  it("rejects a wrong password", () => {
    expect(verifyLogin({ username: "admin", password: "wrong" }, EXPECTED)).toBe(false);
  });

  it("rejects a wrong username", () => {
    expect(verifyLogin({ username: "root", password: "s3cr3t-passphrase" }, EXPECTED)).toBe(false);
  });

  it("rejects when both are wrong", () => {
    expect(verifyLogin({ username: "root", password: "wrong" }, EXPECTED)).toBe(false);
  });

  it("rejects empty input", () => {
    expect(verifyLogin({ username: "", password: "" }, EXPECTED)).toBe(false);
  });

  it("does not accept a username that is a prefix of the expected one", () => {
    expect(verifyLogin({ username: "adm", password: "s3cr3t-passphrase" }, EXPECTED)).toBe(false);
  });
});
