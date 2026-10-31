import { zoomAt } from "./canvasView";
it("keeps the canvas point under the cursor fixed and clamps zoom", () => {
  const old = { zoom: 1, x: 10, y: -5 },
    point = { x: 100, y: 50 };
  const next = zoomAt(old, 2, point);
  expect((point.x - next.x) / next.zoom).toBe((point.x - old.x) / old.zoom);
  expect((point.y - next.y) / next.zoom).toBe((point.y - old.y) / old.zoom);
  expect(zoomAt(old, 100, point).zoom).toBe(4);
  expect(zoomAt(old, 0, point).zoom).toBe(0.25);
  expect(zoomAt(old, NaN, point)).toBe(old);
});
