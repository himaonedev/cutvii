import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TopBar } from "./layout/TopBar";
import { SettingsDialog } from "./SettingsDialog";
import { TooltipProvider } from "./ui/tooltip";
import { useUiStore } from "@/store/ui";
import { useThemeStore, THEME_STORAGE_KEY } from "@/store/theme";
import { useProjectStore } from "@/store/project";

beforeEach(() => {
  useThemeStore.getState().setTheme("orange");
  useUiStore.setState({ settingsOpen: false });
});
afterEach(() => {
  useThemeStore.getState().setTheme("orange");
  localStorage.removeItem(THEME_STORAGE_KEY);
  useUiStore.setState({ settingsOpen: false });
});
it("opens Appearance directly from the editor header and applies the chosen theme", async () => {
  const before = useProjectStore.getState().project;
  render(
    <TooltipProvider>
      <TopBar />
    </TooltipProvider>,
  );
  const button = screen.getByRole("button", { name: "Appearance" });
  await userEvent.click(button);
  const rose = await screen.findByRole("radio", { name: "Rose" });
  expect(screen.getAllByRole("radio")).toHaveLength(12);
  await userEvent.click(rose);
  expect(document.documentElement.dataset.theme).toBe("rose");
  expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("rose");
  expect(useUiStore.getState().settingsOpen).toBe(false);
  expect(useProjectStore.getState().project).toBe(before);
  await userEvent.keyboard("{Escape}");
  await waitFor(() =>
    expect(screen.queryByRole("radiogroup", { name: "Colour theme" })).not.toBeInTheDocument(),
  );
  expect(button).toHaveFocus();
});
it("also offers the same theme choices in Home Settings", async () => {
  useUiStore.setState({ settingsOpen: true });
  render(<SettingsDialog />);
  expect(screen.getByRole("radiogroup", { name: "Colour theme" })).toBeInTheDocument();
  expect(screen.getAllByRole("radio")).toHaveLength(12);
  await userEvent.click(screen.getByRole("radio", { name: "Sunset" }));
  expect(useThemeStore.getState().theme).toBe("sunset");
  expect(screen.queryByLabelText("Base colour")).not.toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: /Check for updates automatically/ })).toBeInTheDocument();
});
