import { fireEvent, render, screen } from "@testing-library/react";
import { invoke } from "@tauri-apps/api/core";
import { SubtitleLook } from "@/components/text/SubtitleLook";
import { TextSpecSchema, type TextSpec } from "@/project/model";
import { useProjectStore } from "@/store/project";
import { PREFS_KEY, useTextStyleStore } from "@/store/textStyles";
import { expectValid, makeProject } from "@/test/makeProject";
import { placeSubtitles } from "./subtitles";
import { withStyle } from "./textStyles";
import { activeWordCaptions, DEFAULT_WORD_HIGHLIGHT, withActiveWord } from "./wordCaptions";

const style = {
  color: "#FFFFFF",
  bold: true,
  highlight: {
    color: "#000000",
    lines: "last" as const,
    word: { ...DEFAULT_WORD_HIGHLIGHT, maxWords: 2 },
  },
};

beforeEach(() => {
  useProjectStore.getState().loadProject(makeProject(), "/test.cutvii", []);
  useTextStyleStore.getState().reset();
  vi.mocked(invoke).mockReset();
  vi.mocked(invoke).mockImplementation(async (cmd, args) => {
    if (cmd === "split_captions") return (args as { request: { sources: unknown[] } }).request.sources;
    if (cmd === "render_text") return `/cache/${JSON.stringify(args)}.png`;
    if (cmd === "text_fonts") return [];
    return undefined;
  });
});

it("holds a stable phrase while its active word advances, on non-overlapping whole frames", () => {
  const states = activeWordCaptions([{ start: 1, duration: 2, text: "nggak saya edit video" }], style, 30);
  expect(states.map((s) => [s.text, s.activeWord])).toEqual([
    ["nggak saya", 0],
    ["nggak saya", 1],
    ["edit video", 0],
    ["edit video", 1],
  ]);
  expect(states[0].start).toBe(1);
  expect(states.at(-1)!.start + states.at(-1)!.duration).toBeCloseTo(3);
  states.forEach((s, i) => {
    expect(s.start * 30).toBeCloseTo(Math.round(s.start * 30));
    if (i) expect(s.start).toBeCloseTo(states[i - 1].start + states[i - 1].duration);
  });
  expect(
    activeWordCaptions([{ start: 0, duration: 0.1, text: "one two three four" }], style, 10),
  ).toHaveLength(1);
});

it("renders and saves the selected word and its custom colours as editable text, in one undo step", async () => {
  const before = useProjectStore.getState().project;
  const result = await placeSubtitles([{ start: 0, duration: 2, text: "nggak saya edit video" }], {
    label: "Word subtitles",
    language: "id",
    endLimit: 2,
    style: { style },
  });
  expect(result).toEqual({ ok: true, added: 4 });
  const project = useProjectStore.getState().project;
  expectValid(project);
  const specs = project.assets.filter((a) => a.text).map((a) => a.text!);
  expect(specs.map((s) => s.highlight!.word!.index)).toEqual([0, 1, 0, 1]);
  expect(specs[1].highlight).toMatchObject({ color: "#000000", word: { boxColor: "#FFFFFF" } });
  useProjectStore.getState().undo();
  expect(useProjectStore.getState().project).toEqual(before);
});

it("customises base and active boxes independently, then persists a reusable subtitle preset", () => {
  render(<SubtitleLook />);
  fireEvent.click(screen.getByRole("button", { name: "Customize" }));
  fireEvent.click(screen.getByRole("checkbox", { name: "Background box" }));
  fireEvent.click(screen.getByRole("radio", { name: "Per word" }));
  fireEvent.change(screen.getByLabelText("Base box rotation"), { target: { value: "-12" } });
  fireEvent.change(screen.getByLabelText("Box colour"), { target: { value: "#112233" } });
  fireEvent.click(screen.getByRole("checkbox", { name: "Highlight active word" }));
  fireEvent.change(screen.getByLabelText("Active word box rotation"), { target: { value: "8" } });
  fireEvent.change(screen.getByLabelText("Active word box colour"), { target: { value: "#ffcc00" } });
  fireEvent.change(screen.getByLabelText("Active word text colour"), { target: { value: "#222222" } });
  fireEvent.change(screen.getByLabelText("Active word box roundness"), { target: { value: "40" } });
  fireEvent.change(screen.getByLabelText("Words per caption"), { target: { value: "2" } });
  fireEvent.change(screen.getByLabelText("Preset name"), { target: { value: "My word captions" } });
  fireEvent.click(screen.getByRole("button", { name: "Save as subtitle preset" }));
  const mine = useTextStyleStore.getState().mine.find((p) => p.name === "My word captions")!;
  expect(mine.style.box!.color).toBe("#112233");
  expect(mine.style.box).toMatchObject({ shape: "per-word", rotation: -12 });
  expect(mine.style.highlight).toMatchObject({
    color: "#222222",
    word: { boxColor: "#FFCC00", radius: 0.4, maxWords: 2, rotation: 8 },
  });
  const persisted = JSON.parse(localStorage.getItem(PREFS_KEY)!);
  expect(persisted.mine.find((p: { id: string }) => p.id === mine.id).style).toEqual(mine.style);
});

it("validates custom word parameters and does not mutate the saved style between states", () => {
  const spec: TextSpec = { content: "saya edit", fontSize: 64, x: 0.5, y: 0.8, ...style };
  const next = withActiveWord(spec, 1);
  expect(spec.highlight!.word!.index).toBe(0);
  expect(next.highlight!.word!.index).toBe(1);
  expect(withStyle(next, style).highlight!.word!.index).toBe(1);
  expect(TextSpecSchema.safeParse(next).success).toBe(true);
  expect(
    TextSpecSchema.safeParse({
      ...next,
      highlight: { ...next.highlight, word: { ...next.highlight!.word, index: -1 } },
    }).success,
  ).toBe(false);
});
