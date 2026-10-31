import { useTrackLocksStore, isTrackLocked } from "@/store/trackLocks";
import { useProjectStore } from "@/store/project";
import { makeProject, IDS } from "@/test/makeProject";
import { addClip, moveClip, deleteClip, splitClip, trimClip } from "./edit";
import { cleanLayersAfterMove, removeEmptyLayers } from "./layerLayout";
import { protectLockedTracks } from "./trackLock";

beforeEach(() => useTrackLocksStore.setState({ locks: {} }));
afterEach(() => useTrackLocksStore.setState({ locks: {} }));
function setup() {
  const added = addClip(makeProject(), { assetId: IDS.vid, trackId: IDS.v1, start: 0, id: "clip" });
  if (!added.ok) throw new Error(added.error.message);
  useProjectStore.getState().loadProject(added.project, "/test.cutvii", []);
  useTrackLocksStore.getState().toggle(added.project.id, IDS.v1);
  return added.project;
}
it("blocks move, trim, split, delete and adding to a locked track without adding history", () => {
  const p = setup();
  for (const apply of [
    () => moveClip(p, "clip", { start: 3 }),
    () => deleteClip(p, "clip"),
    () => splitClip(p, "clip", 4),
    () => trimClip(p, "clip", "end", 5),
    () => addClip(p, { assetId: IDS.vid2, trackId: IDS.v1, start: 12, id: "extra" }),
  ]) {
    const result = useProjectStore.getState().execute({ label: "Try edit", apply });
    expect(result.ok).toBe(false);
    expect(useProjectStore.getState().project).toBe(p);
    expect(useProjectStore.getState().past).toHaveLength(0);
  }
  useTrackLocksStore.getState().toggle(p.id, IDS.v1);
  expect(
    useProjectStore.getState().execute({ label: "Move", apply: () => moveClip(p, "clip", { start: 3 }) }).ok,
  ).toBe(true);
});
it("protects locked track assets and track deletion but allows visibility and mute", () => {
  const p = setup();
  expect(
    protectLockedTracks(p, { ok: true, project: { ...p, tracks: p.tracks.filter((t) => t.id !== IDS.v1) } })
      .ok,
  ).toBe(false);
  expect(
    protectLockedTracks(p, {
      ok: true,
      project: { ...p, assets: p.assets.map((a) => (a.id === IDS.vid ? { ...a, path: "changed.mp4" } : a)) },
    }).ok,
  ).toBe(false);
  expect(
    protectLockedTracks(p, {
      ok: true,
      project: { ...p, tracks: p.tracks.map((t) => ({ ...t, muted: true, hidden: true })) },
    }).ok,
  ).toBe(true);
});
it("retains empty locked tracks during cleanup and keeps locks project-scoped locally", () => {
  const p = setup();
  useTrackLocksStore.getState().toggle(p.id, IDS.a1);
  const clean = removeEmptyLayers(p);
  expect(clean.tracks.some((t) => t.id === IDS.a1)).toBe(true);
  expect(clean.tracks.some((t) => t.id === IDS.v2)).toBe(false);
  expect(isTrackLocked(p.id, IDS.v1)).toBe(true);
  expect(isTrackLocked("different-project", IDS.v1)).toBe(false);
  expect(localStorage.getItem("cutvii-track-locks-v1")).toContain(p.id);
  expect(cleanLayersAfterMove(p, { ok: true, project: p })).toEqual({ ok: true, project: p });
});
