import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock3,
  Code2,
  Flag,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  Trash2,
} from "lucide-react";
import type { PageProps, Priority, Project, Task, TaskStatus } from "../types";
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
const projects: Project[] = [
  "Website",
  "Workbook",
  "AI",
  "Verification",
  "Studio",
];
const projectDetails = {
  Website: {
    title: "IRHAM MATH LAB",
    subtitle: "Build a better way to learn.",
    icon: Code2,
  },
  Workbook: {
    title: "Algebra workbook",
    subtitle: "Turn knowledge into something lasting.",
    icon: BookOpen,
  },
  AI: {
    title: "AI collaboration",
    subtitle: "Ask clearly. Verify personally.",
    icon: Sparkles,
  },
  Verification: {
    title: "Testing & verification",
    subtitle: "Good work deserves a careful check.",
    icon: ShieldCheck,
  },
  Studio: {
    title: "Studio & planning",
    subtitle: "Make room for focused work.",
    icon: Target,
  },
};
const reviewQuestions = [
  "What did I actually complete?",
  "What did I learn?",
  "What problems remain?",
  "What did I ask AI to do?",
  "What output did AI produce?",
  "What did I personally verify?",
  "What should I do tomorrow?",
  "What should I avoid tomorrow?",
];
type TaskDraft = Omit<Task, "id" | "completedAt" | "order">;
type ReviewDraft = { date: string; answers: string[]; dirty: boolean };
const clampDay = (day: number) => Math.max(1, Math.min(30, day));

