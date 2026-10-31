# Timeline selection

- Click a clip to select it. Ctrl/Cmd-click adds or removes individual text, video, image or audio clips.
- Shift-click selects a range from the anchor. Within a track this runs chronologically; across tracks it follows the displayed track order, then time. Repeated Shift-click keeps the original anchor. Ctrl/Cmd+Shift-click adds a range to the current selection.
- Drag empty lane space to box-select intersecting clips, including clips not currently rendered by timeline virtualization. Ctrl/Cmd/Shift+drag adds to the current selection. Escape or pointer cancellation restores the selection from before the drag. Empty-space click clears it.
- Ctrl/Cmd+A selects all timeline clips after focusing the timeline. Inside an input it retains native text selection; inside the media library it selects media.
- The timeline **Select…** menu offers All clips, Text/subtitles, Videos, Audio, Images, and Clear selection. Detached video sound on audio tracks belongs to Audio; text images are excluded from Images.
- Alt+drag retains duplicate behaviour. Selection alone does not modify the project or create Undo history. Locked tracks retain their existing edit protection.

Clip activation supports Enter/Space with the same Ctrl/Cmd/Shift modifiers. Pointer selection explicitly focuses the timeline so a previously focused Inspector input does not absorb Ctrl+A. Box selection reads project geometry in scrolled lane coordinates and coalesces pointer updates into animation frames.
