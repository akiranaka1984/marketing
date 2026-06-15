"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { FormFieldError, requireString } from "./form-data";
import { getCredentialService } from "./service";

const PATH = "/admin/credentials";

export interface SaveState {
  ok: boolean;
  message: string;
}

/**
 * Server Action: reachable via direct POST, so the service re-validates every field
 * at the boundary (RULES 第4条). Secrets are never echoed back in the result.
 */
export async function saveCredentialAction(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  try {
    await getCredentialService().set({
      tenantId: requireString(formData, "tenantId"),
      channel: requireString(formData, "channel") as never,
      name: requireString(formData, "name"),
      secret: requireString(formData, "secret"),
    });
    revalidatePath(PATH);
    return { ok: true, message: "暗号化して保存しました。" };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : "保存に失敗しました。",
    };
  }
}

export async function deleteCredentialAction(formData: FormData): Promise<void> {
  try {
    await getCredentialService().remove({
      tenantId: requireString(formData, "tenantId"),
      channel: requireString(formData, "channel") as never,
      name: requireString(formData, "name"),
    });
    revalidatePath(PATH);
  } catch (err) {
    // Malformed direct-POST input is a no-op (the UI never sends it); operational
    // failures (missing key, store errors) must still surface.
    if (err instanceof FormFieldError || err instanceof ZodError) return;
    throw err;
  }
}