export default function Missions({
  data,
  actions,
  onFocus,
  initialDay,
}: PageProps & { onFocus: () => void; initialDay?: number }) {
  const [day, setDay] = useState(() =>
    clampDay(initialDay ?? projectDay(data.settings.startDate)),
  );
  const [taskEditor, setTaskEditor] = useState<{
    id: string | null;
    draft: TaskDraft;
  } | null>(null);
  const [reviewSaved, setReviewSaved] = useState(false);
  const [reviewPending, setReviewPending] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [selectedReviewDate, setSelectedReviewDate] = useState<string | null>(
    null,
  );
  const milestone = data.milestones.find((item) => item.day === day);
  const date = dayDate(data, day);
  const today = localDate();
  const effectiveReviewDate = selectedReviewDate ?? date;
  const savedReview = data.reviews[effectiveReviewDate];
  const [reviewDraft, setReviewDraft] = useState<ReviewDraft>(() => ({
    date: effectiveReviewDate,
    answers: reviewQuestions.map(
      (_, index) => savedReview?.answers[index] ?? "",
    ),
    dirty: false,
  }));
  // The ref always owns the date of the edited answers, including between a
  // navigation render and its effects. An old draft can never move to a new day.
  const reviewRef = useRef(reviewDraft);
  const reviewTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveReviewAction = useRef(actions.saveReview);
  saveReviewAction.current = actions.saveReview;
  const answers =
    reviewDraft.date === effectiveReviewDate
      ? reviewDraft.answers
      : reviewQuestions.map((_, index) => savedReview?.answers[index] ?? "");
  const tasks = data.tasks
    .filter((task) => task.day === day)
    .sort((a, b) => a.order - b.order);
  const completed = tasks.filter((task) => task.status === "Completed").length;
  const remaining = tasks.length - completed;
  const estimate = tasks.reduce((total, task) => total + task.estimate, 0);
  const actual = tasks.reduce((total, task) => total + task.actual, 0);
  const nextTask =
    tasks.find(
      (task) =>
        task.status !== "Completed" &&
        task.status !== "Blocked" &&
        task.priority === "High",
    ) ??
    tasks.find(
      (task) => task.status !== "Completed" && task.status !== "Blocked",
    );

  useEffect(() => {
    if (initialDay !== undefined) {
      setDay(clampDay(initialDay));
      setSelectedReviewDate(null);
    }
  }, [initialDay]);
  useEffect(() => {
    const previous = reviewRef.current;
    if (previous.date !== effectiveReviewDate) {
      flushReview(false, false);
      const next = {
        date: effectiveReviewDate,
        answers: reviewQuestions.map(
          (_, index) => savedReview?.answers[index] ?? "",
        ),
        dirty: false,
      };
      reviewRef.current = next;
      setReviewDraft(next);
      setReviewSaved(false);
      setReviewPending(false);
      setReviewError(null);
    } else if (!previous.dirty) {
      const next = {
        date: effectiveReviewDate,
        answers: reviewQuestions.map(
          (_, index) => savedReview?.answers[index] ?? "",
        ),
        dirty: false,
      };
      reviewRef.current = next;
      setReviewDraft(next);
      setReviewPending(false);
    }
  }, [effectiveReviewDate, savedReview?.updatedAt]);

  useEffect(() => {
    // saveReview persists synchronously, including during browser dismissal.
    const flushBeforeLeaving = () => {
      flushReview(false, false);
    };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flushBeforeLeaving();
    };
    window.addEventListener("beforeunload", flushBeforeLeaving);
    window.addEventListener("pagehide", flushBeforeLeaving);
    document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("beforeunload", flushBeforeLeaving);
      window.removeEventListener("pagehide", flushBeforeLeaving);
      document.removeEventListener("visibilitychange", flushWhenHidden);
      // A pristine draft does nothing, so StrictMode's setup/cleanup replay
      // never creates empty reviews or changes their saved timestamps.
      flushReview(false, false);
    };
  }, []);

  function cancelReviewTimer() {
    if (reviewTimer.current !== null) {
      clearTimeout(reviewTimer.current);
      reviewTimer.current = null;
    }
  }

  function flushReview(force = false, updateUi = true) {
    cancelReviewTimer();
    const draft = reviewRef.current;
    if (!force && !draft.dirty) return true;
    try {
      saveReviewAction.current({
        date: draft.date,
        answers: [...draft.answers],
        updatedAt: new Date().toISOString(),
      });
      reviewRef.current = { ...draft, dirty: false };
      if (updateUi) {
        setReviewSaved(true);
        setReviewPending(false);
        setReviewError(null);
      }
      return true;
    } catch (error) {
      if (updateUi) {
        setReviewSaved(false);
        setReviewPending(false);
        setReviewError(
          error instanceof Error
            ? error.message
            : "Your review could not be saved. Your draft is still here; try saving again.",
        );
      }
      return false;
    }
  }

  function updateReviewAnswer(index: number, value: string) {
    const current =
      reviewRef.current.date === effectiveReviewDate
        ? reviewRef.current.answers
        : answers;
    const next = {
      date: effectiveReviewDate,
      answers: current.map((answer, answerIndex) =>
        answerIndex === index ? value : answer,
      ),
      dirty: true,
    };
    reviewRef.current = next;
    setReviewDraft(next);
    setReviewSaved(false);
    setReviewPending(true);
    cancelReviewTimer();
    reviewTimer.current = setTimeout(() => flushReview(), 500);
  }

  function changeDay(value: number) {
    if (!flushReview()) return;
    setDay(clampDay(value));
    setSelectedReviewDate(null);
    setReviewSaved(false);
    setReviewPending(false);
  }

  function changeReviewDate(value: string) {
    if (!flushReview()) return;
    setSelectedReviewDate(value === date ? null : value);
    setReviewSaved(false);
    setReviewPending(false);
    setReviewError(null);
  }

  function editTask(task?: Task, project: Project = "Website") {
    setTaskEditor(
      task
        ? {
            id: task.id,
            draft: {
              title: task.title,
              day: task.day,
              project: task.project,
              status: task.status,
              priority: task.priority,
              estimate: task.estimate,
              actual: task.actual,
              notes: task.notes,
              deadline: task.deadline,
              prompt: task.prompt,
            },
          }
        : {
            id: null,
            draft: {
              title: "",
              day,
              project,
              status: "Not Started",
              priority: "Medium",
              estimate: 30,
              actual: 0,
              notes: "",
              deadline: "",
              prompt: "",
            },
          },
    );
  }

  function saveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!taskEditor || !taskEditor.draft.title.trim()) return;
    const draft = { ...taskEditor.draft, title: taskEditor.draft.title.trim() };
    if (taskEditor.id) actions.updateTask(taskEditor.id, draft);
    else actions.addTask(draft);
    setTaskEditor(null);
  }

  function deleteTask() {
    if (
      !taskEditor?.id ||
      !window.confirm(
        `Delete “${taskEditor.draft.title}”? This cannot be undone.`,
      )
    )
      return;
    actions.deleteTask(taskEditor.id);
    setTaskEditor(null);
  }

  function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    flushReview(true);
  }

  function updateDraft(changes: Partial<TaskDraft>) {
    setTaskEditor((current) =>
      current ? { ...current, draft: { ...current.draft, ...changes } } : null,
    );
  }

  return (
    <div className="page missions-page">
      <PageHeading
        eyebrow="A LITTLE FOCUS GOES A LONG WAY"
        title="Make today meaningful."
        description="Your next small steps toward something worth finishing."
        actions={
          <button className="button primary" onClick={() => editTask()}>
            <Plus size={17} />
            Add a task
          </button>
        }
      />

      <div className="mission-date-toolbar">
        <div className="day-navigation">
          <button
            className="button ghost icon-button"
            disabled={day === 1}
            onClick={() => changeDay(day - 1)}
            aria-label="Previous project day"
          >
            <ChevronLeft size={18} />
          </button>
          <label className="day-select">
            <span className="sr-only">Project day</span>
            <select
              value={day}
              onChange={(event) => changeDay(Number(event.target.value))}
            >
              {Array.from({ length: 30 }, (_, index) => (
                <option key={index + 1} value={index + 1}>
                  Day {String(index + 1).padStart(2, "0")}
                </option>
              ))}
            </select>
          </label>
          <button
            className="button ghost icon-button"
            disabled={day === 30}
            onClick={() => changeDay(day + 1)}
            aria-label="Next project day"
          >
            <ChevronRight size={18} />
          </button>
          <span className="mission-calendar-date">
            <CalendarDays size={15} />
            {new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </span>
          {date === today && <Badge variant="caramel">Today</Badge>}
        </div>
        <button
          className="text-link"
          onClick={() => changeDay(projectDay(data.settings.startDate))}
        >
          Back to today
        </button>
      </div>

      <section className="mission-objective-card card">
        <div className="mission-objective-main">
          <span className="eyebrow">
            DAY {String(day).padStart(2, "0")} · THE MAIN OBJECTIVE
          </span>
          <h2>{milestone?.title ?? "A fresh day of focused work"}</h2>
          <p>
            {milestone?.objective ??
              "Choose one useful thing to finish, then give it your attention."}
          </p>
          <div className="mission-deliverable">
            <Flag size={16} />
            <span>
              {milestone?.deliverable ??
                "Add your tasks and define a tangible result in the roadmap."}
            </span>
          </div>
          <div className="mission-objective-actions">
            <button className="button primary" onClick={onFocus}>
              <Timer size={17} />
              Start focus session
            </button>
            <span className="muted">
              <Clock3 size={14} />
              {estimate} min planned
            </span>
          </div>
        </div>
        <div className="mission-progress-panel">
          <div className="mission-progress-value">
            {Math.round(taskProgress(tasks))}
            <span>%</span>
          </div>
          <p>of today’s tasks complete</p>
          <Progress value={taskProgress(tasks)} label="Daily task completion" />
          <div className="mission-counts">
            <span>
              <strong>{completed}</strong> done
            </span>
            <span>
              <strong>{remaining}</strong> to go
            </span>
          </div>
          <span className="mission-deliverable-status">
            <Badge
              variant={milestone?.status === "Completed" ? "sage" : "neutral"}
            >
              {milestone?.status === "Completed"
                ? "Deliverable accepted"
                : "Deliverable awaiting acceptance"}
            </Badge>
          </span>
        </div>
      </section>

      {nextTask && (
        <div className="next-action-strip">
          <span className="next-action-icon">
            <Sparkles size={16} />
          </span>
          <p>
            <strong>Your next small win</strong>
            <span>{nextTask.title}</span>
          </p>
          <button className="text-link" onClick={() => editTask(nextTask)}>
            View task <ChevronRight size={15} />
          </button>
        </div>
      )}

      <div className="mission-work-heading">
        <div>
          <h2>Your daily missions</h2>
          <p className="muted">One thing at a time is a perfectly good pace.</p>
        </div>
        <span className="mission-time-record">
          <Clock3 size={15} />
          {actual} min recorded
        </span>
      </div>

      {!tasks.length ? (
        <EmptyState
          title="A little space to plan"
          description="There are no tasks for this day yet. Add one clear, achievable next step."
          action={
            <button className="button primary" onClick={() => editTask()}>
              <Plus size={16} />
              Add your first task
            </button>
          }
        />
      ) : (
        <div className="mission-task-groups">
          {projects.map((project) => {
            const groupTasks = tasks.filter((task) => task.project === project);
            if (!groupTasks.length) return null;
            const detail = projectDetails[project];
            const Icon = detail.icon;
            const groupCompleted = groupTasks.filter(
              (task) => task.status === "Completed",
            ).length;
            return (
              <section
                className={`mission-task-group card project-${project.toLowerCase()}`}
                key={project}
              >
                <div className="mission-group-heading">
                  <span className="project-icon">
                    <Icon size={19} />
                  </span>
                  <div>
                    <h3>{detail.title}</h3>
                    <p className="muted">{detail.subtitle}</p>
                  </div>
                  <span className="mission-group-count">
                    {groupCompleted}/{groupTasks.length}
                  </span>
                  <button
                    className="button ghost icon-button"
                    aria-label={`Add ${project.toLowerCase()} task`}
                    onClick={() => editTask(undefined, project)}
                  >
                    <Plus size={17} />
                  </button>
                </div>
                <div className="mission-task-list">
                  {groupTasks.map((task, index) => {
                    const isCompleted = task.status === "Completed";
                    const isOverdue =
                      !isCompleted && !!task.deadline && task.deadline < today;
                    return (
                      <div
                        className={`mission-task ${isCompleted ? "is-completed" : ""}`}
                        key={task.id}
                      >
                        <label className="task-check">
                          <input
                            type="checkbox"
                            aria-label={`Mark ${task.title} ${isCompleted ? "incomplete" : "complete"}`}
                            checked={isCompleted}
                            onChange={(event) =>
                              actions.updateTask(task.id, {
                                status: event.target.checked
                                  ? "Completed"
                                  : "Not Started",
                              })
                            }
                          />
                          <span aria-hidden="true">
                            {isCompleted && <Check size={13} />}
                          </span>
                        </label>
                        <div className="mission-task-content">
                          <button
                            className="task-title-button"
                            onClick={() => editTask(task)}
                          >
                            {task.title}
                          </button>
                          <div className="task-meta">
                            <Badge
                              variant={
                                task.priority === "High"
                                  ? "rose"
                                  : task.priority === "Medium"
                                    ? "caramel"
                                    : "neutral"
                              }
                            >
                              {task.priority}
                            </Badge>
                            {task.status !== "Not Started" && (
                              <span
                                className={`task-status ${task.status === "Blocked" ? "overdue-label" : ""}`}
                              >
                                {task.status}
                              </span>
                            )}
                            <span>
                              <Clock3 size={12} />
                              {task.estimate} min
                            </span>
                            {task.actual > 0 && (
                              <span>{task.actual} min actual</span>
                            )}
                            {task.deadline && (
                              <span
                                className={isOverdue ? "overdue-label" : ""}
                              >
                                <CalendarDays size={12} />
                                {task.deadline}
                                {isOverdue ? " · Overdue" : ""}
                              </span>
                            )}
                          </div>
                          {task.notes && (
                            <p className="task-notes">{task.notes}</p>
                          )}
                        </div>
                        <div className="task-row-actions">
                          <div className="task-order-actions">
                            <button
                              className="button ghost icon-button small"
                              disabled={index === 0}
                              aria-label={`Move ${task.title} up`}
                              onClick={() => actions.moveTask(task.id, -1)}
                            >
                              <ArrowUp size={14} />
                            </button>
                            <button
                              className="button ghost icon-button small"
                              disabled={index === groupTasks.length - 1}
                              aria-label={`Move ${task.title} down`}
                              onClick={() => actions.moveTask(task.id, 1)}
                            >
                              <ArrowDown size={14} />
                            </button>
                          </div>
                          <button
                            className="button ghost icon-button"
                            aria-label={`Edit ${task.title}`}
                            onClick={() => editTask(task)}
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <section className="daily-review card">
        <div className="daily-review-heading">
          <span className="review-icon">
            <ClipboardCheck size={21} />
          </span>
          <div>
            <p className="eyebrow">CLOSE THE LOOP</p>
            <h2>A moment to reflect.</h2>
            <p className="muted">
              Capture the real work. Leave tomorrow a little clearer.
            </p>
          </div>
          <span className="daily-review-date">
            {new Date(`${effectiveReviewDate}T12:00:00`).toLocaleDateString(
              undefined,
              {
                month: "short",
                day: "numeric",
                year: "numeric",
              },
            )}
          </span>
        </div>
        <form className="daily-review-form" onSubmit={saveReview}>
          <label className="field">
            Review date
            <select
              value={effectiveReviewDate}
              onChange={(event) => changeReviewDate(event.target.value)}
            >
              <option value={date}>This day · {date}</option>
              {Object.keys(data.reviews)
                .filter((reviewDate) => reviewDate !== date)
                .sort()
                .reverse()
                .map((reviewDate) => (
                  <option key={reviewDate} value={reviewDate}>
                    Saved review · {reviewDate}
                  </option>
                ))}
            </select>
          </label>
          <p className="muted">
            Saved reviews keep their original calendar dates when your schedule
            changes.
          </p>
          <div className="review-questions">
            {reviewQuestions.map((question, index) => (
              <label className="field review-question" key={question}>
                <span>
                  <span className="review-question-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {question}
                </span>
                <textarea
                  rows={2}
                  maxLength={20000}
                  value={answers[index] ?? ""}
                  onChange={(event) =>
                    updateReviewAnswer(index, event.target.value)
                  }
                  placeholder={
                    index === 0
                      ? "A small win counts, too…"
                      : "A few honest words…"
                  }
                />
              </label>
            ))}
          </div>
          <div className="daily-review-footer">
            {reviewError && (
              <p className="overdue-label" role="alert">
                {reviewError}
              </p>
            )}
            <p className="muted" aria-live="polite">
              {reviewPending
                ? "Saving your review…"
                : reviewSaved
                  ? "Review saved for this date."
                  : savedReview
                    ? `Last saved ${new Date(savedReview.updatedAt).toLocaleString()}`
                    : "Your review saves automatically as you write."}
            </p>
            <button className="button primary" type="submit">
              <Check size={16} />
              Save daily review
            </button>
          </div>
        </form>
      </section>

      {taskEditor && (
        <Modal
          title={taskEditor.id ? "A clearer next step" : "Add a daily mission"}
          onClose={() => setTaskEditor(null)}
          wide
        >
          <form className="stack" onSubmit={saveTask}>
            <label className="field">
              Task title
              <input
                autoFocus
                required
                maxLength={220}
                value={taskEditor.draft.title}
                onChange={(event) => updateDraft({ title: event.target.value })}
                placeholder="What will you finish?"
              />
            </label>
            <div className="form-grid">
              <label className="field">
                Project
                <select
                  value={taskEditor.draft.project}
                  onChange={(event) =>
                    updateDraft({ project: event.target.value as Project })
                  }
                >
                  {projects.map((project) => (
                    <option key={project}>{project}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Roadmap day
                <select
                  value={taskEditor.draft.day}
                  onChange={(event) =>
                    updateDraft({ day: Number(event.target.value) })
                  }
                >
                  {Array.from({ length: 30 }, (_, index) => (
                    <option value={index + 1} key={index + 1}>
                      Day {index + 1}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                Priority
                <select
                  value={taskEditor.draft.priority}
                  onChange={(event) =>
                    updateDraft({ priority: event.target.value as Priority })
                  }
                >
                  {priorities.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Task status
                <select
                  value={taskEditor.draft.status}
                  onChange={(event) =>
                    updateDraft({ status: event.target.value as TaskStatus })
                  }
                >
                  {statuses.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                Estimated minutes
                <input
                  type="number"
                  required
                  min={0}
                  step={1}
                  max={1440}
                  value={taskEditor.draft.estimate}
                  onChange={(event) =>
                    updateDraft({ estimate: Number(event.target.value) })
                  }
                />
              </label>
              <label className="field">
                Actual minutes
                <input
                  type="number"
                  required
                  min={0}
                  step="any"
                  max={1000000}
                  value={taskEditor.draft.actual}
                  onChange={(event) =>
                    updateDraft({ actual: Number(event.target.value) })
                  }
                />
              </label>
              <label className="field">
                Deadline <span className="muted">(optional)</span>
                <input
                  type="date"
                  min="1900-01-01"
                  max="2200-12-31"
                  value={taskEditor.draft.deadline}
                  onChange={(event) =>
                    updateDraft({ deadline: event.target.value })
                  }
                />
              </label>
            </div>
            <label className="field">
              Notes
              <textarea
                rows={3}
                maxLength={50000}
                value={taskEditor.draft.notes}
                onChange={(event) => updateDraft({ notes: event.target.value })}
                placeholder="Context, acceptance criteria, or a useful reminder…"
              />
            </label>
            <label className="field">
              Associated AI prompt <span className="muted">(optional)</span>
              <textarea
                rows={3}
                maxLength={50000}
                value={taskEditor.draft.prompt}
                onChange={(event) =>
                  updateDraft({ prompt: event.target.value })
                }
                placeholder="Paste the prompt, a prompt title, or a link"
              />
            </label>
            <div className="form-actions task-editor-actions">
              {taskEditor.id && (
                <button
                  type="button"
                  className="button ghost danger-text"
                  onClick={deleteTask}
                >
                  <Trash2 size={16} />
                  Delete task
                </button>
              )}
              <button
                type="button"
                className="button secondary"
                onClick={() => setTaskEditor(null)}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                <Check size={16} />
                {taskEditor.id ? "Save task" : "Add task"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
