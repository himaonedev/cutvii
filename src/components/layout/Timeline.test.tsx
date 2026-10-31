import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TooltipProvider } from "@/components/ui/tooltip";
import App from "@/App";
import { useTrackLocksStore } from "@/store/trackLocks";
import { useProjectStore } from "@/store/project";
import { usePlaybackStore } from "@/store/playback";
import { useSelectionStore } from "@/store/selection";
import { useTimelineViewStore } from "@/store/timelineView";
import { useUiStore } from "@/store/ui";
import { addAssetToTimeline } from "@/timeline/editor";
import { expectValid, IDS, makeProject } from "@/test/makeProject";
import { findClip } from "@/timeline/clips";
import { ROW_HEIGHT } from "@/timeline/geometry";
import { Timeline } from "./Timeline";

const state = () => useProjectStore.getState();
const clips = () => state().project.tracks.flatMap((t) => t.clips);

function setup() {
  return render(
    <TooltipProvider>
      <Timeline />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  useTrackLocksStore.setState({ locks: {} });
  useProjectStore.setState({ project: makeProject(), past: [], future: [] });
  useSelectionStore.setState({ selectedClipIds: [] });
  usePlaybackStore.setState({ playhead: 0 });
  useTimelineViewStore.setState({ pps: 50, snapping: true, trackHeights: {}, waveformSizes: {} });
  useUiStore.setState({ notice: null });
});

