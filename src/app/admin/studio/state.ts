import type { ProfilerMode } from "./service";
import type { StudioView } from "./view-model";

export type StudioState =
  | { status: "idle" }
  | { status: "ok"; mode: ProfilerMode; view: StudioView }
  | { status: "error"; message: string };

export const initialStudioState: StudioState = { status: "idle" };
