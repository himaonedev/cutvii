import { duplicateClipAt } from "./duplicateDrag";
import { makeProject, IDS, expectValid } from "@/test/makeProject";
import { addClip } from "./edit";
import { findClip } from "./clips";
import { useTrackLocksStore } from "@/store/trackLocks";
import { protectLockedTracks } from "./trackLock";

beforeEach(() => useTrackLocksStore.setState({ locks: {} }));
afterEach(() => useTrackLocksStore.setState({ locks: {} }));
function setup() {
  const r = addClip(makeProject(), {
    assetId: IDS.vid,
    trackId: IDS.v1,
    start: 0,
    id: "original",
    duration: 8,
  });
  if (!r.ok) throw new Error(r.error.message);
  return {
    ...r.project,
    tracks: r.project.tracks.map((t) => ({
      ...t,
      clips: t.clips.map((c) => ({
        ...c,
        speed: 2,
        volume: 0.7,
        keyframes: {
          x: [
            { t: 0, v: 0 },
            { t: 2, v: 0.2 },
          ],
        },
      })),
    })),
  };
}
it("duplicates the whole clip with a fresh id and leaves the original and neighbours unchanged", () => {
  const p = setup(),
    snapshot = structuredClone(p),
    source = findClip(p, "original")!.clip;
  const r = duplicateClipAt(p, "original", { start: 5, trackId: IDS.v1 }, "copy");
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expectValid(r.project);
  expect(p).toEqual(snapshot);
  expect(findClip(r.project, "original")!.clip).toEqual(source);
  expect(findClip(r.project, "copy")!.clip).toEqual({ ...source, id: "copy", timelineStart: 5 });
});
it("can copy into a new layer and rejects overlap or a locked destination without moving the source", () => {
  const p = setup();
  const r = duplicateClipAt(
    p,
    "original",
    { start: 0, trackId: "new-layer", createTrack: true, beforeTrackId: IDS.v1 },
    "copy",
  );
  expect(r.ok).toBe(true);
  if (!r.ok) return;
  expectValid(r.project);
  expect(findClip(r.project, "original")?.track.id).toBe(IDS.v1);
  expect(findClip(r.project, "copy")?.track.id).toBe("new-layer");
  expect(duplicateClipAt(p, "original", { start: 1, trackId: IDS.v1 }, "overlap").ok).toBe(false);
  useTrackLocksStore.getState().toggle(p.id, IDS.v2);
  expect(
    protectLockedTracks(p, duplicateClipAt(p, "original", { start: 0, trackId: IDS.v2 }, "locked")).ok,
  ).toBe(false);
});