describe("Timeline", () => {
  it("renders a lane per track and a clip per placed asset", () => {
    addAssetToTimeline(IDS.vid);
    addAssetToTimeline(IDS.aud);
    setup();
    expect(screen.getAllByRole("group", { name: /lane$/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: "vid.mp4 clip" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "aud.mp3 clip" })).toBeInTheDocument();
  });

  it("selects on click, additive on shift, and clears on empty lane click", async () => {
    addAssetToTimeline(IDS.vid);
    addAssetToTimeline(IDS.aud);
    useSelectionStore.getState().clear();
    setup();
    const vid = screen.getByRole("button", { name: "vid.mp4 clip" });
    const aud = screen.getByRole("button", { name: "aud.mp3 clip" });

    fireEvent.pointerDown(vid, { button: 0 });
    fireEvent.pointerUp(window);
    expect(useSelectionStore.getState().selectedClipIds).toHaveLength(1);
    expect(vid).toHaveAttribute("aria-pressed", "true");

    fireEvent.pointerDown(aud, { button: 0, shiftKey: true });
    expect(useSelectionStore.getState().selectedClipIds).toHaveLength(2);

    fireEvent.pointerDown(screen.getByRole("group", { name: "Video 1 lane" }), { button: 0 });
    expect(useSelectionStore.getState().selectedClipIds).toHaveLength(0);
  });

  it("moves a clip by dragging, as one undo step", () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    const id = clips()[0].id;
    const past = state().past.length;
    setup();
    const clip = screen.getByRole("button", { name: "vid.mp4 clip" });
    const y = ROW_HEIGHT / 2; // jsdom has no layout: lanes start at y=0, so this is the middle of the first lane

    fireEvent.pointerDown(clip, { button: 0, clientX: 10, clientY: y });
    fireEvent.pointerMove(window, { clientX: 110, clientY: y }); // +100px = +2s
    expect(findClip(state().project, id)!.clip.timelineStart).toBe(0); // preview only, not committed
    fireEvent.pointerUp(window);

    expect(findClip(state().project, id)!.clip.timelineStart).toBe(2);
    expect(state().past).toHaveLength(past + 1);
    expectValid(state().project);
  });

  it("a clip dragged onto the front of another takes its place, and that one moves later", () => {
    addAssetToTimeline(IDS.vid, { start: 0 }); // 0..10
    addAssetToTimeline(IDS.vid2, { start: 12 }); // 12..16
    const first = clips().find((c) => c.assetId === IDS.vid)!.id;
    const id = clips().find((c) => c.assetId === IDS.vid2)!.id;
    const past = state().past.length;
    setup();
    const y = ROW_HEIGHT / 2; // jsdom has no layout: lanes start at y=0, so this is the middle of the first lane

    fireEvent.pointerDown(screen.getByRole("button", { name: "vid2.mp4 clip" }), {
      button: 0,
      clientX: 600,
      clientY: y,
    });
    fireEvent.pointerMove(window, { clientX: 100, clientY: y }); // -10s -> would start at 2, on the first half
    // the label by the pointer says how far the clip has gone: from 12 s to 0
    expect(screen.getByTestId("move-delta")).toHaveTextContent("-00:00:12:00");
    fireEvent.pointerUp(window);
    expect(screen.queryByTestId("move-delta")).not.toBeInTheDocument();

    expect(findClip(state().project, id)!.clip.timelineStart).toBe(0); // it is the first clip now
    expect(findClip(state().project, first)!.clip.timelineStart).toBe(4); // and the other follows it
    expect(state().past).toHaveLength(past + 1); // one undo step for both
    expect(useUiStore.getState().notice).toBeNull(); // no "would overlap" any more
    expectValid(state().project);
  });

  it("trims with the edge handle", () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    const id = clips()[0].id;
    setup();
    const y = ROW_HEIGHT / 2; // jsdom has no layout: lanes start at y=0, so this is the middle of the first lane
    fireEvent.pointerDown(
      within(screen.getByRole("button", { name: "vid.mp4 clip" })).getByTestId("trim-end"),
      {
        button: 0,
        clientX: 500,
        clientY: y,
      },
    );
    fireEvent.pointerMove(window, { clientX: 300, clientY: y }); // -4s
    fireEvent.pointerUp(window);
    expect(findClip(state().project, id)!.clip).toMatchObject({ sourceIn: 0, sourceOut: 6 });
  });

  it("Escape cancels a drag", () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    const id = clips()[0].id;
    setup();
    const y = ROW_HEIGHT / 2; // jsdom has no layout: lanes start at y=0, so this is the middle of the first lane
    fireEvent.pointerDown(screen.getByRole("button", { name: "vid.mp4 clip" }), {
      button: 0,
      clientX: 0,
      clientY: y,
    });
    fireEvent.pointerMove(window, { clientX: 100, clientY: y });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.pointerUp(window);
    expect(findClip(state().project, id)!.clip.timelineStart).toBe(0);
  });

  it("toolbar: split, delete, undo, zoom and snapping toggle", async () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    usePlaybackStore.getState().setPlayhead(4);
    setup();

    await userEvent.click(screen.getByRole("button", { name: "Split at playhead (S)" }));
    expect(clips()).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Delete selected (Del)" }));
    expect(clips()).toHaveLength(1);

    await userEvent.click(screen.getByRole("button", { name: "Zoom in" }));
    expect(useTimelineViewStore.getState().pps).toBeGreaterThan(50);
    await userEvent.click(screen.getByRole("button", { name: "Snapping on" }));
    expect(useTimelineViewStore.getState().snapping).toBe(false);
  });

  it("context menu splits and deletes", async () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    usePlaybackStore.getState().setPlayhead(5);
    setup();
    fireEvent.contextMenu(screen.getByRole("button", { name: "vid.mp4 clip" }), { clientX: 20, clientY: 20 });
    await userEvent.click(await screen.findByRole("menuitem", { name: /Split at playhead/ }));
    expect(clips()).toHaveLength(2);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    fireEvent.contextMenu(screen.getAllByRole("button", { name: "vid.mp4 clip" })[0], {
      clientX: 20,
      clientY: 20,
    });
    await userEvent.click(await screen.findByRole("menuitem", { name: /Delete/ }));
    expect(clips()).toHaveLength(1);
  });

  it("opens the dedicated Motion tab from the clip menu", async () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    const id = useSelectionStore.getState().selectedClipIds[0];
    setup();
    fireEvent.contextMenu(screen.getByRole("button", { name: "vid.mp4 clip" }), { clientX: 20, clientY: 20 });
    await userEvent.click(await screen.findByRole("menuitem", { name: "Motion presets…" }));
    expect(useUiStore.getState().inspectorTab.video).toBe("motion");
    expect(useUiStore.getState().sidePanel).toBe("inspector");
    expect(useSelectionStore.getState().selectedClipIds).toEqual([id]);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("windows rendering: far-away clips are not in the DOM", () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    addAssetToTimeline(IDS.vid2, { start: 5000 });
    setup();
    expect(screen.getByRole("button", { name: "vid.mp4 clip" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "vid2.mp4 clip" })).not.toBeInTheDocument();
  });

  it("playhead follows the store and the ruler scrubs it", () => {
    setup();
    act(() => usePlaybackStore.getState().setPlayhead(2));
    expect(screen.getByTestId("playhead")).toHaveStyle({ left: "100px" });
    fireEvent.pointerDown(screen.getByTestId("ruler"), { button: 0, clientX: 300 }); // 6s
    fireEvent.pointerUp(window);
    expect(usePlaybackStore.getState().playhead).toBeCloseTo(6);
  });
});

