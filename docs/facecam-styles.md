# Facecam styles

Select an opaque video clip, place the playhead inside it, then open **Motion → Facecam styles**. Choose a style, set its duration and controls, and click **Apply Facecam Style**. The new interval is selected for playback in the normal preview. One Undo restores the original edit. Source media is never overwritten.

No Remotion, GSAP, Three.js or additional packages/models are installed. This adapts concepts from [facecammaxxing](https://github.com/aaksa/facecammaxxing) to the existing CutVii pipeline; it is not the original renderer.

| Style                | Behaviour                                                                 |
| -------------------- | ------------------------------------------------------------------------- |
| Lean-in / Punch-in   | Fast cubic eased zoom, held drift and eased return                        |
| Slow Push            | Smooth progressive zoom; optional foreground/room parallax                |
| Text Behind          | A title rises behind the local subject mask                               |
| Backdrop Word        | Native-font glyphs enter individually behind the subject                  |
| Spotlight            | Room dimming, preserved subject brightness, accent rim and optional title |
| Name Tag             | Rounded coloured lower-third slides in and out                            |
| Silhouette Intro     | Accent-coloured silhouette on a chosen background, then a footage reveal  |
| Bottom Fade          | Dark lower-frame gradient with adjustable strength                        |
| Glass Card / Counter | Frosted 2D card, custom integer counter and optional decorative graph     |
| Freeze Sticker       | Held source frame, outline, slow subject zoom and sliding name label      |

Text styles expose font, size, text colour, position, card/background colour and accent. Glass Card exposes start/end values (including descending or negative counters); the rising graph is decorative, not a data chart. Position is manual, in source-frame percentages; there is no face tracking or 3D camera. Parallax uses a low-resolution inpainted/blurred approximation of the room and may show artifacts near moving hair/hands.

Subject styles use the existing bundled local MediaPipe segmenter. When no clear person is found anywhere in the selected range, the render fails and no timeline edit is applied. Multiple people and occlusions need review. Lean-in, ordinary Slow Push, Name Tag, Bottom Fade and Glass Card do not run segmentation.

Effects are baked into a new silent MP4 for the chosen interval, not separate editable graphic layers. Font/text/colour settings apply before rendering; use Undo and reapply to change those afterwards. Clip transform/keyframes can still be edited normally. The existing highlight splice preserves the original audio, speed, pitch settings and timing without rippling later clips or duplicating voice. Existing source colour/LUT adjustments are not baked into these effects. Reversed and transparent source clips are excluded.

Each render is limited to 0.2–30 seconds, 30 fps and 1920 pixels on the longer side. It streams frames and uses at most two video threads, one filter thread and bounded x264 lookahead. Repeated glyph plates are reused, and glyphs are prepared sequentially. Cancel stops the worker process tree; changing the project while rendering prevents a stale result from applying. Outputs are cached in the application data directory under `facecam-styles`.

Verification: TypeScript edit/UI tests cover all ten template splices, original audio, source speed/trim, text glyph reuse, stale jobs, Cancel and Undo. `python -B scripts/tests/test_facecam_styles.py` checks rendered frame boundaries, occlusion, counter exits, parallax, silhouette reveal and bottom gradient using the existing NumPy/OpenCV runtime. Real FFmpeg/MediaPipe smoke renders also cover all ten templates plus parallax and empty-subject cleanup.
