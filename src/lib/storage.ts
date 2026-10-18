import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  Capture,
  FocusSession,
  Milestone,
  Review,
  StudioActions,
  StudioData,
  Task,
} from "../types";
import {
  addDays,
  createInitialData,
  localDate,
  projectDay,
  uid,
} from "./model";

export const STORAGE_KEY = "irham-studio-v1";
const MAX_BACKUP_LENGTH = 5_000_000;
const statuses = ["Not Started", "In Progress", "Blocked", "Completed"];
const priorities = ["High", "Medium", "Low"];
const projects = ["Website", "Workbook", "Studio", "AI", "Verification"];
const categories = [
  "Task",
  "Bug",
  "Mathematical idea",
  "Book improvement",
  "AI prompt",
  "Marketing idea",
  "Decision",
];

function fail(path: string, expectation: string): never {
  throw new Error(`Invalid backup: ${path} ${expectation}.`);
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(path, "must be an object");
  return value as Record<string, unknown>;
}

function fields(
  value: Record<string, unknown>,
  keys: string[],
  path: string,
): void {
  for (const key of Object.keys(value))
    if (!keys.includes(key))
      fail(`${path}.${key}`, "is not supported by this data version");
  for (const key of keys)
    if (!Object.hasOwn(value, key)) fail(`${path}.${key}`, "is required");
}

function text(
  value: unknown,
  path: string,
  max = 20_000,
  min = 0,
): asserts value is string {
  if (
    typeof value !== "string" ||
    value.length > max ||
    value.trim().length < min
  )
    fail(path, `must be text between ${min} and ${max} characters`);
}

function number(
  value: unknown,
  path: string,
  min: number,
  max: number,
  integer = false,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  ) {
    fail(
      path,
      `must be ${integer ? "a whole number" : "a number"} from ${min} to ${max}`,
    );
  }
}

function oneOf(value: unknown, options: string[], path: string): void {
  if (typeof value !== "string" || !options.includes(value))
    fail(path, `must be one of ${options.join(", ")}`);
}

function date(value: unknown, path: string, optional = false): void {
  if (optional && value === "") return;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    fail(path, "must be a calendar date (YYYY-MM-DD)");
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day, 12);
  if (year < 1900 || year > 2200 || localDate(parsed) !== value)
    fail(path, "must be a real date between 1900 and 2200");
}

function timestamp(value: unknown, path: string): void {
  if (
    typeof value !== "string" ||
    value.length > 40 ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(
      value,
    ) ||
    !Number.isFinite(Date.parse(value))
  ) {
    fail(path, "must be a valid ISO timestamp");
  }
  date(value.slice(0, 10), path);
  const hours = Number(value.slice(11, 13));
  const minutes = Number(value.slice(14, 16));
  const seconds = Number(value.slice(17, 19));
  if (hours > 23 || minutes > 59 || seconds > 59)
    fail(path, "must contain a real clock time");
}

function array(value: unknown, path: string, max: number): unknown[] {
  if (!Array.isArray(value) || value.length > max)
    fail(path, `must be an array with at most ${max} entries`);
  return value;
}

function unique(values: unknown[], path: string): void {
  if (new Set(values).size !== values.length)
    fail(path, "contains duplicate identifiers");
}

