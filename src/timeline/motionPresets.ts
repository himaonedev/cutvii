/** Local motion presets inspired by facecammaxxing, using CutVii's native keyframes. */
import { TRANSFORM_LIMITS, type Project } from "@/project/model";
import { findClip } from "./clips";
import type { EditResult } from "./edit";
import { keyTime, type Key, type KeyProp } from "./transform";

export const MOTION_PRESETS = [
  {
    id: "punch-in",
    name: "Punch-in",
    description: "Zoom in at the playhead, hold, then return.",
    text: false,
  },
  { id: "slow-push", name: "Slow Push", description: "A gradual zoom across the whole clip.", text: false },
  { id: "text-pop", name: "Text Pop", description: "Text slides and pops in, then fades out.", text: true },
] as const;
export type MotionPresetId = (typeof MOTION_PRESETS)[number]["id"];
export type MotionStrength = "subtle" | "dynamic";

export function setMotionPreset(
  project: Project,
  clipId: string,
  preset: MotionPresetId,
  strength: MotionStrength,
  playhead: number,
  seconds = 2,
): EditResult {
  const found = findClip(project, clipId);
  if (!found) return { ok: false, error: { code: "unknown-clip", message: "Select a clip first" } };
  const { clip, track } = found;
  const asset = project.assets.find((a) => a.id === clip.assetId);
  const definition = MOTION_PRESETS.find((p) => p.id === preset);
  if (
    !definition ||
    !Number.isFinite(playhead) ||
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    (strength !== "subtle" && strength !== "dynamic")
  ) {
    return {
      ok: false,
      error: { code: "out-of-range", message: "Choose a valid motion preset and duration" },
    };
  }
  if (!asset || track.type !== "video" || asset.type === "audio" || definition.text !== Boolean(asset.text)) {
    return {
      ok: false,
      error: { code: "incompatible-track", message: "Choose a preset for this clip type" },
    };
  }
  const length = (clip.sourceOut - clip.sourceIn) / (clip.speed ?? 1);
  if (length < 4 / project.settings.fps) {
    return {
      ok: false,
      error: { code: "out-of-range", message: "Motion presets need a clip at least four frames long" },
    };
  }
  const keys: Partial<Record<KeyProp, Key[]>> = {};
  const put = (prop: KeyProp, points: [number, number][]) => {
    // Keys are SOURCE times: map timeline time through trim, speed and reverse.
    const mapped = points.map(([t, v]) => ({ t: keyTime(clip, clip.timelineStart + t), v }));
    const unique = new Map(mapped.map((key) => [key.t, key]));
    keys[prop] = [...unique.values()].sort((a, b) => a.t - b.t);
  };
  const scaled = (factor: number) =>
    Math.min(TRANSFORM_LIMITS.maxScale, Math.max(TRANSFORM_LIMITS.minScale, clip.scale * factor));
  const dynamic = strength === "dynamic";
  if (preset === "slow-push") {
    put("scale", [
      [0, clip.scale],
      [length, scaled(dynamic ? 1.25 : 1.1)],
    ]);
  } else if (preset === "punch-in") {
    const duration = Math.min(length, seconds);
    const start = Math.max(0, Math.min(length - duration, playhead - clip.timelineStart));
    const ramp = Math.min(5 / project.settings.fps, duration / 4);
    put("scale", [
      [0, clip.scale],
      [start, clip.scale],
      [start + ramp, scaled(dynamic ? 1.25 : 1.12)],
      [start + duration - ramp, scaled(dynamic ? 1.25 : 1.12)],
      [start + duration, clip.scale],
      [length, clip.scale],
    ]);
  } else {
    const entrance = Math.min(0.4, length / 3);
    const exit = Math.min(0.2, length / 4);
    put("scale", [
      [0, scaled(dynamic ? 0.72 : 0.88)],
      [entrance * 0.65, scaled(dynamic ? 1.08 : 1.03)],
      [entrance, clip.scale],
      [length, clip.scale],
    ]);
    put("y", [
      [0, Math.min(TRANSFORM_LIMITS.offset, clip.y + (dynamic ? 0.06 : 0.03))],
      [entrance, clip.y],
      [length, clip.y],
    ]);
    put("opacity", [
      [0, 0],
      [entrance * 0.6, clip.opacity],
      [length - exit, clip.opacity],
      [length, 0],
    ]);
  }
  return {
    ok: true,
    project: {
      ...project,
      tracks: project.tracks.map((t) => ({
        ...t,
        clips: t.clips.map((c) => (c.id === clipId ? { ...c, keyframes: { ...c.keyframes, ...keys } } : c)),
      })),
    },
  };
}
