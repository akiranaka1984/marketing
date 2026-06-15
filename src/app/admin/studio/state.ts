import type { ProfilerMode } from "./service";
import type { CreativeSelectionView, StudioView } from "./view-model";

export type StudioState =
  | { status: "idle" }
  | {
      status: "ok";
      mode: ProfilerMode;
      view: StudioView;
      /** Sharp creative survives only when a live maker ran (null in mock mode). */
      creatives: CreativeSelectionView | null;
      /** Set when the profile derived but creative generation failed — profile stays visible. */
      creativesError?: string;
    }
  | { status: "error"; message: string };

export const initialStudioState: StudioState = { status: "idle" };
