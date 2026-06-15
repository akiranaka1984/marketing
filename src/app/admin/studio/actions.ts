"use server";

import { ZodError } from "zod";
import { requireAdmin } from "@/app/lib/auth";
import { routeDoctrine } from "@/core/doctrine/router";
import type { ProfileSeed } from "@/core/profile/profiler";
import { FormFieldError, requireString } from "../credentials/form-data";
import { deriveProfile, generateCreatives } from "./service";
import type { StudioState } from "./state";
import { buildCreativeSelectionView, buildStudioView } from "./view-model";

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
    const routing = routeDoctrine(profile);
    const view = buildStudioView(profile, routing);

    // Creative generation is a SEPARATE failure domain: a valid profile must stay visible
    // even if the creative maker errors (network/validation). Don't discard the profile.
    let creatives = null;
    let creativesError: string | undefined;
    try {
      const selection = await generateCreatives(profile, routing);
      creatives = selection ? buildCreativeSelectionView(selection) : null;
    } catch {
      creativesError = "クリエイティブ生成に失敗しました（プロファイルは有効です）。再発火でやり直せます。";
    }

    return { status: "ok", mode, view, creatives, creativesError };
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
