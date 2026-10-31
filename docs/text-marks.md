# Animated text marks

Select a text or subtitle clip, open Text, and expand Animated text marks.
Choose Stabilo / highlighter sweep or Strikethrough draw, then apply.

Controls: colour, opacity, thickness, sweep time (0.1–2 seconds), start delay,
and optionally a first/last word range (numbered from 1). Multiline marks draw
left to right, then continue on the next line. Short clips clamp the sweep to
the remaining duration. The finished mark stays until the text clip ends.

The existing native font layout and FFmpeg create a short transparent WebM
and a transparent PNG hold. This adds one track with at most two clips.
There are no additional packages, AI models, or Remotion requirements.
Generated media uses the application data text-markers cache.

The original text remains editable. Position, rotation, scale, opacity and
motion are copied at application time. After changing or moving the source
text, apply the mark again; the same mark kind replaces its previous layer.
Highlighter and strikethrough can coexist. Generated layers can also be moved
or removed directly in the timeline. One Undo removes the application.
Rendering supports Cancel; a changed project rejects stale results.
Locked tracks retain the normal project edit protections.

Run the development app with `pnpm tauri dev`. Restart an existing dev process
to load the new native command.
