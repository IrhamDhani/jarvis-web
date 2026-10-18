import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  Layers3,
  BookOpen,
  Search,
  ListChecks,
} from "lucide-react";
import type { PageProps, TaskStatus } from "../types";
import { projectProgress, localDate } from "../lib/model";
import { PageHeading, Progress, Badge, EmptyState } from "../components/ui";
export default function ProjectWorkspace({
  data,
  actions,
  project,
  openDay,
  openNotes,
}: PageProps & {
  project: "Website" | "Workbook";
  openDay: (day: number) => void;
  openNotes: () => void;
}) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const tasks = data.tasks.filter((t) => t.project === project);
  const matches = tasks.filter(
    (t) =>
      (status === "All" || status === t.status) &&
      t.title.toLowerCase().includes(query.toLowerCase()),
  );
  const isWeb = project === "Website";
  const progress = projectProgress(data, project);
  const captures = data.captures.filter((c) =>
    isWeb ? c.category === "Bug" : c.category === "Book improvement",
  );
  return (
    <>
      <PageHeading
        eyebrow={
          isWeb ? "BUILD SOMETHING EXPLORABLE" : "ONE THOUGHTFUL PAGE AT A TIME"
        }
        title={isWeb ? "IRHAM MATH LAB" : "The Algebra Workbook"}
        description={
          isWeb
            ? "Your website tasks, connected to the bigger picture."
            : "From the first outline to a workbook you’re proud to share."
        }
        actions={
          <button className="button secondary" onClick={openNotes}>
            Open project notes <ArrowUpRight size={16} />
          </button>
        }
      />
      <section
        className={`project-summary card ${isWeb ? "project-sage" : "project-rose"}`}
      >
        <span className={`project-icon ${isWeb ? "sage" : "rose"}`}>
          {isWeb ? <Layers3 size={28} /> : <BookOpen size={28} />}
        </span>
        <div>
          <h2>
            {tasks.filter((t) => t.status === "Completed").length} of{" "}
            {tasks.length} tasks complete
          </h2>
          <p className="muted">
            Task completion records your work. Verify the deliverable separately
            in the roadmap.
          </p>
          <Progress value={progress} />
        </div>
        <strong className="project-big-progress">{progress}%</strong>
      </section>
      <div className="project-metrics">
        <span>
          <ListChecks size={17} />
          {tasks.filter((t) => t.status === "Blocked").length} blocked
        </span>
        <span>
          {
            tasks.filter(
              (t) =>
                t.status !== "Completed" &&
                t.deadline &&
                t.deadline < localDate(),
            ).length
          }{" "}
          overdue
        </span>
        <button className="text-link" onClick={openNotes}>
          {captures.length} {isWeb ? "bug notes" : "book improvements"}{" "}
          <ArrowUpRight size={14} />
        </button>
      </div>
      <div className="filter-toolbar">
        <label className="search-field">
          <Search size={17} />
          <input
            type="search"
            aria-label="Search project tasks"
            placeholder="Find a task…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter task status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {["All", "Not Started", "In Progress", "Blocked", "Completed"].map(
            (s) => (
              <option key={s}>{s}</option>
            ),
          )}
        </select>
      </div>
      <section className="card project-task-list">
        {matches.map((task) => (
          <div
            className={`project-task-row ${task.status === "Completed" ? "is-complete" : ""}`}
            key={task.id}
          >
            <label className="check-control">
              <input
                type="checkbox"
                checked={task.status === "Completed"}
                onChange={() =>
                  actions.updateTask(task.id, {
                    status: (task.status === "Completed"
                      ? "Not Started"
                      : "Completed") as TaskStatus,
                  })
                }
              />
              <span>{task.status === "Completed" && <Check size={13} />}</span>
              <span className="sr-only">Complete {task.title}</span>
            </label>
            <div className="project-task-body">
              <h3>{task.title}</h3>
              <span className="task-sub">
                Day {task.day} · {task.deadline} · {task.estimate} min
                {task.deadline < localDate() && task.status !== "Completed" && (
                  <span className="overdue">Overdue</span>
                )}
              </span>
            </div>
            <Badge
              variant={
                task.status === "Completed"
                  ? "sage"
                  : task.status === "Blocked"
                    ? "rose"
                    : "neutral"
              }
            >
              {task.status}
            </Badge>
            <button
              className="icon-button"
              aria-label={`Open Day ${task.day}: ${task.title}`}
              onClick={() => openDay(task.day)}
            >
              <ArrowUpRight size={18} />
            </button>
          </div>
        ))}
        {!matches.length && (
          <EmptyState
            title="A little breathing room."
            description="No tasks match this view. Try another status or search."
          />
        )}
      </section>
    </>
  );
}
