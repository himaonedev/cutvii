# Custom word-highlight subtitles

Select a source clip and open **AI → Subtitles → Customize**.

- Choose the font, size, text colour, Bold and position using the existing controls.
- Enable **Background box** for the base box. Colour, opacity, padding and roundness apply to this box.
- Choose **Per word** under Box shape for a separate base box behind every visible word. Selecting this
  shape starts with smaller padding so the boxes have room between them; padding remains editable.
- **Base box rotation** and **Active word box rotation** independently tilt the boxes from -45° to +45°
  around their centres. The letters stay straight. Per-word boxes rotate individually. These angles are
  saved in presets and project text specs and use the same drawing in preview and export.
- Enable **Highlight active word** for a separate box behind the current word. Its text colour, box colour,
  opacity, padding and roundness are independent of the base box. Choose 1–8 words per caption.
- Enter a preset name and choose **Save as subtitle preset**. It is selected immediately and is also
  available in My styles, including the Auto Clips style picker. The current subtitle size and position
  remain saved as the existing subtitle preferences; they are not properties of the style preset.

Generate subtitles after choosing the look. The same custom look works for SRT import and Auto Clips
outputs. Existing subtitle clips are unchanged. A short phrase holds still while the highlighted word
advances. Each state is an editable text/image clip; Undo removes the generated batch. Preview and export
use the same rasterized PNG, including both boxes. Switching between line highlight and word highlight
replaces the previous highlight mode.

Word times are currently **estimates**, weighted by the characters in each word within a timed caption,
and snapped to timeline frames. They are not forced alignment or word timestamps from Whisper. Review
quick speech and pauses and adjust the individual state boundaries if needed. Very short states can be
one frame; more words than frames cannot all receive a separate visible state. Per-state fades are
disabled to prevent flashing between words.

The project stores the selected zero-based word index and box settings in `text.highlight.word`.
Style presets carry the same configuration; generation replaces its index for each state. Restyling a
word state keeps its active-word index. Editing one state's words or size does not update its neighbours;
choose the look before generation for consistent phrases. Rendered states are cached individually.
