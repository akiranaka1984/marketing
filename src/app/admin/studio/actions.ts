"use server";

import { ZodError } from "zod";
import { requireAdmin } from "@/app/lib/auth";
import { routeDoctrine } from "@/core/doctrine/router";
import type { ProfileSeed } from "@/core/profile/profiler";
import { FormFieldError, requireString } from "../credentials/form-data";
import { deriveProfile } from "./service";
import type { StudioState } from "./state";
import { buildStudioView } from "./view-model";

function optionalString(formData: FormData, key: string): string | undefined {
  const raw = formData.get(key);
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Server Action: derive a ServiceProfile from the seed, route it through the
 * Decision Spine (D1–D7) and return render-ready rows. Re-validates input at the
 * boundary since it is reachable via direct POST.
 */
export async function runStudioAction(
  _prev: StudioState,
  formData: FormData,
): Promise<StudioState> {
  await requireAdmin();
  try {
    const name = requireString(formData, "name").trim();
    if (!name) return { status: "error", message: "サービス名を入力してください。" };

    const seed: ProfileSeed = {
      name,
      hints: optionalString(formData, "hints"),
      url: optionalString(formData, "url"),
    };

    const { profile, mode } = await deriveProfile(seed);
    const view = buildStudioView(profile, routeDoctrine(profile));
    return { status: "ok", mode, view };
  } catch (err) {
    if (err instanceof FormFieldError) {
      return { status: "error", message: "入力フォームのデータが不正です。" };
    }
    if (err instanceof ZodError) {
      return {
        status: "error",
        message: "AIが返したプロファイルの形式が不正でした。もう一度お試しください。",
      };
    }
    return {
      status: "error",
      message: err instanceof Error ? err.message : "プロファイル生成に失敗しました。",
    };
  }
}