describe("keyboard shortcuts", () => {
  function setupApp() {
    addAssetToTimeline(IDS.vid, { start: 0 });
    usePlaybackStore.getState().setPlayhead(4);
    return render(<App />);
  }

  it("S splits, Delete removes, Ctrl+Z / Ctrl+Shift+Z undo and redo", () => {
    setupApp();
    fireEvent.keyDown(window, { key: "s" });
    expect(clips()).toHaveLength(2);
    fireEvent.keyDown(window, { key: "Delete" });
    expect(clips()).toHaveLength(1); // selection after add is the original clip id
    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    expect(clips()).toHaveLength(2);
    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    expect(clips()).toHaveLength(1);
  });

  it("arrow keys and Home move the playhead; typing in an input is ignored", () => {
    setupApp();
    fireEvent.keyDown(window, { key: "ArrowRight", shiftKey: true });
    expect(usePlaybackStore.getState().playhead).toBeCloseTo(5);
    fireEvent.keyDown(window, { key: "Home" });
    expect(usePlaybackStore.getState().playhead).toBe(0);

    const input = screen.getByRole("searchbox", { name: "Search media" });
    fireEvent.keyDown(input, { key: "s" });
    expect(clips()).toHaveLength(1);
  });
});

describe("track controls and semantics", () => {
  it("mute and hide are undoable toggles that reflect state", async () => {
    setup();
    const mute = screen.getByRole("button", { name: "Mute Video 1" });
    expect(mute).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(mute);
    expect(state().project.tracks[0].muted).toBe(true);
    expect(screen.getByRole("button", { name: "Unmute Video 1" })).toHaveAttribute("aria-pressed", "true");
    expect(state().past.at(-1)?.label).toBe("Mute track");

    await userEvent.click(screen.getByRole("button", { name: "Hide Video 2" }));
    expect(state().project.tracks[1].hidden).toBe(true);
    // audio tracks have no picture to hide
    expect(screen.queryByRole("button", { name: /Hide Audio 1/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mute Audio 1" })).toBeInTheDocument();
  });

  it("shows a hint on an empty timeline and removes it once something is placed", () => {
    const { unmount } = setup();
    expect(screen.getByText(/Drag media from the library onto a track/)).toBeInTheDocument();
    unmount();
    addAssetToTimeline(IDS.vid);
    setup();
    expect(screen.queryByText(/Drag media from the library onto a track/)).not.toBeInTheDocument();
  });

  it("the ruler is a keyboard-operable slider for the playhead", () => {
    addAssetToTimeline(IDS.vid);
    setup();
    const slider = screen.getByRole("slider", { name: "Playhead position" });
    expect(slider).toHaveAttribute("aria-valuemax", "10");
    fireEvent.keyDown(slider, { key: "ArrowRight", shiftKey: true });
    expect(usePlaybackStore.getState().playhead).toBeCloseTo(1);
    expect(slider).toHaveAttribute("aria-valuenow", "1");
    fireEvent.keyDown(slider, { key: "ArrowLeft" });
    expect(usePlaybackStore.getState().playhead).toBeCloseTo(1 - 1 / 30);
  });
});

describe("timeline viewport after zoom and scroll", () => {
  it("clamps an old horizontal offset after zoom-out and keeps clips windowed at the visible start", () => {
    addAssetToTimeline(IDS.vid);
    useTimelineViewStore.setState({ pps: 50, scrollTarget: null });
    setup();
    const scroller = document.querySelector<HTMLElement>("[data-timeline-scroller]")!;
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 912 });
    scroller.scrollLeft = 150;
    fireEvent.scroll(scroller);
    expect(document.querySelector<HTMLElement>("[data-timeline-content]")!.style.width).toBe("1000px");
    act(() => useTimelineViewStore.setState({ pps: 4 }));
    expect(scroller.scrollLeft).toBe(0);
    expect(document.querySelector<HTMLElement>("[data-timeline-content]")!.style.width).toBe("800px");
    expect(document.querySelector<HTMLElement>("[data-timeline-surface]")!.style.width).toBe("912px");
    expect(screen.getByRole("button", { name: "vid.mp4 clip" })).toBeInTheDocument();
    expect(screen.getByTestId("ruler").className).toContain("overflow-hidden");
  });
  it("fits the project to the lanes only, excluding the pinned track headers", () => {
    addAssetToTimeline(IDS.vid);
    setup();
    const scroller = document.querySelector<HTMLElement>("[data-timeline-scroller]")!;
    Object.defineProperty(scroller, "clientWidth", { configurable: true, value: 912 });
    fireEvent.scroll(scroller);
    fireEvent.click(screen.getByRole("button", { name: "Fit project" }));
    expect(useTimelineViewStore.getState().pps).toBe(800 / 20);
    expect(scroller.scrollLeft).toBe(0);
  });
});

describe("new visual and audio layers", () => {
  it("keeps a full blank drop row after each media group", () => {
    setup();
    expect(document.querySelector('[data-layer-zone="video"]')).toHaveStyle({ height: `${ROW_HEIGHT}px` });
    expect(document.querySelector('[data-layer-zone="audio"]')).toHaveStyle({ height: `${ROW_HEIGHT}px` });
  });
  it("dragging a clip to a track edge creates a layer as a single undoable move", () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    const before = state().project,
      id = clips()[0].id;
    setup();
    fireEvent.pointerDown(screen.getByRole("button", { name: "vid.mp4 clip" }), {
      button: 0,
      clientX: 10,
      clientY: ROW_HEIGHT / 2,
    });
    fireEvent.pointerMove(window, { clientX: 110, clientY: 2 });
    expect(state().project).toBe(before);
    fireEvent.pointerUp(window);
    expect(state().project.tracks).toHaveLength(1); // vacated and previously empty tracks are cleaned
    const moved = findClip(state().project, id)!;
    expect(moved.track.type).toBe("video");
    expect(moved.track.id).not.toBe(IDS.v1);
    expect(moved.clip.timelineStart).toBe(2);
    expectValid(state().project);
    act(() => state().undo());
    expect(state().project).toBe(before);
  });
  it("Escape cancels creation of a new layer without leaving an empty track", () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    const before = state().project;
    setup();
    fireEvent.pointerDown(screen.getByRole("button", { name: "vid.mp4 clip" }), {
      button: 0,
      clientX: 10,
      clientY: ROW_HEIGHT / 2,
    });
    fireEvent.pointerMove(window, { clientX: 110, clientY: 2 });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.pointerUp(window);
    expect(state().project).toBe(before);
  });
});

