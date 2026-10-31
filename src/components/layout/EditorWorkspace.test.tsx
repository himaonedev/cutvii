import { fireEvent, render, screen } from "@testing-library/react";
import { EditorWorkspace, INSPECTOR_WIDTH_KEY, inspectorWidth } from "./EditorWorkspace";
import { useProjectStore } from "@/store/project";
const viewport = Object.getOwnPropertyDescriptor(window, "innerWidth");
beforeEach(() => {
  localStorage.removeItem(INSPECTOR_WIDTH_KEY);
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1600 });
});
afterEach(() => {
  if (viewport) Object.defineProperty(window, "innerWidth", viewport);
  localStorage.removeItem(INSPECTOR_WIDTH_KEY);
  document.body.style.cursor = "";
  document.body.style.userSelect = "";
});
it("drags the canvas boundary, persists width and leaves the project unchanged", () => {
  const project = useProjectStore.getState().project;
  const { container } = render(
    <EditorWorkspace>
      <div>Canvas</div>
    </EditorWorkspace>,
  );
  const divider = screen.getByRole("separator", { name: "Resize Inspector" });
  fireEvent.pointerDown(divider, { button: 0, pointerId: 1, clientX: 800 });
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 650 });
  fireEvent.pointerUp(window, { pointerId: 1, clientX: 650 });
  expect(divider).toHaveAttribute("aria-valuenow", "470");
  expect(container.querySelector("main")!.style.getPropertyValue("--inspector-width")).toBe("470px");
  expect(localStorage.getItem(INSPECTOR_WIDTH_KEY)).toBe("470");
  expect(useProjectStore.getState().project).toBe(project);
  fireEvent.doubleClick(divider);
  expect(divider).toHaveAttribute("aria-valuenow", "320");
});
it("clamps width to preserve canvas space and supports keyboard resizing", () => {
  expect(inspectorWidth(900, 1024)).toBe(496);
  expect(inspectorWidth(20, 1600)).toBe(280);
  render(
    <EditorWorkspace>
      <div />
    </EditorWorkspace>,
  );
  const divider = screen.getByRole("separator");
  fireEvent.keyDown(divider, { key: "ArrowLeft" });
  expect(divider).toHaveAttribute("aria-valuenow", "336");
  fireEvent.keyDown(divider, { key: "ArrowRight", shiftKey: true });
  expect(divider).toHaveAttribute("aria-valuenow", "304");
  fireEvent.keyDown(divider, { key: "End" });
  expect(divider).toHaveAttribute("aria-valuenow", "640");
  fireEvent.keyDown(divider, { key: "Home" });
  expect(divider).toHaveAttribute("aria-valuenow", "280");
  fireEvent.keyDown(divider, { key: "Enter" });
  expect(divider).toHaveAttribute("aria-valuenow", "320");
});
it("restores the preferred width after shrinking and expanding the app window", () => {
  localStorage.setItem(INSPECTOR_WIDTH_KEY, "500");
  render(
    <EditorWorkspace>
      <div />
    </EditorWorkspace>,
  );
  const divider = screen.getByRole("separator");
  expect(divider).toHaveAttribute("aria-valuenow", "500");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1024 });
  fireEvent(window, new Event("resize"));
  expect(divider).toHaveAttribute("aria-valuenow", "496");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1600 });
  fireEvent(window, new Event("resize"));
  expect(divider).toHaveAttribute("aria-valuenow", "500");
  expect(localStorage.getItem(INSPECTOR_WIDTH_KEY)).toBe("500");
});
it("Escape cancels a drag and restores cursor/selection without saving", () => {
  document.body.style.cursor = "crosshair";
  document.body.style.userSelect = "text";
  const { container } = render(
    <EditorWorkspace>
      <div />
    </EditorWorkspace>,
  );
  const divider = screen.getByRole("separator");
  fireEvent.pointerDown(divider, { button: 0, pointerId: 1, clientX: 800 });
  fireEvent.pointerMove(window, { pointerId: 1, clientX: 650 });
  fireEvent.keyDown(window, { key: "Escape" });
  expect(container.querySelector("main")!.style.getPropertyValue("--inspector-width")).toBe("320px");
  expect(localStorage.getItem(INSPECTOR_WIDTH_KEY)).toBeNull();
  expect(document.body.style.cursor).toBe("crosshair");
  expect(document.body.style.userSelect).toBe("text");
});
it("keeps resizing usable with invalid or blocked local storage", () => {
  localStorage.setItem(INSPECTOR_WIDTH_KEY, "invalid");
  render(
    <EditorWorkspace>
      <div />
    </EditorWorkspace>,
  );
  const divider = screen.getByRole("separator");
  expect(divider).toHaveAttribute("aria-valuenow", "320");
  const blocked = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  fireEvent.keyDown(divider, { key: "ArrowLeft" });
  expect(divider).toHaveAttribute("aria-valuenow", "336");
  blocked.mockRestore();
});
