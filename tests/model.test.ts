import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudioData } from "../src/types";
import {
  addDays,
  createInitialData,
  dayDate,
  getHealth,
  localDate,
  overallProgress,
  percent,
  projectDay,
  projectProgress,
  taskProgress,
} from "../src/lib/model";
import {
  addFocusData,
  loadData,
  moveTaskData,
  parseBackup,
  rescheduleData,
  saveData,
  STORAGE_KEY,
  updateTaskData,
  validatedMutation,
} from "../src/lib/storage";

const originalTimezone = process.env.TZ;
afterEach(() => {
  process.env.TZ = originalTimezone;
  vi.unstubAllGlobals();
});

function example(): StudioData {
  return createInitialData("2026-03-01");
}

describe("calendar dates", () => {
  it("uses the browser calendar date rather than a UTC date slice", () => {
    process.env.TZ = "America/New_York";
    expect(localDate(new Date("2026-03-01T01:30:00Z"))).toBe("2026-02-28");
  });

  it("adds calendar days across daylight-saving boundaries", () => {
    process.env.TZ = "America/New_York";
    expect(addDays("2026-03-07", 2)).toBe("2026-03-09");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
    expect(projectDay("2026-03-07", "2026-03-09")).toBe(3);
    expect(projectDay("2026-10-31", "2026-11-02")).toBe(3);
  });

  it("handles leap years, month boundaries, and project days outside the schedule", () => {
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(projectDay("2026-03-01", "2026-02-28")).toBe(0);
    expect(projectDay("2026-03-01", "2026-03-31")).toBe(31);
  });

  it("uses customized milestone dates and a safe schedule fallback", () => {
    const data = example();
    data.milestones[0].dueDate = "2026-03-04";
    expect(dayDate(data, 1)).toBe("2026-03-04");
    data.milestones = [];
    expect(dayDate(data, 3)).toBe("2026-03-03");
  });
});

describe("initial plan and progress", () => {
  it("provides all 30 milestones and meaningful incomplete tasks with zero activity", () => {
    const data = example();
    expect(data.milestones).toHaveLength(30);
    expect(data.tasks).toHaveLength(120);
    expect(new Set(data.tasks.map((task) => task.id)).size).toBe(120);
    for (let day = 1; day <= 30; day++) {
      expect(data.tasks.filter((task) => task.day === day)).toHaveLength(4);
      expect(data.milestones[day - 1].day).toBe(day);
      expect(data.milestones[day - 1].deliverable.length).toBeGreaterThan(40);
    }
    expect(
      data.tasks.every(
        (task) =>
          task.status === "Not Started" &&
          task.actual === 0 &&
          task.completedAt === null,
      ),
    ).toBe(true);
    expect(data.reviews).toEqual({});
    expect(data.captures).toEqual([]);
    expect(data.focusSessions).toEqual([]);
    expect(parseBackup(JSON.stringify(data))).toEqual(data);
  });

  it("keeps task, project, and deliverable progress distinct", () => {
    const data = example();
    const first = data.tasks[0];
    const websiteTask = data.tasks.find((task) => task.project === "Website")!;
    first.status = "Completed";
    websiteTask.status = "Completed";
    expect(taskProgress(data.tasks.filter((task) => task.day === 1))).toBe(50);
    expect(projectProgress(data, "Website")).toBe(
      Math.round(
        100 / data.tasks.filter((task) => task.project === "Website").length,
      ),
    );
    expect(overallProgress(data)).toBe(0);
    data.milestones[0].status = "Completed";
    expect(overallProgress(data)).toBe(3);
    expect(percent(0, 0)).toBe(0);
    expect(taskProgress([])).toBe(0);
  });

  it("never completes a task or milestone because its date passed", () => {
    const data = example();
    expect(getHealth(data, "2026-04-01").label).toBe("Behind Schedule");
    expect(overallProgress(data)).toBe(0);
    expect(taskProgress(data.tasks)).toBe(0);
  });
});

