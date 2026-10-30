import { keptSpans, manualReframe } from "./clipFinishing";
import { clipProject, placeClips, subtitlesForPlaced, saveSelectedClipProjects } from "./createClips";
import { makeProject, expectValid } from "@/test/makeProject";
import { projectDuration } from "./clips";
import { DEFAULT_SETTINGS, type FoundClip } from "./autoClips";
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "@/store/project";
import { useAutoClipsStore } from "@/store/autoClips";

const candidate = {
  id: "candidate",
  title: "Title",
  sourceIn: 0,
  sourceOut: 10,
  text: "Hello",
  score: 0.8,
  tier: "high",
  reasons: [],
  timelineStart: 0,
  timelineDuration: 10,
} as FoundClip;

it("removes only the middle of pauses, merging overlap and keeping speech margins", () => {
  expect(
    keptSpans(0, 10, [
      { start: 2, end: 4 },
      { start: 3, end: 5 },
    ]),
  ).toEqual([
    { start: 0, end: 2.12 },
    { start: 4.88, end: 10 },
  ]);
  expect(keptSpans(0, 10, [{ start: 1, end: 1.2 }])).toEqual([{ start: 0, end: 10 }]);
  expect(keptSpans(0, 10, [{ start: -1, end: 12 }])).toEqual([]);
});

it("manual reframing selects the left or right of a wide source without distortion", () => {
  const asset = { width: 1920, height: 1080 };
  const left = manualReframe(asset, { width: 1080, height: 1920 }, { reframe: "manual", reframeX: 0 })!;
  const right = manualReframe(asset, { width: 1080, height: 1920 }, { reframe: "manual", reframeX: 1 })!;
  expect(left.left).toBe(0);
  expect(right.right).toBe(0);
  expect(left.right).toBeCloseTo(right.left);
  expect((1920 * (1 - left.left - left.right)) / 1080).toBeCloseTo(1080 / 1920);
  expect(() => manualReframe({}, { width: 1080, height: 1920 }, { reframe: "manual" })).toThrow(/dimensions/);
});

it("closes the timeline gaps and moves subtitles with the kept source pieces", () => {
  const project = makeProject();
  const parts = placeClips({ ...project, tracks: [] }, [candidate], ["piece"], [{ start: 2, end: 4 }]);
  expect(parts).toHaveLength(2);
  expect(parts[1].start).toBeCloseTo(parts[0].sourceOut - parts[0].sourceIn);
  const captions = subtitlesForPlaced(parts[1], [{ start: 4.2, end: 5, text: "Hello again" }]);
  expect(captions[0].start).toBeLessThan(3);
  const asset = { ...project.assets[0], width: 1920, height: 1080 };
  const built = clipProject(project, asset, candidate, [], { width: 1080, height: 1920 }, "vertical", false, {
    silences: [{ start: 2, end: 4 }],
    reframe: "manual",
    reframeX: 1,
  });
  if (!built.ok) throw new Error(built.error.message);
  expectValid(built.project);
  expect(projectDuration(built.project)).toBeLessThan(9);
  expect(built.project.tracks[0].clips).toHaveLength(2);
  expect(built.project.tracks[0].clips[0].crop!.right).toBe(0);
});

it("saves distinct editable projects without replacing the current project", async () => {
  const project = makeProject();
  useProjectStore.setState({ project });
  useAutoClipsStore.setState({
    settings: { ...DEFAULT_SETTINGS, subtitles: false },
    context: {
      path: project.assets[0].path,
      video: true,
      rangeIn: 0,
      rangeOut: 10,
      timelineStart: 0,
      speed: 1,
      fps: 30,
    },
    clips: [{ ...candidate, included: true }],
    sentences: [],
  });
  vi.mocked(invoke).mockImplementation(async (command, args) => {
    if (command === "choose_clips_folder") return "/projects";
    if (command === "save_clip_projects") {
      const items = (args as { items: { project: unknown }[] }).items;
      expect(items).toHaveLength(1);
      return { paths: ["/projects/01 Title.cutvii"] };
    }
    return undefined;
  });
  expect(await saveSelectedClipProjects(720)).toEqual({ ok: true, count: 1 });
  expect(useProjectStore.getState().project).toBe(project);
});
