import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCircle2,
  Flag,
  ListChecks,
} from "lucide-react";
import type { Milestone, PageProps, Priority, TaskStatus } from "../types";
import { dayDate, localDate, projectDay, taskProgress } from "../lib/model";
import {
  Badge,
  EmptyState,
  Modal,
  PageHeading,
  Progress,
} from "../components/ui";

const statuses: TaskStatus[] = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Completed",
];
const priorities: Priority[] = ["High", "Medium", "Low"];
const weeks = [
  {
    from: 1,
    to: 7,
    title: "Lay the foundation",
    description: "Find your direction. Build something solid.",
  },
  {
    from: 8,
    to: 14,
    title: "Bring the ideas to life",
    description: "Core experiences and the first chapters.",
  },
  {
    from: 15,
    to: 21,
    title: "Make it feel complete",
    description: "Finish the drafts. Test with real people.",
  },
  {
    from: 22,
    to: 30,
    title: "Get ready to share",
    description: "Refine, verify, and launch with confidence.",
  },
];

function prettyDate(value: string) {
  if (!value) return "No date";
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export default function Roadmap({
  data,
  actions,
  initialDay,
}: PageProps & { initialDay?: number }) {
  const [filter, setFilter] = useState<"all" | "week" | "blocked">("all");
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const today = localDate();
  const currentDay = projectDay(data.settings.startDate);
  const boundedDay = Math.min(30, Math.max(1, currentDay));
  const weekIndex =
    boundedDay <= 7 ? 0 : boundedDay <= 14 ? 1 : boundedDay <= 21 ? 2 : 3;
  const completed = data.milestones.filter(
    (m) => m.status === "Completed",
  ).length;
  const blocked = data.milestones.filter((m) => m.status === "Blocked").length;
  const overdue = data.milestones.filter(
    (m) =>
      m.status !== "Completed" && (m.dueDate || dayDate(data, m.day)) < today,
  ).length;
  const existing = editing
    ? data.milestones.find((m) => m.day === editing.day)
    : undefined;
  const needsConfirmation =
    editing?.status === "Completed" && existing?.status !== "Completed";

  useEffect(() => {
    if (initialDay === undefined) return;
    const milestone = data.milestones.find((item) => item.day === initialDay);
    if (milestone) {
      setEditing({
        ...milestone,
        startDate: milestone.startDate || dayDate(data, milestone.day),
        dueDate: milestone.dueDate || dayDate(data, milestone.day),
      });
      setConfirmed(false);
    }
  }, [initialDay]);

  function openMilestone(milestone: Milestone) {
    setEditing({
      ...milestone,
      startDate: milestone.startDate || dayDate(data, milestone.day),
      dueDate: milestone.dueDate || dayDate(data, milestone.day),
    });
    setConfirmed(false);
  }

  function saveMilestone(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing || !editing.title.trim() || (needsConfirmation && !confirmed))
      return;
    actions.updateMilestone(editing.day, {
      ...editing,
      title: editing.title.trim(),
    });
    setEditing(null);
  }

  return (
    <div className="page roadmap-page">
      <PageHeading
        eyebrow="YOUR ROAD TO LAUNCH"
        title="30 days. Two things to be proud of."
        description="A thoughtful plan, one tangible deliverable at a time. Make it your own."
        actions={
          <span className="roadmap-range">
            <CalendarDays size={16} />
            {prettyDate(data.settings.startDate)} —{" "}
            {prettyDate(dayDate(data, 30))}
          </span>
        }
      />

      <div className="roadmap-summary card">
        <div className="roadmap-summary-main">
          <span className="summary-icon">
            <Flag size={21} />
          </span>
          <div>
            <strong>
              {completed}{" "}
              <span className="muted">of 30 milestones complete</span>
            </strong>
            <p className="muted">Deliverables you have personally accepted.</p>
          </div>
        </div>
        <div className="roadmap-summary-progress">
          <Progress
            value={(completed / 30) * 100}
            label="Milestone completion"
          />
        </div>
        <div className="roadmap-summary-stat">
          <strong>{overdue}</strong>
          <span className="muted">overdue</span>
        </div>
        <div className="roadmap-summary-stat">
          <strong>{blocked}</strong>
          <span className="muted">blocked</span>
        </div>
      </div>

      <div className="roadmap-toolbar">
        <div className="segmented-control" aria-label="Filter roadmap">
          {(
            [
              ["all", "All 30 days"],
              ["week", "This week"],
              ["blocked", "Blocked"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              className={filter === value ? "active" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="muted roadmap-toolbar-note">
          <span className="today-dot" /> Your pace. Your progress.
        </span>
      </div>

      {filter === "blocked" && blocked === 0 ? (
        <EmptyState
          title="A clear path ahead"
          description="No milestones are blocked. Open any day to update its details or flag a blocker."
        />
      ) : (
        weeks.map((week, index) => {
          const milestones = data.milestones.filter(
            (m) =>
              m.day >= week.from &&
              m.day <= week.to &&
              (filter !== "blocked" || m.status === "Blocked") &&
              (filter !== "week" || index === weekIndex),
          );
          if (!milestones.length) return null;
          const weekCompleted = data.milestones.filter(
            (m) =>
              m.day >= week.from &&
              m.day <= week.to &&
              m.status === "Completed",
          ).length;
          return (
            <section
              className="roadmap-week"
              key={week.from}
              aria-labelledby={`week-${week.from}`}
            >
              <div className="roadmap-week-heading">
                <div className="week-number">0{index + 1}</div>
                <div>
                  <p className="eyebrow">
                    DAYS {week.from}–{week.to} ·{" "}
                    {index === weekIndex && currentDay >= 1 && currentDay <= 30
                      ? "CURRENT WEEK"
                      : "YOUR ROADMAP"}
                  </p>
                  <h2 id={`week-${week.from}`}>{week.title}</h2>
                  <p className="muted">{week.description}</p>
                </div>
                <span className="week-completion">
                  {weekCompleted}/{week.to - week.from + 1} complete
                </span>
              </div>
              <div className="roadmap-grid">
                {milestones.map((milestone) => {
                  const tasks = data.tasks.filter(
                    (task) => task.day === milestone.day,
                  );
                  const done = tasks.filter(
                    (task) => task.status === "Completed",
                  ).length;
                  const due = milestone.dueDate || dayDate(data, milestone.day);
                  const isOverdue =
                    milestone.status !== "Completed" && due < today;
                  const isToday = due === today;
                  return (
                    <button
                      type="button"
                      key={milestone.day}
                      className={`day-card card ${isToday ? "is-today" : ""} ${milestone.status === "Completed" ? "is-completed" : ""}`}
                      onClick={() => openMilestone(milestone)}
                      aria-label={`Day ${milestone.day}: ${milestone.title}. ${milestone.status}. Open milestone`}
                    >
                      <div className="day-card-top">
                        <span className="day-number">
                          DAY {String(milestone.day).padStart(2, "0")}
                        </span>
                        {isToday ? (
                          <Badge variant="caramel">Today</Badge>
                        ) : (
                          <Badge
                            variant={
                              milestone.status === "Completed"
                                ? "sage"
                                : milestone.status === "Blocked"
                                  ? "rose"
                                  : "neutral"
                            }
                          >
                            {milestone.status}
                          </Badge>
                        )}
                      </div>
                      <h3>{milestone.title}</h3>
                      <p className="day-card-objective">
                        {milestone.objective}
                      </p>
                      <div className="day-card-progress">
                        <Progress
                          value={taskProgress(tasks)}
                          label={`${done} of ${tasks.length} tasks complete`}
                        />
                      </div>
                      <div className="day-card-footer">
                        <span className={isOverdue ? "overdue-label" : "muted"}>
                          <CalendarDays size={13} />
                          {prettyDate(due)}
                          {isOverdue ? " · Overdue" : ""}
                        </span>
                        <span className="day-card-open">
                          <ArrowUpRight size={17} />
                        </span>
                      </div>
                      {milestone.status === "Completed" && (
                        <span className="deliverable-accepted">
                          <CheckCircle2 size={13} />
                          Deliverable accepted
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      <div className="roadmap-footnote">
        <ListChecks size={16} />
        <p>
          Tasks track the work. Milestones track the result. A milestone is
          complete only when you accept its deliverable.
        </p>
      </div>

      {editing && (
        <Modal
          title={`Day ${editing.day} · Milestone details`}
          onClose={() => setEditing(null)}
          wide
        >
          <form className="stack milestone-form" onSubmit={saveMilestone}>
            <label className="field">
              Title
              <input
                required
                maxLength={180}
                value={editing.title}
                onChange={(event) =>
                  setEditing({ ...editing, title: event.target.value })
                }
              />
            </label>
            <label className="field">
              Main objective
              <textarea
                required
                rows={2}
                maxLength={20000}
                value={editing.objective}
                onChange={(event) =>
                  setEditing({ ...editing, objective: event.target.value })
                }
              />
            </label>
            <label className="field">
              Description
              <textarea
                required
                rows={3}
                maxLength={20000}
                value={editing.description}
                onChange={(event) =>
                  setEditing({ ...editing, description: event.target.value })
                }
              />
            </label>
            <div className="milestone-deliverable-box">
              <div className="section-heading">
                <Flag size={17} />
                <h3>The tangible result</h3>
              </div>
              <label className="field">
                Deliverable
                <textarea
                  required
                  rows={2}
                  maxLength={20000}
                  value={editing.deliverable}
                  onChange={(event) =>
                    setEditing({ ...editing, deliverable: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Acceptance criteria
                <textarea
                  required
                  rows={3}
                  maxLength={20000}
                  value={editing.acceptance}
                  onChange={(event) =>
                    setEditing({ ...editing, acceptance: event.target.value })
                  }
                />
              </label>
            </div>
            <div className="form-grid">
              <label className="field">
                Priority
                <select
                  value={editing.priority}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      priority: event.target.value as Priority,
                    })
                  }
                >
                  {priorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Deliverable status
                <select
                  value={editing.status}
                  onChange={(event) => {
                    setEditing({
                      ...editing,
                      status: event.target.value as TaskStatus,
                    });
                    setConfirmed(false);
                  }}
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Start date
                <input
                  required
                  type="date"
                  min="1900-01-01"
                  max={editing.dueDate || "2200-12-31"}
                  value={editing.startDate}
                  onChange={(event) =>
                    setEditing({ ...editing, startDate: event.target.value })
                  }
                />
              </label>
              <label className="field">
                Due date
                <input
                  required
                  type="date"
                  min={editing.startDate || "1900-01-01"}
                  max="2200-12-31"
                  value={editing.dueDate}
                  onChange={(event) =>
                    setEditing({ ...editing, dueDate: event.target.value })
                  }
                />
              </label>
            </div>
            {needsConfirmation && (
              <label className="confirmation-check">
                <input
                  required
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                <span>
                  I have personally checked this deliverable and confirmed that
                  its acceptance criteria are met.
                </span>
              </label>
            )}
            <section className="milestone-task-section">
              <div className="section-heading">
                <ListChecks size={17} />
                <h3>Day {editing.day} tasks</h3>
                <span className="muted">Task progress is separate.</span>
              </div>
              {data.tasks
                .filter((task) => task.day === editing.day)
                .sort((a, b) => a.order - b.order)
                .map((task) => (
                  <label className="milestone-task" key={task.id}>
                    <input
                      type="checkbox"
                      checked={task.status === "Completed"}
                      onChange={(event) =>
                        actions.updateTask(task.id, {
                          status: event.target.checked
                            ? "Completed"
                            : "Not Started",
                        })
                      }
                    />
                    <span
                      className={
                        task.status === "Completed"
                          ? "completed-task-title"
                          : ""
                      }
                    >
                      {task.title}
                    </span>
                    <Badge>{task.project}</Badge>
                  </label>
                ))}
              {!data.tasks.some((task) => task.day === editing.day) && (
                <p className="muted">
                  No tasks yet. Add work for this day in Daily Missions.
                </p>
              )}
            </section>
            <label className="field">
              Notes
              <textarea
                rows={3}
                maxLength={50000}
                value={editing.notes}
                onChange={(event) =>
                  setEditing({ ...editing, notes: event.target.value })
                }
                placeholder="Decisions, blockers, or things to remember…"
              />
            </label>
            <label className="field">
              Relevant files and links
              <textarea
                rows={2}
                maxLength={50000}
                value={editing.links}
                onChange={(event) =>
                  setEditing({ ...editing, links: event.target.value })
                }
                placeholder="File paths or URLs, one per line"
              />
            </label>
            <label className="field">
              Related AI prompts
              <textarea
                rows={3}
                maxLength={50000}
                value={editing.prompts}
                onChange={(event) =>
                  setEditing({ ...editing, prompts: event.target.value })
                }
                placeholder="Prompt text, titles, or links"
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                <Check size={16} />
                Save milestone
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
