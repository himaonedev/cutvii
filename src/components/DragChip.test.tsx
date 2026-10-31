import { fireEvent, render, screen } from "@testing-library/react";
import { DragChip } from "./DragChip";
import { useDragDropStore } from "@/store/dragDrop";

beforeEach(() => useDragDropStore.getState().clear());
it("follows a library drag with the cached thumbnail and file name", () => {
  useDragDropStore
    .getState()
    .set({
      dragging: {
        source: "library",
        label: "master.mp4",
        x: 200,
        y: 100,
        thumbnailPath: "/cache/master.jpg",
        mediaType: "video",
      },
    });
  render(<DragChip />);
  const chip = screen.getByTestId("drag-chip");
  expect(chip).toHaveTextContent("master.mp4");
  expect(chip.querySelector("img")).toHaveAttribute("src", "asset://localhost/cache/master.jpg");
  expect(chip).toHaveStyle({ left: "212px", top: "112px" });
});
it("uses an icon when the thumbnail is missing or unreadable", () => {
  useDragDropStore
    .getState()
    .set({
      dragging: {
        source: "library",
        label: "image.png",
        x: 200,
        y: 100,
        thumbnailPath: "/missing.png",
        mediaType: "image",
      },
    });
  render(<DragChip />);
  fireEvent.error(screen.getByTestId("drag-chip").querySelector("img")!);
  expect(screen.getByTestId("drag-thumbnail").querySelector("img")).toBeNull();
  expect(screen.getByTestId("drag-thumbnail").querySelector("svg")).not.toBeNull();
});
it("keeps the preview inside the window and leaves OS drags to their native thumbnail", () => {
  useDragDropStore
    .getState()
    .set({
      dragging: {
        source: "library",
        label: "audio.mp3",
        x: window.innerWidth - 1,
        y: window.innerHeight - 1,
        mediaType: "audio",
      },
    });
  const { rerender } = render(<DragChip />);
  expect(screen.getByTestId("drag-chip")).toHaveStyle({
    left: `${window.innerWidth - 232}px`,
    top: `${window.innerHeight - 77}px`,
  });
  useDragDropStore.getState().set({ dragging: { source: "os", label: "Drop", x: 1, y: 1 } });
  rerender(<DragChip />);
  expect(screen.queryByTestId("drag-chip")).not.toBeInTheDocument();
});
