"use server";

import { redirect } from "next/navigation";
import { loadAuthConfig } from "@/core/auth/auth-config";
import { verifyLogin } from "@/core/auth/credentials";
import { LoginThrottle } from "@/core/auth/login-throttle";
import { requireString, FormFieldError } from "@/app/admin/credentials/form-data";
import { createSession } from "@/app/lib/auth";

export interface LoginState {
  ok: boolean;
  message: string;
}

// Process-wide throttle (globalThis so Next dev HMR keeps one instance) to slow brute force.
const globalForThrottle = globalThis as unknown as { __loginThrottle?: LoginThrottle };
function getThrottle(): LoginThrottle {
  if (!globalForThrottle.__loginThrottle) {
    globalForThrottle.__loginThrottle = new LoginThrottle();
  }
  return globalForThrottle.__loginThrottle;
}

/**
 * Server Action: verify ID/password against the env-provided admin credentials (constant-time),
 * mint a signed session cookie on success, then redirect to the admin area. The error message is
 * deliberately generic so it leaks neither which field was wrong nor whether the user exists.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  let username: string;
  let password: string;
  try {
    username = requireString(formData, "username");
    password = requireString(formData, "password");
  } catch (err) {
    if (err instanceof FormFieldError) {
      return { ok: false, message: "IDとパスワードを入力してください。" };
    }
    throw err;
  }

  const throttle = getThrottle();
  const decision = throttle.check(username);
  if (!decision.allowed) {
    const seconds = Math.ceil(decision.retryAfterMs / 1000);
    return { ok: false, message: `試行回数が多すぎます。${seconds}秒後に再試行してください。` };
  }

  const config = loadAuthConfig(process.env);
  if (!verifyLogin({ username, password }, config.admin)) {
    throttle.recordFailure(username);
    return { ok: false, message: "IDまたはパスワードが正しくありません。" };
  }

  throttle.recordSuccess(username);
  await createSession(username);
  redirect("/admin/credentials");
}