describe("track deletion and automatic empty-track cleanup", () => {
  it("deletes a track with its clips, clears stale selection, retains media and restores it with Undo", async () => {
    addAssetToTimeline(IDS.vid);
    const before = state().project;
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Track options for Video 1" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete Video 1 track" }));
    expect(state().project.tracks.some((t) => t.id === IDS.v1)).toBe(false);
    expect(state().project.assets).toBe(before.assets);
    expect(useSelectionStore.getState().selectedClipIds).toEqual([]);
    expect(screen.queryByRole("button", { name: "vid.mp4 clip" })).not.toBeInTheDocument();
    expectValid(state().project);
    act(() => state().undo());
    expect(state().project).toBe(before);
    expect(screen.getByRole("button", { name: "vid.mp4 clip" })).toBeInTheDocument();
  });
  it("allows removing every empty track while keeping both media drop zones available", async () => {
    setup();
    const names = state().project.tracks.map((t) => t.name);
    for (const name of names) {
      await userEvent.click(screen.getByRole("button", { name: `Track options for ${name}` }));
      await userEvent.click(await screen.findByRole("menuitem", { name: `Delete ${name} track` }));
    }
    expect(state().project.tracks).toHaveLength(0);
    expect(document.querySelector('[data-layer-zone="video"]')).toBeInTheDocument();
    expect(document.querySelector('[data-layer-zone="audio"]')).toBeInTheDocument();
    expectValid(state().project);
  });
  it("cleans empty layers after moving into another populated track in the same Undo step", () => {
    addAssetToTimeline(IDS.vid, { trackId: IDS.v1, start: 0 });
    addAssetToTimeline(IDS.vid2, { trackId: IDS.v2, start: 12 });
    const before = state().project,
      id = findClip(before, before.tracks[0].clips[0].id)!.clip.id;
    setup();
    fireEvent.pointerDown(screen.getByRole("button", { name: "vid.mp4 clip" }), {
      button: 0,
      clientX: 10,
      clientY: ROW_HEIGHT / 2,
    });
    fireEvent.pointerMove(window, { clientX: 60, clientY: ROW_HEIGHT * 1.5 });
    fireEvent.pointerUp(window);
    expect(state().project.tracks).toHaveLength(1);
    expect(findClip(state().project, id)?.track.id).toBe(IDS.v2);
    expect(state().project.tracks[0].clips).toHaveLength(2);
    expectValid(state().project);
    act(() => state().undo());
    expect(state().project).toBe(before);
  });
});

