# Project home

CutVii starts at Project Home, before the editor is mounted.

- **New Project** opens the existing canvas picker. Cancel stays at Home;
  Create starts a clean editing session.
- **Open Project** uses the native `.cutvii` picker and existing validation.
  Cancellation or a failed open leaves Home visible.
- **Recent projects** uses the backend's persisted Open Recent list (up to ten
  projects). Cards show file names, paths and file modification dates. Missing
  files are shown disabled. These are project cards, not media thumbnails.
- **Refresh** reloads the list; refocusing the window also refreshes it. If the
  list cannot be read, Open Project still works.
- The editor's **Project home** button pauses playback and hides the editor;
  it does not discard the project, selection, playhead or undo history.
  **Continue editing** returns to the same in-memory session. This is not
  autosave or recovery after exiting the app: save the project before closing.
- Creating/opening another project still uses the existing unsaved-changes
  confirmation. Window close protection is active on Home too.

Project history is read from Rust via `recent_projects`. Opening a card uses
`open_recent_project` with an index into that backend-owned list. No directory
scan or arbitrary path reads are exposed to the frontend.

The inspector's tabs now use four columns, wrapping to two rows for video, so
Motion, Speed and Info remain visible in the narrow inspector. Native controls
and scrollbars use the app's dark colour scheme.

Validation: all 785 frontend tests, four recent-project Rust tests, TypeScript
checking and the frontend production build pass. Native file-picker interactions
and visual layout have not yet been manually verified on the desktop.