/** Validate before any restore or write. Unsupported versions are never guessed or overwritten. */
export function parseBackup(source: string): StudioData {
  if (source.length > MAX_BACKUP_LENGTH)
    fail("file", "is too large (maximum 5 MB of JSON text)");
  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch {
    fail("file", "must contain valid JSON");
  }
  const root = record(parsed, "data");
  if (root.version !== 1)
    throw new Error(
      "This backup uses an unsupported data version. Keep the original and open it with a compatible version of IRHAM STUDIO.",
    );
  fields(
    root,
    [
      "version",
      "settings",
      "tasks",
      "milestones",
      "reviews",
      "captures",
      "focusSessions",
    ],
    "data",
  );
  const settings = record(root.settings, "settings");
  fields(settings, ["name", "startDate", "focusMinutes"], "settings");
  text(settings.name, "settings.name", 100, 1);
  date(settings.startDate, "settings.startDate");
  number(settings.focusMinutes, "settings.focusMinutes", 1, 180, true);

  const tasks = array(root.tasks, "tasks", 10_000);
  tasks.forEach((entry, index) => {
    const path = `tasks[${index}]`;
    const task = record(entry, path);
    fields(
      task,
      [
        "id",
        "title",
        "day",
        "project",
        "status",
        "priority",
        "estimate",
        "actual",
        "notes",
        "deadline",
        "prompt",
        "completedAt",
        "order",
      ],
      path,
    );
    text(task.id, `${path}.id`, 200, 1);
    text(task.title, `${path}.title`, 1000, 1);
    number(task.day, `${path}.day`, 1, 30, true);
    oneOf(task.project, projects, `${path}.project`);
    oneOf(task.status, statuses, `${path}.status`);
    oneOf(task.priority, priorities, `${path}.priority`);
    number(task.estimate, `${path}.estimate`, 0, 1440);
    number(task.actual, `${path}.actual`, 0, 1_000_000);
    text(task.notes, `${path}.notes`, 50_000);
    text(task.prompt, `${path}.prompt`, 50_000);
    date(task.deadline, `${path}.deadline`, true);
    number(task.order, `${path}.order`, 0, 1_000_000, true);
    if (task.completedAt !== null)
      timestamp(task.completedAt, `${path}.completedAt`);
    if (task.status === "Completed" && task.completedAt === null)
      fail(`${path}.completedAt`, "is required for a completed task");
    if (task.status !== "Completed" && task.completedAt !== null)
      fail(`${path}.completedAt`, "must be null for an unfinished task");
  });
  unique(
    tasks.map((entry) => (entry as Task).id),
    "tasks",
  );

  const milestones = array(root.milestones, "milestones", 30);
  if (milestones.length !== 30)
    fail("milestones", "must contain all 30 roadmap days");
  milestones.forEach((entry, index) => {
    const path = `milestones[${index}]`;
    const milestone = record(entry, path);
    fields(
      milestone,
      [
        "day",
        "title",
        "objective",
        "description",
        "deliverable",
        "acceptance",
        "priority",
        "status",
        "notes",
        "links",
        "prompts",
        "startDate",
        "dueDate",
      ],
      path,
    );
    number(milestone.day, `${path}.day`, 1, 30, true);
    text(milestone.title, `${path}.title`, 1000, 1);
    for (const field of [
      "objective",
      "description",
      "deliverable",
      "acceptance",
    ])
      text(milestone[field], `${path}.${field}`, 20_000, 1);
    for (const field of ["notes", "links", "prompts"])
      text(milestone[field], `${path}.${field}`, 50_000);
    oneOf(milestone.status, statuses, `${path}.status`);
    oneOf(milestone.priority, priorities, `${path}.priority`);
    date(milestone.startDate, `${path}.startDate`);
    date(milestone.dueDate, `${path}.dueDate`);
    if ((milestone.dueDate as string) < (milestone.startDate as string))
      fail(path, "has a due date before its start date");
  });
  unique(
    milestones.map((entry) => (entry as Milestone).day),
    "milestones",
  );

  const reviews = record(root.reviews, "reviews");
  if (Object.keys(reviews).length > 5000)
    fail("reviews", "has too many entries");
  Object.entries(reviews).forEach(([key, entry]) => {
    date(key, "reviews key");
    const path = `reviews.${key}`;
    const review = record(entry, path);
    fields(review, ["date", "answers", "updatedAt"], path);
    if (review.date !== key) fail(`${path}.date`, "must match its review key");
    const answers = array(review.answers, `${path}.answers`, 8);
    if (answers.length !== 8)
      fail(`${path}.answers`, "must contain eight review answers");
    answers.forEach((answer, index) =>
      text(answer, `${path}.answers[${index}]`, 20_000),
    );
    timestamp(review.updatedAt, `${path}.updatedAt`);
  });

  const captures = array(root.captures, "captures", 5000);
  captures.forEach((entry, index) => {
    const path = `captures[${index}]`;
    const capture = record(entry, path);
    fields(
      capture,
      ["id", "category", "title", "content", "tags", "createdAt", "updatedAt"],
      path,
    );
    text(capture.id, `${path}.id`, 200, 1);
    text(capture.title, `${path}.title`, 1000, 1);
    text(capture.content, `${path}.content`, 50_000);
    text(capture.tags, `${path}.tags`, 2000);
    oneOf(capture.category, categories, `${path}.category`);
    timestamp(capture.createdAt, `${path}.createdAt`);
    timestamp(capture.updatedAt, `${path}.updatedAt`);
  });
  unique(
    captures.map((entry) => (entry as Capture).id),
    "captures",
  );

  const sessions = array(root.focusSessions, "focusSessions", 20_000);
  sessions.forEach((entry, index) => {
    const path = `focusSessions[${index}]`;
    const session = record(entry, path);
    fields(session, ["id", "date", "minutes", "taskId"], path);
    text(session.id, `${path}.id`, 200, 1);
    date(session.date, `${path}.date`);
    number(session.minutes, `${path}.minutes`, 0, 180);
    if (session.taskId !== null) text(session.taskId, `${path}.taskId`, 200, 1);
  });
  unique(
    sessions.map((entry) => (entry as FocusSession).id),
    "focusSessions",
  );
  return parsed as StudioData;
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unknown storage error occurred.";
}

