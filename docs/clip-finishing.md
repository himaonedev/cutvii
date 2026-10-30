# Clip finishing and subject effects

Select a video clip, open **AI → Subject effects**, choose Remove background, Blur background, or Text
behind subject, then Apply. Processing runs locally; Gemini and other API keys are not used.

The subject worker needs Python with `mediapipe`, `opencv-python` and `numpy`, plus FFmpeg with libvpx-vp9,
libopus and libx264. The app checks the Python imports before enabling Apply. On Windows it uses `py`;
elsewhere `python3`. Set `CUTVII_PYTHON` to a specific Python executable when needed. The model and its
Apache-2.0 licence are bundled, but the Python interpreter and packages are not bundled in the installer.
Install the packages into the selected Python environment with `python -m pip install mediapipe opencv-python numpy`.

Only the selected source range is processed, with a ten-minute limit, at up to 30 fps and 1920 pixels on
the longer side. This is portrait segmentation, best with one person; inspect hair and rapid motion.
Reverse clips must be set to Forward first. Transparent cut-outs also play forwards.

Remove background replaces the selected clip with an editable transparent WebM reference. Place a new
background on a lower track. Blur background retains the person and blurs the surroundings. Both keep
the selected clip's audio, speed and transforms. Undo restores the previous clip.

Text behind subject keeps the original video, inserts an editable title above it and a muted subject
cut-out above the title. Existing higher layers stay above these new tracks. The title initially lasts
three seconds (or the clip's duration if shorter); edit its text, position and duration normally.

## Auto Clips

In Settings, choose **Manual** reframe and adjust the horizontal/vertical position for vertical or square
output. The review preview uses the chosen position. Center remains the default; Keep canvas does not
apply an automatic crop. This is a fixed crop, not automatic face tracking.

**Remove silences inside clips** detects audio below -35 dB for at least 0.6 seconds, retaining 0.12 seconds
at each edge. Kept sections become adjacent editable pieces; subtitles follow the retained source times.
The detector cannot distinguish a deliberate quiet pause from unwanted silence, so review the edits.

In Create, **New project per clip** saves a separate `.cutvii` project for each selected candidate in the
chosen folder. It preserves the current project and avoids overwriting existing filenames. Projects
reference their source media and generated subtitle/effect files; they are not self-contained archives.
Saved projects appear in Recent projects.

Voice-over features are unchanged.
