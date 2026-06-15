"use client";

import { useActionState } from "react";
import { CHANNELS } from "@/core/profile/service-profile";
import { saveCredentialAction, type SaveState } from "./actions";

const initial: SaveState = { ok: false, message: "" };

const field =
  "w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-faint transition-colors focus:border-accent";
const label = "block text-xs font-medium text-subtle";

export function CredentialForm() {
  const [state, action, pending] = useActionState(saveCredentialAction, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className={label} htmlFor="tenantId">
            テナントID
          </label>
          <input id="tenantId" name="tenantId" className={field} placeholder="b-ticket" required />
        </div>
        <div className="space-y-1">
          <label className={label} htmlFor="channel">
            チャネル
          </label>
          <select id="channel" name="channel" className={field} defaultValue="meta">
            {CHANNELS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className={label} htmlFor="name">
            フィールド名
          </label>
          <input id="name" name="name" className={field} placeholder="accessToken" required />
        </div>
        <div className="space-y-1">
          <label className={label} htmlFor="secret">
            シークレット
          </label>
          <input id="secret" name="secret" type="password" className={field} required />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink
            transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? "保存中…" : "暗号化して保存"}
        </button>
        {state.message ? (
          <span
            className={`rounded-md px-2.5 py-1 text-sm ${
              state.ok
                ? "bg-success/10 text-success"
                : "border border-danger/30 bg-danger-surface text-danger"
            }`}
          >
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