interface StorageSnapshot {
  data: StudioData;
  warning: string | null;
  locked: boolean;
  observedRaw: string | null;
}

function readSnapshot(): StorageSnapshot {
  const fallback = createInitialData();
  if (typeof window === "undefined")
    return { data: fallback, warning: null, locked: false, observedRaw: null };
  let stored: string | null;
  try {
    stored = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return {
      data: fallback,
      warning:
        "Browser storage could not be read. Your existing data has not been replaced. Export a backup before resetting or replacing it.",
      locked: true,
      observedRaw: null,
    };
  }
  if (stored === null)
    return { data: fallback, warning: null, locked: false, observedRaw: null };
  try {
    return {
      data: parseBackup(stored),
      warning: null,
      locked: false,
      observedRaw: stored,
    };
  } catch (error) {
    return {
      data: fallback,
      locked: true,
      observedRaw: stored,
      warning: `Saved data could not be loaded. ${errorMessage(error)} The original is preserved. Download the stored data from Settings, then restore a valid backup or explicitly reset.`,
    };
  }
}

export function loadData(): {
  data: StudioData;
  warning: string | null;
  locked: boolean;
} {
  const { data, warning, locked } = readSnapshot();
  return { data, warning, locked };
}

export function saveData(data: StudioData): string | null {
  try {
    const serialized = JSON.stringify(data);
    parseBackup(serialized);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return null;
  } catch (error) {
    return `Changes could not be saved: ${errorMessage(error)} Export your current data before closing this page.`;
  }
}

/** Shift schedule dates only; completion timestamps and historical records stay intact. */
export function rescheduleData(
  data: StudioData,
  startDate: string,
): StudioData {
  const delta = projectDay(data.settings.startDate, startDate) - 1;
  return {
    ...data,
    settings: { ...data.settings, startDate },
    milestones: data.milestones.map((milestone) => ({
      ...milestone,
      startDate: addDays(milestone.startDate, delta),
      dueDate: addDays(milestone.dueDate, delta),
    })),
    tasks: data.tasks.map((task) => ({
      ...task,
      deadline: task.deadline ? addDays(task.deadline, delta) : "",
    })),
  };
}

export function updateTaskData(
  data: StudioData,
  id: string,
  changes: Partial<Task>,
  now = new Date().toISOString(),
): StudioData {
  return {
    ...data,
    tasks: data.tasks.map((task) => {
      if (task.id !== id) return task;
      const next = { ...task, ...changes, id: task.id, order: task.order };
      next.completedAt =
        next.status === "Completed"
          ? task.status === "Completed"
            ? (task.completedAt ?? now)
            : now
          : null;
      return next;
    }),
  };
}

