# Timeline layers

Visual tracks (video, images and text) are grouped separately from audio tracks. Each section always has a 64px blank drop row. Drag media to a lane centre to use that lane, or within 8px of its top/bottom edge to insert a new layer there. A live preview shows the destination. Wrong-kind drops adapt to the corresponding media section.

Both library/OS imports and existing timeline clips support creating a layer. Moving an existing clip preserves its source trim, speed, effects and keyframes; layer creation plus movement is one Undo. Escape cancels it without adding a track. Existing visual tracks retain their relative compositing order. Hover near the timeline edges to scroll while dragging.

Each track header includes Delete track, which removes that track and its clips in one Undo step. Imported media stays in the library. A successful clip move also removes all empty media tracks, including previously empty layers, as part of the same Undo. Invalid/cancelled/no-op moves do not remove tracks. The permanent visual/audio drop rows remain even if every track is deleted.

Track headers use compact type/visibility/mute icons and an ellipsis menu (also available by right-clicking a header). Track height has Compact, Normal, Large and Extra large options; Audio waveform size has Hidden, Small, Normal and Large. Delete track lives in this menu. Appearance is per track, UI-only; clip timing, audio volume and export are unchanged. Hit testing and insert-layer positions follow the selected track heights.

Headers show icons only; track names remain available as hover labels and accessible control names. The lock icon protects track contents against moves, trims, split, deletion, Cut/Paste, Inspector edits and asset replacement. Mute, visibility and UI appearance remain adjustable; Undo/Redo remain available. Empty locked tracks are retained during cleanup. Locks are remembered locally per project/track ID (not part of the portable project file).

Alt+drag duplicates a timeline clip, preserving source trim, speed, transforms, effects and animation keys. The original stays in place. Drop onto free space in an existing compatible track or its edge/new-layer area. Copying does not ripple neighbours; overlapping or locked destinations reject the drop. Alt can be pressed/released mid-drag; Escape cancels. The copy is selected on release and duplication is one Undo step.

Deleting timeline clips via right-click Delete, toolbar or keyboard also removes empty unlocked tracks, in the same Undo step. Permanent visual/audio drop areas remain available.
