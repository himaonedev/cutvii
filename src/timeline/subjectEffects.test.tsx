import { applySubjectVideo, addTextBehindSubject, prepareSubjectEffect } from "./subjectEffects";
import { addClip } from "./edit";
import { defaultTextSpec } from "./text";
import { findClip } from "./clips";
import { makeProject, expectValid } from "@/test/makeProject";
import { layersAt } from "@/playback/engine";
import { useProjectStore } from "@/store/project";
import { invoke } from "@tauri-apps/api/core";

const cutout = { path: "/generated/person.webm", width: 1920, height: 1080, duration: 6, alpha: true };
function source() {
  const result = addClip(makeProject(), { assetId: "vid", trackId: "v1", id: "source", start: 2 });
  if (!result.ok) throw new Error(result.error.message);
  result.project.tracks[0].clips[0] = {
    ...result.project.tracks[0].clips[0],
    sourceIn: 2,
    sourceOut: 8,
    speed: 2,
    keyframes: {
      scale: [
        { t: 2, v: 1 },
        { t: 8, v: 1.2 },
      ],
    },
  };
  return result.project;
}

it("replaces only the selected clip with an alpha video, keeping trim, speed and keyframes aligned", () => {
  const p = source();
  const result = applySubjectVideo(p, "source", cutout, "person");
  if (!result.ok) throw new Error(result.error.message);
  expectValid(result.project);
  const c = findClip(result.project, "source")!.clip;
  expect(c.sourceIn).toBe(0);
  expect(c.sourceOut).toBe(6);
  expect(c.speed).toBe(2);
  expect(c.keyframes!.scale).toEqual([
    { t: 0, v: 1 },
    { t: 6, v: 1.2 },
  ]);
  expect(result.project.assets.find((a) => a.id === "person")!.alpha).toBe(true);
  expect(p.assets).toHaveLength(4);
});

it("places text between the original and the silent subject layer while keeping other overlays above", () => {
  const p = source();
  const result = addTextBehindSubject(
    p,
    "source",
    cutout,
    { path: "/text/title.png", spec: defaultTextSpec(1080) },
    {
      asset: "person",
      titleAsset: "title",
      titleTrack: "title-track",
      subjectTrack: "person-track",
      titleClip: "title-clip",
      subjectClip: "person-clip",
    },
  );
  if (!result.ok) throw new Error(result.error.message);
  expectValid(result.project);
  expect(findClip(result.project, "source")!.clip).toBe(findClip(p, "source")!.clip);
  expect(findClip(result.project, "title-clip")!.track.order).toBe(1);
  expect(findClip(result.project, "person-clip")!.track.order).toBe(2);
  expect(findClip(result.project, "person-clip")!.clip.muted).toBe(true);
  expect(result.project.tracks.find((t) => t.id === "v2")!.order).toBe(3);
  const visible = layersAt(result.project, 2.5)
    .filter((l) => l.visible)
    .map((l) => l.clip.id);
  expect(visible).toEqual(expect.arrayContaining(["source", "title-clip", "person-clip"]));
});

it("applies the effect as one undo step and refuses a stale project after background processing", async () => {
  const p = source();
  useProjectStore.setState({ project: p, past: [], future: [] });
  vi.mocked(invoke).mockResolvedValue(cutout);
  const result = await prepareSubjectEffect("source", "remove", 20, "");
  expect(result.ok).toBe(true);
  expect(useProjectStore.getState().past).toHaveLength(1);
  useProjectStore.getState().undo();
  expect(useProjectStore.getState().project).toBe(p);
  vi.mocked(invoke).mockImplementation(async () => {
    useProjectStore.setState({ project: { ...p, name: "Changed" } });
    return cutout;
  });
  await expect(prepareSubjectEffect("source", "remove", 20, "")).rejects.toThrow(/project changed/);
});