export function moveTaskData(
  data: StudioData,
  id: string,
  direction: -1 | 1,
): StudioData {
  const task = data.tasks.find((item) => item.id === id);
  if (!task) return data;
  const group = data.tasks
    .filter((item) => item.day === task.day && item.project === task.project)
    .sort((a, b) => a.order - b.order);
  const from = group.findIndex((item) => item.id === id);
  const target = from + direction;
  if (target < 0 || target >= group.length) return data;
  [group[from], group[target]] = [group[target], group[from]];
  const order = new Map(group.map((item, index) => [item.id, index]));
  return {
    ...data,
    tasks: data.tasks.map((item) =>
      order.has(item.id) ? { ...item, order: order.get(item.id)! } : item,
    ),
  };
}

/** A focus record adds actual elapsed time, never estimated time or completion. */
export function addFocusData(
  data: StudioData,
  session: Omit<FocusSession, "id">,
): StudioData {
  return {
    ...data,
    focusSessions: [...data.focusSessions, { ...session, id: uid() }],
    tasks: data.tasks.map((task) =>
      task.id === session.taskId
        ? {
            ...task,
            actual:
              Math.round((task.actual + session.minutes) * 1_000_000) /
              1_000_000,
          }
        : task,
    ),
  };
}

/** Validate the complete candidate before exposing it to the UI or browser storage. */
export function validatedMutation(
  data: StudioData,
  update: (current: StudioData) => StudioData,
): StudioData {
  return parseBackup(JSON.stringify(update(data)));
}

