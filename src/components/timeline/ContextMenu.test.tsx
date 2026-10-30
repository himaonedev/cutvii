import { fireEvent, render, screen } from "@testing-library/react";
import { ContextMenu } from "./ContextMenu";

const handlers = () => ({
  onSplit: vi.fn(),
  onDelete: vi.fn(),
  onCut: vi.fn(),
  onCopy: vi.fn(),
  onFreeze: vi.fn(),
  onClose: vi.fn(),
});

afterEach(() => vi.restoreAllMocks());

it("portals outside clipping panels and opens above a bottom-edge click", () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 240,
    height: 300,
  } as DOMRect);
  const { container } = render(
    <div style={{ overflow: "hidden", transform: "translateX(0)" }}>
      <ContextMenu
        menu={{ x: window.innerWidth - 10, y: window.innerHeight - 10, clipId: "clip" }}
        {...handlers()}
      />
    </div>,
  );
  const menu = screen.getByRole("menu");
  expect(container.contains(menu)).toBe(false);
  expect(menu.parentElement).toBe(document.body);
  expect(menu).toHaveStyle({ left: `${window.innerWidth - 248}px`, top: `${window.innerHeight - 310}px` });
  expect(menu.className).toContain("overflow-y-auto");
  expect(menu.style.maxHeight).toBe("calc(100dvh - 16px)");
});

it("clamps off-screen clicks to the viewport margin and offers the motion shortcut", () => {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    width: 200,
    height: 200,
  } as DOMRect);
  const onMotion = vi.fn();
  render(<ContextMenu menu={{ x: -20, y: -20, clipId: "clip" }} {...handlers()} onMotion={onMotion} />);
  expect(screen.getByRole("menu")).toHaveStyle({ left: "8px", top: "8px" });
  fireEvent.click(screen.getByRole("menuitem", { name: "Motion presets…" }));
  expect(onMotion).toHaveBeenCalledOnce();
});

it("still closes on Escape and pointer events outside the portal", () => {
  const props = handlers();
  render(<ContextMenu menu={{ x: 20, y: 20, clipId: "clip" }} {...props} />);
  fireEvent.pointerDown(screen.getByRole("menu"));
  expect(props.onClose).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(props.onClose).toHaveBeenCalledOnce();
  fireEvent.pointerDown(document.body);
  expect(props.onClose).toHaveBeenCalledTimes(2);
});
