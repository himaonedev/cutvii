import { useId, useState } from "react";
import type { TimelineClip } from "@/project/model";
import { usePlaybackStore } from "@/store/playback";
import { applyMotionPreset, report } from "@/timeline/editor";
import { MOTION_PRESETS, type MotionPresetId, type MotionStrength } from "@/timeline/motionPresets";
import { Button } from "@/components/ui/button";

const field = "h-9 w-full rounded-md border bg-surface-2 px-2 text-sm focus-visible:outline-accent";

export function MotionPresetsPanel({ clip, text = false }: { clip: TimelineClip; text?: boolean }) {
  const uid = useId();
  const [preset, setPreset] = useState<MotionPresetId>(text ? "text-pop" : "punch-in");
  const [strength, setStrength] = useState<MotionStrength>("subtle");
  const [seconds, setSeconds] = useState("2");
  const available = MOTION_PRESETS.filter((p) => p.text === text);
  const selected = available.find((p) => p.id === preset) ?? available[0];
  const duration = Number(seconds);
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label htmlFor={`${uid}-preset`} className="text-xs text-text-muted">
          Motion style
        </label>
        <select
          id={`${uid}-preset`}
          className={field}
          value={selected.id}
          onChange={(e) => setPreset(e.target.value as MotionPresetId)}
        >
          {available.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-text-muted">{selected.description}</p>
      </div>
      <div className="space-y-1">
        <label htmlFor={`${uid}-strength`} className="text-xs text-text-muted">
          Intensity
        </label>
        <select
          id={`${uid}-strength`}
          className={field}
          value={strength}
          onChange={(e) => setStrength(e.target.value as MotionStrength)}
        >
          <option value="subtle">Subtle</option>
          <option value="dynamic">Dynamic</option>
        </select>
      </div>
      {selected.id === "punch-in" && (
        <div className="space-y-1">
          <label htmlFor={`${uid}-seconds`} className="text-xs text-text-muted">
            Duration (seconds)
          </label>
          <input
            id={`${uid}-seconds`}
            className={field}
            type="number"
            min="0.2"
            max="10"
            step="0.1"
            value={seconds}
            onChange={(e) => setSeconds(e.target.value)}
          />
        </div>
      )}
      <p className="text-xs text-text-muted">
        Replaces {text ? "scale, position Y and opacity" : "scale"} keyframes on this clip. Undo restores the
        previous motion.
      </p>
      <Button
        variant="secondary"
        className="w-full"
        disabled={
          selected.id === "punch-in" && (!Number.isFinite(duration) || duration < 0.2 || duration > 10)
        }
        onClick={() =>
          report(
            applyMotionPreset(
              clip.id,
              selected.id,
              strength,
              usePlaybackStore.getState().playhead,
              selected.id === "punch-in" ? duration : 2,
            ),
          )
        }
      >
        Apply motion
      </Button>
    </div>
  );
}
