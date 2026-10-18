import { useState } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  Circle,
  Clock3,
  Sparkles,
  Layers3,
  BookOpen,
  Flag,
  ListChecks,
  Plus,
  CalendarDays,
  ChevronRight,
  MoveUpRight,
  Info,
} from "lucide-react";
import type { PageProps, Page, Task } from "../types";
import {
  localDate,
  projectDay,
  taskProgress,
  projectProgress,
  overallProgress,
  getHealth,
  dayDate,
} from "../lib/model";
import { Badge, Progress, Modal } from "../components/ui";
import { StudioArt, StudioMark } from "../components/StudioArt";

export default function Dashboard({
  data,
  actions,
  now,
  navigate,
  onCapture,
  onFocus,
}: PageProps & {
  now: Date;
  navigate: (page: Page, day?: number) => void;
  onCapture: () => void;
  onFocus: () => void;
}) {
  const [showHealth, setShowHealth] = useState(false);
  const day = projectDay(data.settings.startDate);
  const selectedDay = Math.max(1, Math.min(30, day));
  const milestone = data.milestones.find((m) => m.day === selectedDay)!;
  const tasks = data.tasks
    .filter((t) => t.day === selectedDay)
    .sort((a, b) => a.order - b.order);
  const completed = tasks.filter((t) => t.status === "Completed").length;
  const next = [...tasks]
    .sort(
      (a, b) =>
        ({ High: 0, Medium: 1, Low: 2 })[a.priority] -
        { High: 0, Medium: 1, Low: 2 }[b.priority],
    )
    .find((t) => t.status !== "Completed" && t.status !== "Blocked");
  const health = getHealth(data);
  const hour = now.getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const focusMinutes = data.focusSessions
    .filter((s) => s.date === localDate())
    .reduce((sum, s) => sum + s.minutes, 0);
  const milestonesDone = data.milestones.filter(
    (m) => m.status === "Completed",
  ).length;
  const toggle = (task: Task) =>
    actions.updateTask(task.id, {
      status: task.status === "Completed" ? "Not Started" : "Completed",
    });
  return (
    <div className="dashboard">
      <header className="dashboard-heading">
        <div>
          <p className="eyebrow">
            <span className="tiny-sun">
              <StudioMark size={15} />
            </span>{" "}
            A NEW DAY, A LITTLE MORE POSSIBILITY
          </p>
          <h1>
            {greeting}, {data.settings.name || "Irham"}
            <span className="greeting-dot">.</span>
          </h1>
          <p>Small steps. Thoughtful work. Two ideas brought to life.</p>
        </div>
        <button className="button secondary capture-top" onClick={onCapture}>
          <Plus size={17} /> Quick capture
        </button>
      </header>
      <section className="hero-card" aria-labelledby="hero-title">
        <div className="hero-copy">
          <div className="hero-eyebrow">
            <span className="live-dot" /> YOUR 30-DAY CHAPTER{" "}
            <span className="hero-divider" />{" "}
            {day < 1
              ? "STARTING SOON"
              : day > 30
                ? "REVIEW & REFLECT"
                : `DAY ${String(day).padStart(2, "0")} OF 30`}
          </div>
          <h2 id="hero-title">
            Big ideas. Small steps.
            <br />
            <span>Meaningful progress.</span>
          </h2>
          <p>
            A home for your math lab, your workbook,
            <br className="desktop-break" /> and the focused work that connects
            them.
          </p>
          <button
            className="button primary"
            onClick={() => navigate("missions", selectedDay)}
          >
            {day < 1
              ? "Plan your first day"
              : day > 30
                ? "Review your final day"
                : "Open today’s missions"}
            <ArrowUpRight size={17} />
          </button>
        </div>
        <StudioArt />
        <span className="hero-bottom-note">
          A little intention goes a long way.
        </span>
      </section>
      <section className="stat-grid" aria-label="Your recorded progress">
        <article className="stat-card">
          <div className="stat-label">
            <span>Project completion</span>
            <Flag size={16} />
          </div>
          <div className="stat-value">
            {overallProgress(data)}
            <small>%</small>
            <span className="stat-explain">of your 30-day plan</span>
          </div>
          <Progress
            value={overallProgress(data)}
            label="Completed deliverables"
          />
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <span>
              {day < 1
                ? "Day 1 missions"
                : day > 30
                  ? "Day 30 missions"
                  : "Today’s missions"}
            </span>
            <ListChecks size={17} />
          </div>
          <div className="stat-value">
            {completed}
            <span className="stat-fraction"> / {tasks.length}</span>
            <span className="stat-explain">tasks completed</span>
          </div>
          <div className="stat-foot">
            {tasks.length - completed} small steps to go{" "}
            <ArrowRight size={13} />
          </div>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <span>Milestones reached</span>
            <Flag size={16} />
          </div>
          <div className="stat-value">
            {milestonesDone}
            <span className="stat-fraction"> / 30</span>
            <span className="stat-explain">deliverables completed</span>
          </div>
          <div className="stat-foot">Every finished thing counts.</div>
        </article>
        <article className="stat-card">
          <div className="stat-label">
            <span>Focus time today</span>
            <Clock3 size={17} />
          </div>
          <div className="stat-value">
            {Math.round(focusMinutes)}
            <small>m</small>
            <span className="stat-explain">of intentional work</span>
          </div>
          <button className="stat-foot text-link" onClick={onFocus}>
            Find your focus <ArrowUpRight size={13} />
          </button>
        </article>
      </section>
      <div className="section-heading">
        <div>
          <p className="eyebrow">THE BIG PICTURE</p>
          <h2>Two projects. One purpose.</h2>
        </div>
        <button
          className="health-badge"
          aria-label={`Project health: ${health.label}. View the rules`}
          onClick={() => setShowHealth(true)}
        >
          <span
            className={`status-dot ${health.label === "Behind Schedule" ? "rose" : ""}`}
          />
          {health.label}
          <Info size={13} />
        </button>
      </div>
      <section className="project-grid" aria-label="Your two projects">
        {(["Website", "Workbook"] as const).map((project) => {
          const isWeb = project === "Website";
          const projectTasks = data.tasks.filter((t) => t.project === project);
          const done = projectTasks.filter(
            (t) => t.status === "Completed",
          ).length;
          const nextTask = projectTasks.find((t) => t.status !== "Completed");
          const progress = projectProgress(data, project);
          return (
            <article
              className={`project-card ${isWeb ? "project-sage" : "project-rose"}`}
              key={project}
            >
              <div className="project-top">
                <span className={`project-icon ${isWeb ? "sage" : "rose"}`}>
                  {isWeb ? (
                    <Layers3 size={25} strokeWidth={1.45} />
                  ) : (
                    <BookOpen size={25} strokeWidth={1.45} />
                  )}
                </span>
                <Badge variant={isWeb ? "sage" : "rose"}>
                  {progress === 100
                    ? "Tasks complete"
                    : progress > 0
                      ? "In progress"
                      : "Not started"}
                </Badge>
              </div>
              <button
                className="project-title"
                onClick={() => navigate(isWeb ? "website" : "workbook")}
              >
                <h3>{isWeb ? "IRHAM MATH LAB" : "The Algebra Workbook"}</h3>
                <MoveUpRight size={18} />
              </button>
              <p>
                {isWeb
                  ? "Make mathematics something you can explore."
                  : "From a thoughtful outline to the final page."}
              </p>
              <div className="project-progress-label">
                <span>
                  {isWeb ? "Website development" : "Workbook production"}
                </span>
                <strong>{progress}%</strong>
              </div>
              <Progress
                value={progress}
                label={`${done} of ${projectTasks.length} planned tasks completed`}
              />
              <div className="project-next">
                <span className="next-label">UP NEXT</span>
                <span>
                  {nextTask?.title ||
                    "All planned tasks are complete. Verify the final deliverable."}
                </span>
                <ChevronRight size={15} />
              </div>
            </article>
          );
        })}
      </section>
      <div className="dashboard-lower">
        <section className="card today-card">
          <div className="section-heading compact">
            <div>
              <p className="eyebrow">ONE DAY AT A TIME</p>
              <h2>
                {day < 1
                  ? "Your first day’s focus"
                  : day > 30
                    ? "Your final day’s focus"
                    : "Today’s focus"}
              </h2>
            </div>
            <span className="day-pill">
              Day {String(selectedDay).padStart(2, "0")}
            </span>
          </div>
          <h3 className="mission-title">{milestone.title}</h3>
          <p className="muted mission-objective">{milestone.objective}</p>
          {day < 1 && (
            <p className="inline-note">
              Your project starts on {data.settings.startDate}. These are your
              first planned steps.
            </p>
          )}
          {day > 30 && (
            <p className="inline-note">
              The 30-day period has ended. Unfinished work stays open.
            </p>
          )}
          <div className="compact-tasks">
            {tasks.slice(0, 3).map((task, index) => (
              <div
                className={`compact-task ${task.status === "Completed" ? "is-complete" : ""}`}
                key={task.id}
              >
                <label className="check-control">
                  <input
                    type="checkbox"
                    checked={task.status === "Completed"}
                    onChange={() => toggle(task)}
                  />
                  <span>
                    {task.status === "Completed" && <Check size={13} />}
                  </span>
                  <span className="sr-only">Complete {task.title}</span>
                </label>
                <div>
                  <button
                    className="task-title-link"
                    onClick={() => navigate("missions", selectedDay)}
                  >
                    {task.title}
                  </button>
                  <div className="task-sub">
                    <span
                      className={`category-dot category-${task.project.toLowerCase()}`}
                    />
                    {task.project}
                    <span>·</span>
                    {task.estimate} min{" "}
                    {task.deadline &&
                      task.deadline < localDate() &&
                      task.status !== "Completed" && (
                        <span className="overdue">· Overdue</span>
                      )}
                  </div>
                </div>
                {index === 0 && task.status !== "Completed" ? (
                  <span className="priority-label">Priority</span>
                ) : (
                  <Circle size={5} className="muted" />
                )}
              </div>
            ))}
          </div>
          {tasks.length === 0 && (
            <p className="muted">
              A clear page. Add your first task in Daily Missions.
            </p>
          )}
          <div className="today-footer">
            <span>{taskProgress(tasks)}% of daily tasks complete</span>
            <button
              className="text-link"
              onClick={() => navigate("missions", selectedDay)}
            >
              View all missions <ArrowRight size={15} />
            </button>
          </div>
        </section>
        <aside className="dashboard-aside">
          <section className="focus-card">
            <div className="focus-card-top">
              <span className="focus-spark">
                <Sparkles size={19} strokeWidth={1.3} />
              </span>
              <span>A LITTLE SPACE TO FOCUS</span>
            </div>
            <h2>
              Less switching.
              <br />
              More creating.
            </h2>
            <p>
              {next ? (
                <>
                  Your next small step: <strong>{next.title}</strong>
                </>
              ) : (
                "Take a quiet moment to review what you’ve accomplished."
              )}
            </p>
            <button className="button focus-button" onClick={onFocus}>
              <Clock3 size={16} /> Start focus session
              <ArrowUpRight size={16} />
            </button>
            <span className="focus-card-note">
              {data.settings.focusMinutes} minutes. One meaningful thing.
            </span>
          </section>
          <section className="week-card">
            <span className="week-calendar">
              <CalendarDays size={19} />
            </span>
            <div>
              <p className="eyebrow">COMING UP NEXT</p>
              <button
                className="week-link"
                onClick={() =>
                  navigate("roadmap", Math.min(30, selectedDay + 1))
                }
              >
                {
                  data.milestones.find(
                    (m) => m.day === Math.min(30, selectedDay + 1),
                  )?.title
                }
                <ArrowUpRight size={15} />
              </button>
              <span className="fine-print">
                Day {Math.min(30, selectedDay + 1)} ·{" "}
                {dayDate(data, Math.min(30, selectedDay + 1))}
              </span>
            </div>
          </section>
        </aside>
      </div>
      <footer className="dashboard-footer">
        <span>
          <span className="tiny-sun">
            <StudioMark size={15} />
          </span>{" "}
          Built with intention. One day at a time.
        </span>
        <button className="text-link" onClick={onCapture}>
          Make a little note <Plus size={14} />
        </button>
      </footer>
      {showHealth && (
        <Modal
          title="An honest look at your progress."
          onClose={() => setShowHealth(false)}
        >
          <div className="stack">
            <Badge
              variant={health.label === "Behind Schedule" ? "rose" : "sage"}
            >
              {health.label}
            </Badge>
            <p>{health.reason}</p>
            <h3>How your project health is calculated</h3>
            <ol className="health-rules">
              <li>
                <strong>Completed:</strong> all 30 deliverables have been
                explicitly accepted.
              </li>
              <li>
                <strong>Behind Schedule:</strong> one or more unfinished
                deliverables are past their due date.
              </li>
              <li>
                <strong>At Risk:</strong> a task or milestone is blocked, or a
                task is overdue.
              </li>
              <li>
                <strong>Not started:</strong> the project starts in the future
                and no preceding rule applies.
              </li>
              <li>
                <strong>On Track:</strong> no unfinished work is overdue and
                nothing is blocked.
              </li>
            </ol>
            <p className="muted">
              Dates never mark work complete. You record the work and accept
              each deliverable yourself.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