describe("compact track menus", () => {
  it("adjusts track height and waveform display through submenus without editing the project", async () => {
    addAssetToTimeline(IDS.vid);
    const before = state().project;
    setup();
    expect(screen.queryByRole("button", { name: "Delete Video 1 track" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Track options for Video 1" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Track height" }));
    await userEvent.click(await screen.findByRole("menuitemradio", { name: "Large" }));
    expect(screen.getByRole("group", { name: "Video 1 lane" })).toHaveStyle({ height: "96px" });
    expect(screen.getByRole("group", { name: "Video 2 lane" })).toHaveStyle({ top: "96px" });
    expect(state().project).toBe(before);
    await userEvent.click(screen.getByRole("button", { name: "Track options for Video 1" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Audio waveform size" }));
    await userEvent.click(await screen.findByRole("menuitemradio", { name: "Hidden" }));
    expect(useTimelineViewStore.getState().waveformSizes[IDS.v1]).toBe(0);
    expect(screen.queryByTestId("waveform-placeholder")).not.toBeInTheDocument();
    expect(state().project).toBe(before);
  });
});

it("shows icon-only track controls and prevents dragging or splitting a locked clip", async () => {
  addAssetToTimeline(IDS.vid);
  usePlaybackStore.setState({ playhead: 4 });
  const before = state().project;
  setup();
  expect(screen.queryByText("Video 1", { exact: true })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Lock Video 1" }));
  expect(screen.getByRole("button", { name: "Unlock Video 1" })).toHaveAttribute("aria-pressed", "true");
  expect(screen.getByRole("group", { name: "Video 1 lane" })).toHaveAttribute("data-locked", "true");
  fireEvent.pointerDown(screen.getByRole("button", { name: "vid.mp4 clip" }), {
    button: 0,
    clientX: 10,
    clientY: ROW_HEIGHT / 2,
  });
  fireEvent.pointerMove(window, { clientX: 110, clientY: ROW_HEIGHT / 2 });
  fireEvent.pointerUp(window);
  expect(state().project).toBe(before);
  await userEvent.click(screen.getByRole("button", { name: "Split at playhead (S)" }));
  expect(state().project).toBe(before);
  await userEvent.click(screen.getByRole("button", { name: "Unlock Video 1" }));
  await userEvent.click(screen.getByRole("button", { name: "Split at playhead (S)" }));
  expect(clips()).toHaveLength(2);
});

describe("Alt-drag duplication", () => {
  it("copies into free space and selects the copy as one undoable edit", () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    const before = state().project,
      original = clips()[0];
    setup();
    fireEvent.pointerDown(screen.getByRole("button", { name: "vid.mp4 clip" }), {
      button: 0,
      clientX: 10,
      clientY: ROW_HEIGHT / 2,
      altKey: true,
    });
    fireEvent.pointerMove(window, { clientX: 512, clientY: ROW_HEIGHT / 2, altKey: true });
    expect(screen.getByTestId("move-delta")).toHaveTextContent("Copy");
    expect(state().project).toBe(before);
    fireEvent.pointerUp(window, { altKey: true });
    expect(clips()).toHaveLength(2);
    expect(findClip(state().project, original.id)?.clip).toEqual(original);
    const copy = clips().find((c) => c.id !== original.id)!;
    expect(copy.timelineStart).toBe(10);
    expect(useSelectionStore.getState().selectedClipIds).toEqual([copy.id]);
    expectValid(state().project);
    act(() => state().undo());
    expect(state().project).toBe(before);
  });
  it("copies to a new layer without removing the original track", () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    const original = clips()[0];
    setup();
    fireEvent.pointerDown(screen.getByRole("button", { name: "vid.mp4 clip" }), {
      button: 0,
      clientX: 10,
      clientY: ROW_HEIGHT / 2,
      altKey: true,
    });
    fireEvent.pointerMove(window, { clientX: 10, clientY: 2, altKey: true });
    fireEvent.pointerUp(window, { altKey: true });
    expect(clips()).toHaveLength(2);
    expect(findClip(state().project, original.id)?.track.id).toBe(IDS.v1);
    expect(clips().find((c) => c.id !== original.id)?.trackId).not.toBe(IDS.v1);
    expectValid(state().project);
  });
  it("releasing Alt switches back to moving, while Escape cancels copying", () => {
    addAssetToTimeline(IDS.vid, { start: 0 });
    const before = state().project,
      original = clips()[0];
    setup();
    fireEvent.pointerDown(screen.getByRole("button", { name: "vid.mp4 clip" }), {
      button: 0,
      clientX: 10,
      clientY: ROW_HEIGHT / 2,
      altKey: true,
    });
    fireEvent.pointerMove(window, { clientX: 610, clientY: ROW_HEIGHT / 2, altKey: true });
    fireEvent.keyUp(window, { key: "Alt" });
    expect(screen.getByTestId("move-delta")).not.toHaveTextContent("Copy");
    fireEvent.pointerUp(window);
    expect(clips()).toHaveLength(1);
    expect(findClip(state().project, original.id)?.clip.timelineStart).toBe(12);
    act(() => state().undo());
    expect(state().project).toBe(before);
    fireEvent.pointerDown(screen.getByRole("button", { name: "vid.mp4 clip" }), {
      button: 0,
      clientX: 10,
      clientY: ROW_HEIGHT / 2,
      altKey: true,
    });
    fireEvent.pointerMove(window, { clientX: 610, clientY: ROW_HEIGHT / 2, altKey: true });
    fireEvent.keyDown(window, { key: "Escape" });
    fireEvent.pointerUp(window);
    expect(state().project).toBe(before);
  });
});

it("right-click Delete removes the last clip and its empty track together, with one Undo", async () => {
  addAssetToTimeline(IDS.vid, { start: 0 });
  const before = state().project;
  setup();
  fireEvent.contextMenu(screen.getByRole("button", { name: "vid.mp4 clip" }), { clientX: 160, clientY: 300 });
  await userEvent.click(await screen.findByRole("menuitem", { name: /^Delete/ }));
  expect(clips()).toHaveLength(0);
  expect(state().project.tracks).toHaveLength(0);
  expect(screen.queryByRole("group", { name: "Video 1 lane" })).not.toBeInTheDocument();
  expect(document.querySelector('[data-layer-zone="video"]')).toBeInTheDocument();
  expect(document.querySelector('[data-layer-zone="audio"]')).toBeInTheDocument();
  expectValid(state().project);
  act(() => state().undo());
  expect(state().project).toBe(before);
  expect(screen.getByRole("button", { name: "vid.mp4 clip" })).toBeInTheDocument();
});
