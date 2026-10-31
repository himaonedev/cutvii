import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSettings } from "./ThemeSettings";
import { useUiStore } from "@/store/ui";
import { useProjectStore } from "@/store/project";
import { THEMES, THEME_STORAGE_KEY, useThemeStore, readTheme, initializeTheme } from "@/store/theme";

beforeEach(() => {
  useThemeStore.getState().setTheme("orange");
  useUiStore.setState({ settingsOpen: true });
});
afterEach(() => {
  useThemeStore.getState().setTheme("orange");
  localStorage.removeItem(THEME_STORAGE_KEY);
  useUiStore.setState({ settingsOpen: false });
});
it("offers one-click presets and applies and saves changes without modifying the project", async () => {
  const before = useProjectStore.getState().project,
    past = useProjectStore.getState().past;
  render(<ThemeSettings />);
  expect(screen.getAllByRole("radio")).toHaveLength(12);
  await userEvent.click(screen.getByRole("radio", { name: "Ocean Blue" }));
  expect(screen.getByRole("radio", { name: "Ocean Blue" })).toHaveAttribute("aria-checked", "true");
  expect(document.documentElement.dataset.theme).toBe("blue");
  expect(getComputedStyle(document.documentElement).getPropertyValue("--accent")).toBe(THEMES[1].accent);
  expect(getComputedStyle(document.documentElement).getPropertyValue("--clip-video")).toBe(THEMES[1].video);
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("blue");
  expect(readTheme()).toBe("blue");
  expect(useProjectStore.getState().project).toBe(before);
  expect(useProjectStore.getState().past).toBe(past);
});
it("supports keyboard palette selection and restores the chosen palette at startup", () => {
  render(<ThemeSettings />);
  fireEvent.keyDown(screen.getByRole("radio", { name: "Orange" }), { key: "ArrowRight" });
  expect(screen.getByRole("radio", { name: "Ocean Blue" })).toHaveFocus();
  expect(useThemeStore.getState().theme).toBe("blue");
  document.documentElement.style.removeProperty("--accent");
  initializeTheme();
  expect(getComputedStyle(document.documentElement).getPropertyValue("--accent")).toBe(THEMES[1].accent);
});
it("falls back to Orange for invalid saved preferences and keeps working when storage is unavailable", () => {
  localStorage.setItem(THEME_STORAGE_KEY, "unsupported");
  expect(readTheme()).toBe("orange");
  const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("Blocked");
  });
  expect(() => useThemeStore.getState().setTheme("mint")).not.toThrow();
  expect(document.documentElement.dataset.theme).toBe("mint");
  blocked.mockRestore();
});

it("replaces the retired custom choice with Ocean Blue", () => {
  localStorage.setItem(THEME_STORAGE_KEY, "custom");
  expect(readTheme()).toBe("blue");
});
it("selects a new preset without custom colour controls", async () => {
  render(<ThemeSettings />);
  await userEvent.click(screen.getByRole("radio", { name: "Sunset" }));
  expect(readTheme()).toBe("sunset");
  expect(document.documentElement.dataset.theme).toBe("sunset");
  expect(screen.queryByRole("radio", { name: "Dynamic Trio" })).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Base colour")).not.toBeInTheDocument();
});

it("reuses palette rules and skips redundant changes without touching other root styles", () => {
  useThemeStore.getState().setTheme("blue");
  const stylesheet = document.getElementById("cutvii-theme-palettes");
  document.documentElement.style.setProperty("--unrelated-setting", "42px");
  const mutations = vi.spyOn(document.documentElement, "setAttribute");
  const writes = vi.spyOn(Storage.prototype, "setItem");
  useThemeStore.getState().setTheme("blue");
  expect(writes).not.toHaveBeenCalled();
  expect(mutations).not.toHaveBeenCalled();
  useThemeStore.getState().setTheme("sunset");
  expect(document.getElementById("cutvii-theme-palettes")).toBe(stylesheet);
  expect(document.querySelectorAll("#cutvii-theme-palettes")).toHaveLength(1);
  expect(document.documentElement.style.getPropertyValue("--unrelated-setting")).toBe("42px");
  document.documentElement.style.removeProperty("--unrelated-setting");
  writes.mockRestore();
  mutations.mockRestore();
});
