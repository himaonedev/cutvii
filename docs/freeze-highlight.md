# Freeze Highlight

## Playback modes

Choose **Freeze frame** to hold a single picture, or **Video keeps moving** to render the style on every
frame. Moving mode can use a duration from the playhead or **Apply to whole selected clip**, up to 120
seconds per pass. It runs locally with Python, NumPy and OpenCV; subject styles also need MediaPipe.
The render has progress and cancellation and never changes the project until it succeeds.

Moving output is a silent H.264 video at up to 30 fps / 1920 px on its longer side. Original or processed
audio stays on the separate audio track, so it is never doubled. Preview and export read the same file.
Speed is baked into the video and its timing is rebased to zero. Existing motion keys and complete
visual transitions are retained; choose a range that does not cut through a transition. Reverse moving
clips are currently excluded; Forward mode is required. Freeze still supports reverse.

Subject masks and their zoom centres are smoothed between frames. When a person temporarily leaves
the shot, the background style continues without a leftover silhouette. If no person is found anywhere
in a subject-style range, the render fails without an edit. Review hair, fast motion and occlusions.

Visual styles: Halftone, Black & White, Character Outline + Zoom, Paper Outline and Paper Texture.
Subject outline styles use the bundled portrait model through the local Python/MediaPipe runtime.
They separate the person, add an editable-before-Apply border and optionally enlarge the cut-out around
its centre. Outline colour/width and Character zoom are independent of the frame zoom. Paper Outline
adds a rough paper border and soft shadow; Paper Texture applies a printed-paper finish to the whole frame.
Paper tint and texture amount are adjustable. Best with one person; inspect hair, hands and cropped edges.
Other visual styles work without Python. All styles use the same PNG for preview/export.

Select a video, move the playhead inside it, then open **Motion → Freeze Highlight**. Set the duration,
paper/ink colours, colour opacity, halftone strength, dot pattern, dot size, zoom and audio, then Apply.

**Dot pattern:** Grid retains straight rows; Wave bends the rows like fabric; Radial arranges the dots in
circular rings. Pattern bend adjusts the curvature for Wave/Radial. Wave at 60–80% bend and Dot size 8–12
is a starting point for a woven-paper look. Only the dot lattice bends; the source picture stays in place.

The picture holds at the playhead for 0.2–15 seconds (limited by the remaining clip). Speech, subtitles,
music and later clips keep their existing times: this is a hold over the current timeline, not a ripple
insertion. One Undo restores the complete edit. The source file is never modified or uploaded.

The effect replaces the visual interval with an editable PNG still. Crop, fit and the transform at the
start are retained, with a short zoom-in/return. It uses the ungraded source frame to create the chosen
duotone colours; an existing Color/LUT look is not baked into the effect. Frames are limited to 1920 px
on the longer side. Opaque source videos are supported; transparent cut-outs are excluded.

The source sound is placed on its own audio track, without duplication. **Original audio** keeps it
unchanged. **Echo voice** and **Reverb voice** replace only the emphasized speech interval with a rendered
WAV; the reverb is a short multi-delay approximation. These voice modes need audible embedded source
audio at up to 4× speed, and a range outside existing audio fades/transitions. Detached sound on another
track stays unchanged. Cleanup is baked into the processed interval; volume and ducking remain editable.
Reverse and pitch-preserving/changing speed are carried into the processed audio.

**Impact accent** adds an original synthesized short sound while retaining the source voice. No sound
pack or additional model is downloaded. The amount can be adjusted with Audio effect strength.

Generated PNG/WAV files are cached in `%APPDATA%\com.cutvii.app\freeze-highlights`. Preview and export use
the same media. Generated stills, audio, trims and zoom keyframes can be edited normally. To change the
halftone settings, Undo and reapply with the new settings. Keep cached files with projects that use them.

Outline and Paper Outline backgrounds support Style default, Keep original background, Solid colour, and Image behind person in both playback modes. Choose an imported library image or use Choose background image. Images are centre-cropped to cover the frame.

Image placement: drag the image in the layout preview or adjust centre X/Y, width and height percentages. Full, Half and Quarter presets use 100x100, 100x50 and 50x50 percent boxes. Cover crops to the box; Contain preserves the whole image. Uncovered areas can keep original video, style background or solid colour. PNG alpha is preserved. Manual placement stays fixed unless an image animation is selected.

Image animation supports slide from top/bottom/left/right and shake. Slides enter from outside the frame and finish at the manual position, over the effect duration. Works with moving video or a frozen person; animated freezes are silent MP4s with original voice retained on the timeline. Layout preview shows target placement.

Image backgrounds now create three editable layers: base video, a transparent image plate, and an alpha subject video. The image clip is selected after Apply. Move/trim it independently on the timeline or edit its Transform/keyframes. Animation speed (0.1x-5x) is available before Apply and in Motion on an animated image after Apply; it retimes keys without changing clip duration or audio. Moving the image outside the rendered subject interval displays it as a normal overlay. Previously baked results must be applied again to obtain independent layers.

## Memory use

Moving styles stream frames rather than holding the whole clip in RAM. Halftone coordinate fields now use float32 and broadcast coordinates; only halftone creates them. Paper styles keep only their grain field, while mono/outline skip unused fields. Subject compositing uses connected-component bounding statistics instead of allocating pixel coordinate lists, and plain outline skips paper textures. FFmpeg video threads are limited to two, filter threads to one, and x264 lookahead to eight frames to bound encoder buffering. This may reduce peak throughput on CPUs with many cores; requested resolution/frame rate and alpha layers are preserved.

A Windows synthetic 1080×1920, three-frame comparison measured Python peak working set of approximately 330→232 MiB (outline) and 346→256 MiB (paper-outline). These are isolated rendering-kernel measurements, excluding MediaPipe initialization, FFmpeg, and the editor; they do not measure total application RAM. Sampled output was identical for outline/mono, with mean differences below 0.001 of one 8-bit channel level for the other styles.

## Subtitle style during Halftone

Generate/import subtitles first. In **Motion → Highlight styles**, choose Halftone and enable **Subtitle style during effect**. Check the caption tracks that should change, choose the default dark per-line boxes or a built-in/My Styles preset, and optionally customize the font, text/box colours, roundness and word highlighting. Unchecked tracks remain untouched. Font size, position, word grouping and existing keyframe motion are retained.

Apply draws only the affected text states, splits caption clips at the effect boundaries and retains the original text assets for the outside pieces. Existing Active Word indices and intervals are preserved. If the old captions lack word timing and the new style highlights words, character-weighted estimates provide the highlight timing without changing the caption words. Identical text pictures are reused and drawing is sequential.

The video effect and subtitle changes commit together as one Undo step. Failure, a locked affected track, cancellation or a project edit during preparation prevents partial application. The original subtitle preferences and shared assets are not overwritten. Normal preview/export uses the resulting ordinary text clips, so no new renderer or project schema is required.

The range is applied when **Apply** is clicked; it is not a live binding. Moving/trimming the rendered effect later does not move its caption-style splits. Undo and reapply at the new range when needed. Subtitle tracks added after applying an effect are not retroactively restyled.


Text clips now end at their own boundaries even when the next caption has an entrance transition. The previous Halftone subtitle is not held beneath the normal subtitle; preview and export use the same rule. Video/image transitions retain their usual previous-frame hold. This fixes transition ghosts without deleting caption tracks or changing their words.
