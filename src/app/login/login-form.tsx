"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const INITIAL: LoginState = { ok: false, message: "" };

const FIELD =
  "w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-faint transition-colors hover:border-line-strong focus:border-accent";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, INITIAL);

  return (
    <form action={formAction} className="space-y-5">
      <div className="space-y-1.5">
        <label htmlFor="username" className="block text-xs font-medium text-subtle">
          ID
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          autoFocus
          required
          placeholder="admin"
          className={FIELD}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-xs font-medium text-subtle">
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className={FIELD}
        />
      </div>

      {state.message ? (
        <p
          role="alert"
          className="rounded-lg border border-danger/30 bg-danger-surface px-3 py-2 text-sm text-danger"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink
          transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "確認中…" : "ログイン"}
      </button>
    </form>
  );
}
