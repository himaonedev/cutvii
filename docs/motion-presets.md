# Motion presets

Import the MP4 produced by your clipper, place it on the timeline and select it.
In the inspector, open the **Motion** tab. Alternatively, right-click the clip
and choose **Motion presets…**. Text clips use the same tab for Text Pop.
The clip menu opens above the pointer near the window's bottom edge, stays
inside the viewport, and scrolls when the window is too short for all actions.

- **Punch-in:** place the playhead where the emphasis should start, choose its
  duration (0.2–10 seconds), and apply. The zoom ramps in over about five frames,
  holds, and returns. Near the clip's end the window shifts earlier to fit.
- **Slow Push:** a gradual zoom from the clip's start to its end.
- **Text Pop:** a short slide/scale entrance with a small overshoot and a fade out.

Each offers **Subtle** and **Dynamic** intensity. No API key, cloud service or
model download is needed. The feature takes conceptual inspiration from
facecammaxxing's camera and typography beats, implemented independently using
CutVii's existing native keyframes. It does not include face tracking, motion
blur, depth/parallax, background removal or text behind the speaker.

The preset replaces scale keys on video/stills; Text Pop replaces scale, Y and
opacity keys on text. Other properties, media, captions and source files are
preserved. Undo restores the preceding animation in one step. Ordinary keyframe
controls can refine the result. Applying a new preset replaces those same keys,
so it does not add an ever-growing stack of animations.

Keys are stored in source time, mapped through trim, playback speed and reverse.
The existing project schema, preview and FFmpeg export consume these same keys;
there is no separate effect rasterization stage. Clips shorter than four frames
are rejected. Zoom is clamped to CutVii's scale limits.

Validation: preset tests cover project validation, timeline anchoring, trim,
speed/reverse, zoom bounds, text entrance/exit, UI selection and single-step Undo.
Inspector, timeline, text and context-menu tests also pass (58 tests total). TypeScript checking
passes. A native desktop preview and MP4 export of the new presets have not yet
been manually verified.
