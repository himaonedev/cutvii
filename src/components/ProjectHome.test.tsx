import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import App from "@/App";
import { useUiStore } from "@/store/ui";
import { useProjectStore } from "@/store/project";
import { usePlaybackStore } from "@/store/playback";
import { makeProject } from "@/test/makeProject";
import type { RecentProject } from "@/lib/projectFile";
import { addClip } from "@/timeline/edit";

const mocked = vi.mocked(invoke);
let recent: RecentProject[];
let opened: unknown;
beforeEach(() => {
  mocked.mockReset();
  useProjectStore.getState().newProject();
  useUiStore.setState({ appView: "home", hasSession: false, dialog: null, newProjectOpen: false });
  recent = [
    { index: 0, name: "My Reel", path: "/projects/My Reel.cutvii", exists: true, modifiedAt: 1760000000 },
  ];
  opened = { path: recent[0].path, project: makeProject(), missingPaths: [] };
  mocked.mockImplementation(async (cmd) => {
    if (cmd === "recent_projects") return recent;
    if (cmd === "open_project" || cmd === "open_recent_project") return opened;
    return undefined;
  });
});

it("starts at project home with saved projects and no editor workspace", async () => {
  render(<App />);
  expect(screen.getByRole("button", { name: /New Project/ })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /Open Project/ })).toBeInTheDocument();
  expect(await screen.findByRole("button", { name: /My Reel/ })).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "Timeline" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Continue editing:/)).not.toBeInTheDocument();
});

it("stays home when New Project is cancelled and opens the workspace only after Create", async () => {
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: /New Project/ }));
  expect(screen.getByRole("dialog", { name: "New project" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
  expect(useUiStore.getState().appView).toBe("home");
  await userEvent.click(screen.getByRole("button", { name: /New Project/ }));
  await userEvent.click(screen.getByRole("button", { name: "Create project" }));
  expect(await screen.findByRole("region", { name: "Timeline" })).toBeInTheDocument();
  expect(useUiStore.getState().hasSession).toBe(true);
});

it("opens a recent project through its backend-owned index", async () => {
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: /My Reel/ }));
  expect(await screen.findByRole("region", { name: "Timeline" })).toBeInTheDocument();
  expect(mocked).toHaveBeenCalledWith("open_recent_project", { index: 0 });
  expect(useProjectStore.getState().filePath).toBe(recent[0].path);
});

it("stays home after cancelling Open and opens the editor after a successful retry", async () => {
  opened = null;
  render(<App />);
  await userEvent.click(screen.getByRole("button", { name: /Open Project/ }));
  await waitFor(() => expect(screen.getByRole("button", { name: /Open Project/ })).toBeEnabled());
  expect(useUiStore.getState().appView).toBe("home");
  opened = { path: recent[0].path, project: makeProject(), missingPaths: [] };
  await userEvent.click(screen.getByRole("button", { name: /Open Project/ }));
  expect(await screen.findByRole("region", { name: "Timeline" })).toBeInTheDocument();
});

it("handles an empty recent list and disables missing files", async () => {
  recent = [];
  const first = render(<App />);
  expect(await screen.findByText("No saved projects yet")).toBeInTheDocument();
  first.unmount();
  recent = [{ index: 0, name: "Missing", path: "/gone.cutvii", exists: false, modifiedAt: null }];
  render(<App />);
  expect(await screen.findByRole("button", { name: /Missing/ })).toBeDisabled();
  expect(screen.getByText("File not found")).toBeInTheDocument();
});

it("returns home without discarding edits and resumes the same session with playback paused", async () => {
  const placed = addClip(makeProject(), { assetId: "vid", trackId: "v1", id: "video", start: 0 });
  if (!placed.ok) throw new Error(placed.error.message);
  opened = { path: recent[0].path, project: placed.project, missingPaths: [] };
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: /My Reel/ }));
  await screen.findByRole("region", { name: "Timeline" });
  act(() => {
    useProjectStore
      .getState()
      .execute({ label: "Rename", apply: (p) => ({ ok: true, project: { ...p, name: "Unsaved reel" } }) });
    usePlaybackStore.setState({ playing: true, playhead: 3 });
  });
  const snapshot = useProjectStore.getState().project;
  await userEvent.click(screen.getByRole("button", { name: "Project home" }));
  expect(usePlaybackStore.getState().playing).toBe(false);
  expect(screen.queryByRole("region", { name: "Timeline" })).not.toBeInTheDocument();
  expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: /Continue editing:/ }));
  expect(screen.getByRole("region", { name: "Timeline" })).toBeInTheDocument();
  expect(useProjectStore.getState().project).toBe(snapshot);
  expect(useProjectStore.getState().past).toHaveLength(1);
  expect(usePlaybackStore.getState().playhead).toBe(3);
});

it("shows an unavailable recent list without blocking Open Project", async () => {
  mocked.mockImplementation(async (cmd) => {
    if (cmd === "recent_projects") throw new Error("cannot read history");
    if (cmd === "open_project") return opened;
    return undefined;
  });
  render(<App />);
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not load recent projects");
  await userEvent.click(screen.getByRole("button", { name: /Open Project/ }));
  expect(await screen.findByRole("region", { name: "Timeline" })).toBeInTheDocument();
});

it("keeps the home screen when a selected project fails validation", async () => {
  opened = { path: recent[0].path, project: { schemaVersion: 999 }, missingPaths: [] };
  render(<App />);
  await userEvent.click(await screen.findByRole("button", { name: /My Reel/ }));
  expect(await screen.findByRole("alertdialog", { name: "This project can't be opened" })).toBeInTheDocument();
  expect(useUiStore.getState().appView).toBe("home");
  expect(screen.queryByRole("region", { name: "Timeline" })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "OK" }));
});

it("does not run editor playback shortcuts on the home screen", () => {
  render(<App />);
  usePlaybackStore.setState({ playing: false });
  fireEvent.keyDown(window, { key: " " });
  expect(usePlaybackStore.getState().playing).toBe(false);
});
