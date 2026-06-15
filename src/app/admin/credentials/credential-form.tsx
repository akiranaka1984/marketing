"use client";

import { useActionState } from "react";
import { CHANNELS } from "@/core/profile/service-profile";
import { saveCredentialAction, type SaveState } from "./actions";

const initial: SaveState = { ok: false, message: "" };

const field = "w-full rounded border border-black/15 bg-white px-3 py-2 text-sm";
const label = "block text-xs font-medium text-black/60";

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

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "保存中…" : "暗号化して保存"}
        </button>
        {state.message ? (
          <span className={`text-sm ${state.ok ? "text-green-600" : "text-red-600"}`}>
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
