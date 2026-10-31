import { highlightImageKeys, animationTiming, retimeImageAnimation } from "./highlightImage";
import { DEFAULT_FREEZE_HIGHLIGHT as settings } from "./freezeHighlight";
import { makeProject, IDS, expectValid } from "@/test/makeProject";
import { addClip, moveClip } from "./edit";
import { clipEnd } from "./clips";

it("speeds slide keys without changing their path or duration of the image clip", () => {
  const normal = highlightImageKeys({ ...settings, backgroundMotion: "right" }, 4, 0, 0, 1);
  const fast = highlightImageKeys({ ...settings, backgroundMotion: "right", backgroundSpeed: 2 }, 4, 0, 0, 1);
  expect(fast.x?.map((k) => k.v)).toEqual(normal.x?.map((k) => k.v));
  expect(fast.x?.at(-1)?.t).toBe(2);
  const added = addClip(makeProject(), {
    assetId: IDS.img,
    trackId: IDS.v1,
    start: 0,
    id: "plate",
    duration: 4,
  });
  if (!added.ok) throw new Error(added.error.message);
  const project = {
    ...added.project,
    tracks: added.project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => ({
        ...c,
        keyframes: {
          ...normal,
          scale: [
            { t: 0, v: 1 },
            { t: 4, v: 1.1 },
          ],
        },
      })),
    })),
  };
  const r = retimeImageAnimation(project, "plate", 2);
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expectValid(r.project);
  const clip = r.project.tracks[0].clips[0];
  expect(clipEnd(clip)).toBe(4);
  expect(animationTiming(clip).speed).toBe(2);
  expect(clip.keyframes?.scale).toEqual(project.tracks[0].clips[0].keyframes.scale);
  expect(clip.keyframes?.x).toEqual(fast.x);
  const moved = moveClip(r.project, "plate", { start: 6 });
  expect(moved.ok).toBe(true);
  if (!moved.ok) return;
  expectValid(moved.project);
  expect(moved.project.tracks[0].clips[0].timelineStart).toBe(6);
  expect(moved.project.tracks[0].clips[0].keyframes).toEqual(clip.keyframes);
});
it("keeps shake keys inside project limits and rejects invalid speed", () => {
  const keys = highlightImageKeys(
    { ...settings, backgroundMotion: "shake", backgroundSpeed: 0.5 },
    2,
    1.99,
    -1.99,
    1,
  );
  expect(keys.x).toHaveLength(49);
  expect(keys.x?.at(-1)?.t).toBe(4);
  expect(keys.x?.every((k) => Math.abs(k.v) <= 2)).toBe(true);
  expect(retimeImageAnimation(makeProject(), "missing", NaN).ok).toBe(false);
});