describe("transparent health rules", () => {
  it("distinguishes a future start, an on-time day, and overdue deliverables", () => {
    const data = example();
    expect(getHealth(data, "2026-02-28").label).toBe("Not started");
    expect(getHealth(data, "2026-03-01").label).toBe("On Track");
    expect(getHealth(data, "2026-03-02")).toMatchObject({
      label: "Behind Schedule",
      reason: expect.stringContaining("1 unfinished deliverable"),
    });
  });

  it("flags blocked work and overdue tasks even without a missed milestone", () => {
    const data = example();
    data.tasks[0].status = "Blocked";
    expect(getHealth(data, "2026-03-01").label).toBe("At Risk");
    data.tasks[0].status = "Not Started";
    data.tasks[0].deadline = "2026-02-28";
    expect(getHealth(data, "2026-03-01").label).toBe("At Risk");
    data.tasks[0].status = "Completed";
    expect(getHealth(data, "2026-03-01").label).toBe("On Track");
  });

  it("requires all 30 manually completed milestones for completed health", () => {
    const data = example();
    data.milestones.forEach((milestone) => {
      milestone.status = "Completed";
    });
    expect(getHealth(data, "2026-04-01").label).toBe("Completed");
    data.milestones.pop();
    expect(getHealth(data, "2026-04-01").label).not.toBe("Completed");
  });
});

