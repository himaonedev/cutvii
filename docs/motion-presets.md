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

The preset replaces scale keys on video/stills; Text Pop replaces scale, X/Y and
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

## Smooth text and subtitle motion

Select a text/subtitle clip, open **Motion**, and choose **Apple Smooth Rise**, **Apple Soft Scale**, or **Smooth from Left/Right/Top/Bottom**. These are Apple-inspired timing styles, not Apple fonts or proprietary effects. They use a cubic eased arrival, a quiet hold and an accelerating exit, with no bounce. Directional presets leave in the direction opposite their arrival edge.

Set **Animation time (seconds)** (0.1–2) and **Subtle/Dynamic** travel. Timing automatically shortens for brief captions to preserve a hold. **Apply to all text / subtitle clips on this track** applies the style in one Undo step, skips non-text media and clips shorter than four frames, and leaves all other tracks alone. Track mode calculates each clip independently and copies the full track only once.

Text presets replace X/Y, scale and opacity keys; rotation and the editable font, colour, rounded box, subtitle content and word timing are preserved. Switching direction clears the previous preset's movement on the other axis. Sampled curves use at most 26 keys per property, inside the existing 64-key limit. The same native keys drive preview and FFmpeg export, without AI, rasterizing new text plates, or installing dependencies.

## Selected subtitles and Copy/Paste Motion

Multi-select text clips with Ctrl/Shift, box selection, or the timeline Select menu. The Inspector now shows **Text motion** for the selection: pick a preset and click **Apply motion to selected text**. Mixed selections are supported; videos, audio and non-text images are ignored. Preset application skips captions shorter than four frames. It uses native keyframes and one Undo step.

Alternatively, select one animated text clip, open Motion and click **Copy Motion**. Select target texts and click **Paste Motion** in the Inspector (or in Motion for a single target). Copying does not modify the project; the motion clipboard stays in memory and is separate from copied media. Paste replaces target transform keyframes while preserving each target's static position, scale, rotation and opacity through relative offsets/ratios. Target content, font, box, assets, audio, clip start, duration and source trim stay unchanged. Existing transition effects are separate and are retained.

Copied curves fit the full target duration, accounting for source trim, speed and reverse. A longer target stretches the entrance/hold/exit proportionally; it does not preserve the original entrance time in seconds. Existing track locks block the entire edit atomically. One Undo restores all pasted targets.