export function useStudio(): {
  data: StudioData;
  actions: StudioActions;
  saveError: string | null;
  storageWarning: string | null;
  storageLocked: boolean;
} {
  const [state, setState] = useState(readSnapshot);
  const stateRef = useRef(state);
  const [saveError, setSaveError] = useState<string | null>(null);

  const publish = useCallback((snapshot: StorageSnapshot) => {
    stateRef.current = snapshot;
    setState(snapshot);
  }, []);

  const adoptExternal = useCallback(
    (raw: string | null) => {
      try {
        if (raw === null) throw new Error("The saved workspace was removed.");
        const data = parseBackup(raw);
        publish({ data, warning: null, locked: false, observedRaw: raw });
        setSaveError(null);
      } catch (error) {
        publish({
          ...stateRef.current,
          locked: true,
          observedRaw: raw,
          warning: `Another tab changed or removed the saved workspace. ${errorMessage(error)} Editing is paused and the stored data has not been overwritten. Export a backup, then restore or explicitly reset in Settings.`,
        });
      }
    },
    [publish],
  );

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return;
      if (event.storageArea && event.storageArea !== window.localStorage)
        return;
      // Read the latest value so queued events cannot roll the UI back to an older edit.
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw !== stateRef.current.observedRaw) adoptExternal(raw);
      } catch {
        publish({
          ...stateRef.current,
          locked: true,
          warning:
            "Browser storage can no longer be read. Editing is paused to protect existing data. Export a backup before restoring or resetting in Settings.",
        });
      }
    };
    window.addEventListener("storage", onStorage);

    // Seed an empty browser once. Existing and externally received records are never rewritten.
    const current = stateRef.current;
    if (!current.locked && current.observedRaw === null) {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw !== null) adoptExternal(raw);
        else {
          const serialized = JSON.stringify(current.data);
          window.localStorage.setItem(STORAGE_KEY, serialized);
          publish({ ...current, observedRaw: serialized });
          setSaveError(null);
        }
      } catch (error) {
        setSaveError(
          `Changes could not be saved: ${errorMessage(error)} Export your current data before closing this page.`,
        );
      }
    }
    return () => window.removeEventListener("storage", onStorage);
  }, [adoptExternal, publish]);

  const actions = useMemo<StudioActions>(() => {
    const commit = (data: StudioData, explicitReplacement = false) => {
      const current = stateRef.current;
      if (current.locked && !explicitReplacement)
        throw new Error(
          "Editing is paused to protect your saved data. Restore a valid backup or explicitly reset in Settings.",
        );
      let observedRaw = current.observedRaw;
      if (!explicitReplacement) {
        let latest: string | null;
        try {
          latest = window.localStorage.getItem(STORAGE_KEY);
        } catch {
          publish({
            ...current,
            locked: true,
            warning:
              "Browser storage can no longer be read. Editing is paused to protect existing data. Export a backup before restoring or resetting in Settings.",
          });
          throw new Error(
            "Changes were not applied because browser storage could not be checked. Export a backup and open Settings.",
          );
        }
        if (latest !== current.observedRaw) {
          adoptExternal(latest);
          setSaveError(
            "Another tab changed the workspace. Your edit was not applied. Review the latest saved state before trying again.",
          );
          throw new Error(
            "Another tab changed the workspace. The latest saved state has been checked; review it before trying this edit again.",
          );
        }
      }
      const serialized = JSON.stringify(data);
      try {
        window.localStorage.setItem(STORAGE_KEY, serialized);
        observedRaw = serialized;
        setSaveError(null);
      } catch (error) {
        setSaveError(
          `Changes could not be saved: ${errorMessage(error)} Export your current data before closing this page.`,
        );
      }
      // All effects (IDs, timestamps, validation and persistence) happen once, outside React updaters.
      publish({ data, warning: null, locked: false, observedRaw });
    };
    const mutate = (update: (data: StudioData) => StudioData) => {
      if (stateRef.current.locked)
        throw new Error(
          "Editing is paused to protect your saved data. Restore a valid backup or explicitly reset in Settings.",
        );
      const candidate = validatedMutation(stateRef.current.data, update);
      commit(candidate);
    };
    const replace = (data: StudioData) =>
      commit(parseBackup(JSON.stringify(data)), true);
    return {
      updateTask: (id, changes) =>
        mutate((data) => updateTaskData(data, id, changes)),
      addTask: (task) =>
        mutate((data) => ({
          ...data,
          tasks: [
            ...data.tasks,
            {
              ...task,
              id: uid(),
              order:
                Math.max(
                  -1,
                  ...data.tasks
                    .filter(
                      (item) =>
                        item.day === task.day && item.project === task.project,
                    )
                    .map((item) => item.order),
                ) + 1,
              completedAt:
                task.status === "Completed" ? new Date().toISOString() : null,
            },
          ],
        })),
      deleteTask: (id) =>
        mutate((data) => ({
          ...data,
          tasks: data.tasks.filter((task) => task.id !== id),
        })),
      moveTask: (id, direction) =>
        mutate((data) => moveTaskData(data, id, direction)),
      updateMilestone: (day, changes) =>
        mutate((data) => ({
          ...data,
          milestones: data.milestones.map((milestone) =>
            milestone.day === day
              ? { ...milestone, ...changes, day }
              : milestone,
          ),
        })),
      saveReview: (review: Review) =>
        mutate((data) => ({
          ...data,
          reviews: {
            ...data.reviews,
            [review.date]: { ...review, answers: [...review.answers] },
          },
        })),
      updateSettings: (changes) =>
        mutate((data) => {
          const shifted =
            changes.startDate && changes.startDate !== data.settings.startDate
              ? rescheduleData(data, changes.startDate)
              : data;
          return { ...shifted, settings: { ...shifted.settings, ...changes } };
        }),
      addCapture: (capture) =>
        mutate((data) => {
          const now = new Date().toISOString();
          return {
            ...data,
            captures: [
              { ...capture, id: uid(), createdAt: now, updatedAt: now },
              ...data.captures,
            ],
          };
        }),
      updateCapture: (id, changes) =>
        mutate((data) => ({
          ...data,
          captures: data.captures.map((capture) =>
            capture.id === id
              ? {
                  ...capture,
                  ...changes,
                  id: capture.id,
                  createdAt: capture.createdAt,
                  updatedAt: new Date().toISOString(),
                }
              : capture,
          ),
        })),
      deleteCapture: (id) =>
        mutate((data) => ({
          ...data,
          captures: data.captures.filter((capture) => capture.id !== id),
        })),
      addFocus: (session) => mutate((data) => addFocusData(data, session)),
      replaceData: replace,
      resetData: () => replace(createInitialData()),
    };
  }, [adoptExternal, publish]);

  return {
    data: state.data,
    actions,
    saveError,
    storageWarning: state.warning,
    storageLocked: state.locked,
  };
}
