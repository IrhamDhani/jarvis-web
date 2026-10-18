import { useState, type FormEvent } from "react";
import { ArrowUpRight, Lightbulb, Check } from "lucide-react";
import type { CaptureCategory, PageProps } from "../types";
import { projectDay, dayDate } from "../lib/model";
import { Modal } from "./ui";
const categories: CaptureCategory[] = [
  "Task",
  "Bug",
  "Mathematical idea",
  "Book improvement",
  "AI prompt",
  "Marketing idea",
  "Decision",
];
export default function QuickCapture({
  data,
  actions,
  onClose,
}: PageProps & { onClose: () => void }) {
  const [category, setCategory] = useState<CaptureCategory>("Task");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [day, setDay] = useState(
    Math.max(1, Math.min(30, projectDay(data.settings.startDate))),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      if (category === "Task")
        actions.addTask({
          title: title.trim(),
          notes: content.trim(),
          day,
          project: "Studio",
          priority: "Medium",
          status: "Not Started",
          estimate: 25,
          actual: 0,
          deadline: dayDate(data, day),
          prompt: "",
        });
      else
        actions.addCapture({
          category,
          title: title.trim(),
          content: content.trim(),
          tags: "",
        });
      setSaved(true);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your capture could not be saved. Try again.",
      );
    }
  };
  return (
    <Modal title="A little thought, captured." onClose={onClose}>
      {saved ? (
        <div className="capture-success">
          <span className="empty-icon">
            <Check />
          </span>
          <h3>Safely in your studio.</h3>
          <p>
            {category === "Task"
              ? `Your task is in Day ${day} of Daily Missions.`
              : "Find this thought in Notes & Resources."}
          </p>
          <button className="button primary" onClick={onClose}>
            Back to work <ArrowUpRight size={16} />
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="stack">
          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}
          <p className="muted">Get it out of your head. Give it a home.</p>
          <label className="field">
            What are you capturing?
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CaptureCategory)}
            >
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            {category === "Task" ? "Task title" : "Title"}
            <input
              autoFocus
              required
              maxLength={200}
              placeholder="A small step or a bright idea…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>
          <label className="field">
            A little more detail <span className="optional">(optional)</span>
            <textarea
              rows={4}
              value={content}
              maxLength={10000}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Useful context for your future self."
            />
          </label>
          {category === "Task" && (
            <label className="field">
              Plan for
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
              >
                {data.milestones.map((m) => (
                  <option key={m.day} value={m.day}>
                    Day {m.day} · {dayDate(data, m.day)}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="inline-note">
            <Lightbulb size={16} />
            <span>
              {category === "Task"
                ? "Tasks appear in Daily Missions. Everything starts incomplete."
                : "Ideas stay in your notes, so you can keep your current focus."}
            </span>
          </div>
          <div className="form-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="button primary"
              disabled={!title.trim()}
            >
              Save {category === "Task" ? "task" : "thought"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