describe("state transitions", () => {
  it("rejects invalid mutations before exposing any changed project data", () => {
    const data = example();
    const original = JSON.stringify(data);
    expect(() =>
      validatedMutation(data, (current) => ({
        ...current,
        settings: { ...current.settings, focusMinutes: 0 },
      })),
    ).toThrow("settings.focusMinutes");
    expect(JSON.stringify(data)).toBe(original);
    expect(() =>
      validatedMutation(data, (current) =>
        updateTaskData(current, current.tasks[0].id, { estimate: 100_000 }),
      ),
    ).toThrow("estimate");
    expect(JSON.stringify(data)).toBe(original);
  });

  it("commits an isolated validated snapshot without sharing editable input objects", () => {
    const data = example();
    const accepted = validatedMutation(data, (current) =>
      updateTaskData(current, current.tasks[0].id, {
        notes: "Verified output",
      }),
    );
    accepted.tasks[1].notes = "Later edit";
    expect(data.tasks[0].notes).toBe("");
    expect(data.tasks[1].notes).toBe("");
    expect(accepted.tasks[0].notes).toBe("Verified output");
  });

  it("adds only actual focus time to a connected task without changing completion", () => {
    const data = updateTaskData(
      example(),
      "day-1-task-1",
      { status: "Completed", actual: 10 },
      "2026-03-01T10:00:00.000Z",
    );
    const accepted = validatedMutation(data, (current) =>
      addFocusData(current, {
        date: "2026-03-01",
        minutes: 0.05,
        taskId: "day-1-task-1",
      }),
    );
    expect(accepted.focusSessions).toHaveLength(1);
    expect(accepted.focusSessions[0].minutes).toBe(0.05);
    expect(accepted.tasks[0].actual).toBe(10.05);
    expect(accepted.tasks[0].status).toBe("Completed");
    expect(accepted.tasks[0].completedAt).toBe("2026-03-01T10:00:00.000Z");
    expect(accepted.milestones[0].status).toBe("Not Started");
    expect(data.tasks[0].actual).toBe(10);
    const unconnected = validatedMutation(accepted, (current) =>
      addFocusData(current, {
        date: "2026-03-01",
        minutes: 12.5,
        taskId: null,
      }),
    );
    expect(unconnected.tasks).toEqual(accepted.tasks);
    expect(unconnected.focusSessions).toHaveLength(2);
  });

  it("records task completion only on transition and clears it when reopened", () => {
    const data = example();
    const id = data.tasks[0].id;
    const completed = updateTaskData(
      data,
      id,
      { status: "Completed" },
      "2026-03-01T10:00:00.000Z",
    );
    expect(completed.tasks[0].completedAt).toBe("2026-03-01T10:00:00.000Z");
    const edited = updateTaskData(
      completed,
      id,
      { notes: "Verified" },
      "2026-03-01T11:00:00.000Z",
    );
    expect(edited.tasks[0].completedAt).toBe("2026-03-01T10:00:00.000Z");
    const reopened = updateTaskData(edited, id, { status: "In Progress" });
    expect(reopened.tasks[0].completedAt).toBeNull();
    expect(reopened.milestones[0].status).toBe("Not Started");
  });

  it("reschedules custom dates while preserving completion and recorded history", () => {
    const data = updateTaskData(
      example(),
      "day-1-task-1",
      { status: "Completed" },
      "2026-03-01T10:00:00.000Z",
    );
    data.milestones[0].dueDate = "2026-03-03";
    data.tasks[1].deadline = "";
    data.reviews["2026-03-01"] = {
      date: "2026-03-01",
      answers: Array(8).fill(""),
      updatedAt: "2026-03-01T19:00:00.000Z",
    };
    data.focusSessions.push({
      id: "session",
      date: "2026-03-01",
      minutes: 12.5,
      taskId: data.tasks[0].id,
    });
    const shifted = rescheduleData(data, "2026-03-05");
    expect(shifted.milestones[0].startDate).toBe("2026-03-05");
    expect(shifted.milestones[0].dueDate).toBe("2026-03-07");
    expect(shifted.tasks[0].deadline).toBe("2026-03-05");
    expect(shifted.tasks[1].deadline).toBe("");
    expect(shifted.tasks[0].completedAt).toBe("2026-03-01T10:00:00.000Z");
    expect(shifted.tasks[0].status).toBe("Completed");
    expect(shifted.reviews).toEqual(data.reviews);
    expect(shifted.focusSessions).toEqual(data.focusSessions);
    expect(parseBackup(JSON.stringify(shifted))).toEqual(shifted);
  });

  it("reorders only within the same day and visible project group", () => {
    const data = example();
    data.tasks[2].project = data.tasks[0].project;
    const moved = moveTaskData(data, data.tasks[0].id, 1);
    const group = moved.tasks
      .filter(
        (task) => task.day === 1 && task.project === data.tasks[0].project,
      )
      .sort((a, b) => a.order - b.order);
    expect(group.map((task) => task.id)).toEqual([
      data.tasks[2].id,
      data.tasks[0].id,
    ]);
    expect(moved.tasks[1]).toEqual(data.tasks[1]);
    expect(moved.tasks.find((task) => task.day === 2)).toEqual(
      data.tasks.find((task) => task.day === 2),
    );
    expect(moveTaskData(data, data.tasks[1].id, -1)).toBe(data);
  });
});

