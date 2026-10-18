import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, Coffee, Check } from "lucide-react";
import type { PageProps } from "../types";
import { localDate } from "../lib/model";
import { Modal } from "./ui";
export default function Focus({
  data,
  actions,
  open,
  onClose,
  onRunning,
}: PageProps & {
  open: boolean;
  onClose: () => void;
  onRunning: (running: boolean) => void;
}) {
  const [duration, setDuration] = useState(data.settings.focusMinutes);
  const [remaining, setRemaining] = useState(data.settings.focusMinutes * 60);
  const [end, setEnd] = useState<number | null>(null);
  const [taskId, setTaskId] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const finishRef = useRef(false);
  useEffect(() => {
    onRunning(end !== null);
  }, [end, onRunning]);
  useEffect(() => {
    if (end === null && (remaining === duration * 60 || saved)) {
      setDuration(data.settings.focusMinutes);
      setRemaining(data.settings.focusMinutes * 60);
      setSaved(false);
      finishRef.current = false;
    }
  }, [data.settings.focusMinutes]);
  useEffect(() => {
    if (end === null) return;
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0 && !finishRef.current) {
        setEnd(null);
        try {
          actions.addFocus({
            date: localDate(),
            minutes: duration,
            taskId: taskId || null,
          });
          finishRef.current = true;
          setSaved(true);
          setError("");
        } catch (cause) {
          setError(
            cause instanceof Error
              ? cause.message
              : "The session could not be saved. Try End & save again.",
          );
        }
      }
    };
    tick();
    const interval = window.setInterval(tick, 500);
    return () => window.clearInterval(interval);
  }, [end, duration, taskId, actions]);
  function reset(minutes = data.settings.focusMinutes) {
    setEnd(null);
    setDuration(minutes);
    setRemaining(minutes * 60);
    setSaved(false);
    setError("");
    finishRef.current = false;
  }
  function save() {
    const current =
      end === null
        ? remaining
        : Math.max(0, Math.ceil((end - Date.now()) / 1000));
    const minutes = Math.round(((duration * 60 - current) / 60) * 100) / 100;
    setEnd(null);
    setRemaining(current);
    if (minutes > 0 && !finishRef.current) {
      try {
        actions.addFocus({
          date: localDate(),
          minutes,
          taskId: taskId || null,
        });
        finishRef.current = true;
        setSaved(true);
        setError("");
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "The session could not be saved. Try again.",
        );
      }
    }
  }
  if (!open) return null;
  return (
    <Modal title="One thing at a time." onClose={onClose}>
      <div className="focus-dialog">
        {error && (
          <div className="alert error" role="alert">
            {error}
          </div>
        )}
        <div className="focus-leaf">
          {saved ? <Check size={28} /> : <Coffee size={28} />}
        </div>
        <p className="eyebrow">
          {saved ? "A LITTLE PROGRESS, RECORDED" : "YOUR QUIET CORNER"}
        </p>
        <div
          className="focus-clock"
          role="timer"
          aria-label="Focus time remaining"
        >
          {String(Math.floor(remaining / 60)).padStart(2, "0")}
          <span>:</span>
          {String(remaining % 60).padStart(2, "0")}
        </div>
        <p className="muted">
          {saved
            ? "Your actual focus time is saved. Take a breath."
            : "Make a little space. Move one meaningful task forward."}
        </p>
        <div className="timer-options">
          {[15, 25, 50].map((minutes) => (
            <button
              key={minutes}
              className={`chip ${duration === minutes ? "active" : ""}`}
              disabled={end !== null || remaining !== duration * 60}
              onClick={() => reset(minutes)}
            >
              {minutes} min
            </button>
          ))}
        </div>
        <label className="field">
          Connect to a task <span className="optional">(optional)</span>
          <select
            value={taskId}
            disabled={end !== null || remaining !== duration * 60}
            onChange={(e) => setTaskId(e.target.value)}
          >
            <option value="">An open focus session</option>
            {data.tasks
              .filter((t) => t.status !== "Completed")
              .map((t) => (
                <option key={t.id} value={t.id}>
                  Day {t.day} · {t.title}
                </option>
              ))}
          </select>
        </label>
        <div className="focus-controls">
          {saved ? (
            <button className="button primary" onClick={() => reset()}>
              A fresh session <RotateCcw size={16} />
            </button>
          ) : (
            <>
              <button
                className="button secondary"
                aria-label="Reset focus timer"
                onClick={() => reset()}
              >
                <RotateCcw size={18} />
              </button>
              <button
                className="button primary"
                disabled={remaining === 0}
                onClick={() => {
                  if (end === null) {
                    finishRef.current = false;
                    setEnd(Date.now() + remaining * 1000);
                  } else {
                    setRemaining(
                      Math.max(0, Math.ceil((end - Date.now()) / 1000)),
                    );
                    setEnd(null);
                  }
                }}
              >
                {end === null ? <Play size={17} /> : <Pause size={17} />}{" "}
                {end === null
                  ? remaining < duration * 60
                    ? "Resume focus"
                    : "Start focus"
                  : "Pause"}
              </button>
              <button
                className="button secondary"
                disabled={remaining === duration * 60}
                onClick={save}
              >
                End & save
              </button>
            </>
          )}
        </div>
        <p className="fine-print">
          The timer continues while you browse this studio. Closing or
          refreshing the tab stops it. Saved sessions count toward focus time
          and add actual minutes to the connected task.
        </p>
      </div>
    </Modal>
  );
}
