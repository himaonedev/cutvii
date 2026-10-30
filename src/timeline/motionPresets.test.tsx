import { act, fireEvent, render, screen } from "@testing-library/react";
import { MotionPresetsPanel } from "@/components/inspector/MotionPresetsPanel";
import { type Project, type TimelineClip, TRANSFORM_LIMITS } from "@/project/model";
import { useProjectStore } from "@/store/project";
import { usePlaybackStore } from "@/store/playback";
import { expectValid, IDS, makeProject } from "@/test/makeProject";
import { addClip } from "./edit";
import { setMotionPreset } from "./motionPresets";
import { transformAt } from "./transform";
import { addTextClip, defaultTextSpec } from "./text";

function video(patch: Partial<TimelineClip> = {}): Project {
  const result = addClip(makeProject(), { assetId: IDS.vid, trackId: IDS.v1, id: "clip", start: 2 });
  if (!result.ok) throw new Error(result.error.message);
  result.project.tracks[0].clips[0] = { ...result.project.tracks[0].clips[0], ...patch };
  return result.project;
}
const clipOf = (p: Project) => p.tracks.flatMap((t) => t.clips).find((c) => c.id === "clip")!;
const ok = (result: ReturnType<typeof setMotionPreset>) => {
  if (!result.ok) throw new Error(result.error.message);
  expectValid(result.project);
  return result.project;
};

describe("motion presets", () => {
  it("punches at the playhead and returns to the base scale without moving other properties", () => {
    const p = video({ x: 0.1, scale: 1.2, keyframes: { rotation: [{ t: 0, v: 5 }] } });
    const next = ok(setMotionPreset(p, "clip", "punch-in", "dynamic", 5, 2));
    const c = clipOf(next);
    expect(transformAt(c, 4).scale).toBeCloseTo(1.2);
    expect(transformAt(c, 5.5).scale).toBeCloseTo(1.5);
    expect(transformAt(c, 7.5).scale).toBeCloseTo(1.2);
    expect(c.x).toBe(0.1);
    expect(c.keyframes!.rotation).toEqual(p.tracks[0].clips[0].keyframes!.rotation);
    expect(clipOf(p).keyframes!.scale).toBeUndefined();
  });

  it("maps trim, speed and reverse into the same visible timeline motion", () => {
    for (const reversed of [false, true]) {
      const c = clipOf(
        ok(
          setMotionPreset(
            video({ sourceIn: 2, sourceOut: 8, speed: 2, reversed }),
            "clip",
            "punch-in",
            "subtle",
            3,
            1,
          ),
        ),
      );
      expect(transformAt(c, 2).scale).toBeCloseTo(1);
      expect(transformAt(c, 3.3).scale).toBeCloseTo(1.12);
      expect(transformAt(c, 4.5).scale).toBeCloseTo(1);
    }
  });

  it("clamps late punch-ins to the clip and zoom intensity to the schema bounds", () => {
    const c = clipOf(ok(setMotionPreset(video({ scale: 3.8 }), "clip", "punch-in", "dynamic", 999, 2)));
    expect(transformAt(c, 11).scale).toBe(TRANSFORM_LIMITS.maxScale);
    expect(c.keyframes!.scale!.every((key) => key.t >= 0 && key.t <= 10)).toBe(true);
    const push = clipOf(ok(setMotionPreset(video(), "clip", "slow-push", "subtle", 0)));
    expect(transformAt(push, 2).scale).toBe(1);
    expect(transformAt(push, 12).scale).toBeCloseTo(1.1);
  });

  it("animates text entrance and exit and rejects applying text motion to video", () => {
    const p = makeProject();
    const added = addTextClip(p, {
      picture: "/m/title.png",
      spec: defaultTextSpec(p.settings.height),
      start: 0,
      assetId: "title",
      clipId: "clip",
      trackId: "title-track",
    });
    if (!added.ok) throw new Error(added.error.message);
    const c = clipOf(ok(setMotionPreset(added.project, "clip", "text-pop", "dynamic", 0)));
    expect(transformAt(c, 0).opacity).toBe(0);
    expect(transformAt(c, 0.5).opacity).toBe(1);
    expect(transformAt(c, c.sourceOut).opacity).toBe(0);
    expect(c.keyframes!.y).toBeDefined();
    expect(setMotionPreset(video(), "clip", "text-pop", "subtle", 0).ok).toBe(false);
    expect(setMotionPreset(video({ sourceOut: 0.05 }), "clip", "punch-in", "subtle", 0).ok).toBe(false);
  });

  it("offers style and intensity controls and applies the entire motion as one undo step", () => {
    const p = video();
    useProjectStore.setState({ project: p, past: [], future: [] });
    usePlaybackStore.setState({ playhead: 5 });
    render(<MotionPresetsPanel clip={clipOf(p)} />);
    fireEvent.change(screen.getByLabelText("Motion style"), { target: { value: "slow-push" } });
    fireEvent.change(screen.getByLabelText("Intensity"), { target: { value: "dynamic" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply motion" }));
    expect(useProjectStore.getState().past).toHaveLength(1);
    expect(transformAt(clipOf(useProjectStore.getState().project), 12).scale).toBeCloseTo(1.25);
    act(() => useProjectStore.getState().undo());
    expect(useProjectStore.getState().project).toBe(p);
  });
});