describe("backup validation and persistence safeguards", () => {
  it.each([
    [
      "unsupported future version",
      (data: StudioData) => ({ ...data, version: 2 }),
    ],
    [
      "missing version",
      (data: StudioData) => ({ ...data, version: undefined }),
    ],
    [
      "invalid date",
      (data: StudioData) => ({
        ...data,
        settings: { ...data.settings, startDate: "2026-02-30" },
      }),
    ],
    [
      "wrong enum",
      (data: StudioData) => ({
        ...data,
        tasks: [{ ...data.tasks[0], status: "Done" }],
      }),
    ],
    [
      "out-of-bounds day",
      (data: StudioData) => ({
        ...data,
        tasks: [{ ...data.tasks[0], day: 31 }],
      }),
    ],
    [
      "negative duration",
      (data: StudioData) => ({
        ...data,
        tasks: [{ ...data.tasks[0], actual: -1 }],
      }),
    ],
    [
      "duplicate task ID",
      (data: StudioData) => ({
        ...data,
        tasks: [data.tasks[0], data.tasks[0]],
      }),
    ],
    [
      "missing roadmap day",
      (data: StudioData) => ({ ...data, milestones: data.milestones.slice(1) }),
    ],
    [
      "duplicate milestone day",
      (data: StudioData) => ({
        ...data,
        milestones: data.milestones.map(() => data.milestones[0]),
      }),
    ],
    [
      "contradictory completion history",
      (data: StudioData) => ({
        ...data,
        tasks: [{ ...data.tasks[0], status: "Completed", completedAt: null }],
      }),
    ],
    [
      "unknown field",
      (data: StudioData) => ({
        ...data,
        cloudPassword: "must never be persisted",
      }),
    ],
    [
      "invalid nested review",
      (data: StudioData) => ({
        ...data,
        reviews: {
          "2026-03-01": {
            date: "2026-03-02",
            answers: [],
            updatedAt: "invalid",
          },
        },
      }),
    ],
    [
      "invalid capture",
      (data: StudioData) => ({
        ...data,
        captures: [
          {
            id: "capture",
            category: "Unknown",
            title: "Idea",
            content: "",
            tags: "",
            createdAt: "yesterday",
            updatedAt: "today",
          },
        ],
      }),
    ],
    [
      "invalid focus duration",
      (data: StudioData) => ({
        ...data,
        focusSessions: [
          { id: "session", date: "2026-03-01", minutes: 181, taskId: null },
        ],
      }),
    ],
  ])("rejects %s before replacing user data", (_name, corrupt) => {
    expect(() => parseBackup(JSON.stringify(corrupt(example())))).toThrow();
  });

  it("accepts fractional recorded focus time and complete reviews", () => {
    const data = example();
    data.focusSessions = [
      { id: "one", date: "2026-03-01", minutes: 0.05, taskId: null },
    ];
    data.reviews["2026-03-01"] = {
      date: "2026-03-01",
      answers: Array(8).fill(""),
      updatedAt: "2026-03-01T18:00:00.000Z",
    };
    expect(parseBackup(JSON.stringify(data))).toEqual(data);
  });

  it("rejects invalid JSON and excessively large input", () => {
    expect(() => parseBackup("{broken")).toThrow("valid JSON");
    expect(() => parseBackup(" ".repeat(5_000_001))).toThrow("too large");
  });

  it("preserves corrupt or future-version storage and locks automatic replacement", () => {
    const original = '{"version":42,"futureData":"keep this"}';
    const setItem = vi.fn();
    vi.stubGlobal("window", {
      localStorage: { getItem: () => original, setItem },
    });
    const loaded = loadData();
    expect(loaded.locked).toBe(true);
    expect(loaded.warning).toContain("original is preserved");
    expect(
      loaded.data.tasks.every((task) => task.status === "Not Started"),
    ).toBe(true);
    expect(setItem).not.toHaveBeenCalled();
  });

  it("round trips saved state through the same export schema", () => {
    const values = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
      },
    });
    const data = updateTaskData(example(), "day-1-task-1", {
      status: "Completed",
    });
    expect(saveData(data)).toBeNull();
    expect(values.has(STORAGE_KEY)).toBe(true);
    expect(loadData()).toEqual({ data, locked: false, warning: null });
  });

  it("reports read and quota failures and never writes invalid state", () => {
    const setItem = vi.fn(() => {
      throw new Error("Quota exceeded");
    });
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("Blocked");
        },
        setItem,
      },
    });
    expect(loadData().locked).toBe(true);
    expect(saveData(example())).toContain("Quota exceeded");
    const invalid = example();
    invalid.settings.focusMinutes = 0;
    setItem.mockClear();
    expect(saveData(invalid)).toContain("could not be saved");
    expect(setItem).not.toHaveBeenCalled();
  });
});
