import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFile } from "node:fs/promises";
import type { StudioData } from "../src/types";

const storageKey = "irham-studio-v1";
const navigation = [
  { name: "Dashboard", heading: /Good (morning|afternoon|evening), Irham/ },
  { name: "30-Day Roadmap", heading: "30 days. Two things to be proud of." },
  { name: "Daily Missions", heading: "Make today meaningful." },
  { name: "IRHAM Math Lab", heading: "IRHAM MATH LAB" },
  { name: "Algebra Workbook", heading: "The Algebra Workbook" },
  { name: "Notes & Resources", heading: "Notes & captures" },
  { name: "Settings & Data", heading: "Studio settings" },
];

// Playwright's page fixture creates a separate browser context and empty storage
// for each test. Reload checks below use the app's real localStorage persistence.
async function stored(page: Page): Promise<StudioData> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    storageKey,
  );
}

function navigationLink(page: Page, name: string) {
  return page
    .getByRole("navigation")
    .getByRole(
      "link",
      name === "Daily Missions"
        ? { name: /^Daily Missions(?: \d+)?$/ }
        : { name, exact: true },
    );
}

async function navigate(page: Page, name: string) {
  await navigationLink(page, name).click();
}

async function noHorizontalOverflow(page: Page) {
  expect(
    await page.evaluate(() => ({
      width: innerWidth,
      scroll: document.documentElement.scrollWidth,
    })),
  ).toEqual({ width: 390, scroll: 390 });
}

function shiftDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

test("desktop navigation renders every Stage 1 workspace without runtime errors", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  await page.goto("/");
  for (const entry of navigation) {
    await navigate(page, entry.name);
    await expect(
      page.getByRole("heading", { name: entry.heading, level: 1 }),
    ).toBeVisible();
    await expect(navigationLink(page, entry.name)).toHaveAttribute(
      "aria-current",
      "page",
    );
  }
  await expect(
    page.getByText("Stored on this browser · No cloud sync"),
  ).toBeVisible();
  expect(failures).toEqual([]);
});

test("desktop and mobile workspaces and editing dialogs pass automated WCAG checks", async ({
  page,
}) => {
  test.setTimeout(120_000);
  await page.emulateMedia({ reducedMotion: "reduce" });

  async function audit(label: string) {
    await test.step(label, async () => {
      await page.evaluate(() => document.fonts.ready);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect
        .soft(
          result.violations.map((violation) => ({
            rule: violation.id,
            targets: violation.nodes.map((node) => node.target),
            reason: violation.nodes[0]?.failureSummary,
          })),
          label,
        )
        .toEqual([]);
    });
  }

  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.goto("/");
    for (const entry of navigation) {
      if (width === 390) {
        await page
          .getByRole("button", { name: "Open navigation", exact: true })
          .click();
      }
      await navigate(page, entry.name);
      await expect(
        page.getByRole("heading", { name: entry.heading, level: 1 }),
      ).toBeVisible();
      await audit(`${width}px · ${entry.name}`);
    }

    if (width === 390) {
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await audit("390px · open navigation");
    }
    await navigate(page, "Daily Missions");
    await page.getByRole("button", { name: "Add a task", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Add a daily mission", exact: true }),
    ).toBeVisible();
    await audit(`${width}px · task editor dialog`);
    await page.keyboard.press("Escape");

    if (width === 390) {
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
    }
    await navigate(page, "30-Day Roadmap");
    await page.getByRole("button", { name: /^Day 1:/ }).click();
    await expect(
      page.getByRole("dialog", {
        name: "Day 1 · Milestone details",
        exact: true,
      }),
    ).toBeVisible();
    await audit(`${width}px · milestone editor dialog`);
    await page.keyboard.press("Escape");
  }
});

test("all 30 milestones exist and deliverable acceptance stays separate from completed tasks", async ({
  page,
}) => {
  await page.goto("/#roadmap");
  await expect(
    page.getByRole("button", { name: /^Day \d+:.*Open milestone$/ }),
  ).toHaveCount(30);
  for (let day = 1; day <= 30; day++) {
    await expect(
      page.getByRole("button", {
        name: new RegExp(`^Day ${day}: .+\\. Not Started\\. Open milestone$`),
      }),
    ).toHaveCount(1);
  }
  await page.getByRole("button", { name: /^Day 1:/ }).click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByRole("textbox", { name: "Deliverable", exact: true }),
  ).not.toHaveValue("");
  await expect(dialog.getByLabel("Acceptance criteria")).not.toHaveValue("");
  const taskChecks = dialog.locator('.milestone-task input[type="checkbox"]');
  expect(await taskChecks.count()).toBeGreaterThan(0);
  for (const checkbox of await taskChecks.all()) await checkbox.check();
  await dialog.getByRole("button", { name: "Save milestone" }).click();
  await expect(
    page.getByRole("button", { name: /^Day 1:.*Not Started/ }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      (await stored(page)).tasks
        .filter((task) => task.day === 1)
        .every((task) => task.status === "Completed"),
    )
    .toBe(true);
  expect(
    (await stored(page)).milestones.find((item) => item.day === 1)?.status,
  ).toBe("Not Started");

  await page.getByRole("button", { name: /^Day 1:/ }).click();
  await dialog.getByLabel("Deliverable status").selectOption("Completed");
  await dialog.getByRole("button", { name: "Save milestone" }).click();
  await expect(dialog).toBeVisible();
  expect(
    (await stored(page)).milestones.find((item) => item.day === 1)?.status,
  ).toBe("Not Started");
  await dialog
    .getByRole("checkbox", {
      name: /I have personally checked this deliverable/,
    })
    .check();
  await dialog.getByRole("button", { name: "Save milestone" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: /^Day 1:.*Completed/ }),
  ).toBeVisible();
  expect(
    (await stored(page)).milestones.filter(
      (item) => item.status === "Completed",
    ),
  ).toHaveLength(1);
});

test("tasks can be added, edited, prioritized, reordered, completed and deleted durably", async ({
  page,
}) => {
  await page.goto("/#missions?day=1");
  const dialog = page.getByRole("dialog");
  for (const title of [
    "Check release notes",
    "Prepare verification evidence",
  ]) {
    await page.getByRole("button", { name: "Add a task", exact: true }).click();
    await dialog.getByLabel("Task title", { exact: true }).fill(title);
    await dialog
      .getByRole("combobox", { name: "Project", exact: true })
      .selectOption("Website");
    await dialog.getByRole("button", { name: "Add task", exact: true }).click();
  }
  await page
    .getByRole("button", { name: "Edit Check release notes", exact: true })
    .click();
  await dialog
    .getByLabel("Task title", { exact: true })
    .fill("Review release notes carefully");
  await dialog
    .getByRole("combobox", { name: "Priority", exact: true })
    .selectOption("High");
  await dialog.getByLabel("Estimated minutes").fill("45");
  await dialog.getByLabel("Actual minutes").fill("12");
  await dialog
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("Confirm every user-facing statement.");
  await dialog.getByRole("button", { name: "Save task", exact: true }).click();
  await page
    .getByRole("button", {
      name: "Move Prepare verification evidence up",
      exact: true,
    })
    .click();
  await page
    .getByRole("checkbox", {
      name: "Mark Review release notes carefully complete",
      exact: true,
    })
    .check();
  await page.reload();

  let data = await stored(page);
  const edited = data.tasks.find(
    (task) => task.title === "Review release notes carefully",
  )!;
  const moved = data.tasks.find(
    (task) => task.title === "Prepare verification evidence",
  )!;
  expect(edited).toMatchObject({
    priority: "High",
    estimate: 45,
    actual: 12,
    notes: "Confirm every user-facing statement.",
    status: "Completed",
  });
  expect(edited.completedAt).toEqual(expect.any(String));
  expect(moved.order).toBeLessThan(edited.order);
  await expect(
    page.getByRole("checkbox", {
      name: "Mark Review release notes carefully incomplete",
      exact: true,
    }),
  ).toBeChecked();
  const visibleOrder = await page
    .locator(".project-website .task-title-button")
    .allTextContents();
  expect(visibleOrder.indexOf(moved.title)).toBeLessThan(
    visibleOrder.indexOf(edited.title),
  );

  await page
    .getByRole("checkbox", {
      name: "Mark Review release notes carefully incomplete",
      exact: true,
    })
    .uncheck();
  await expect
    .poll(
      async () =>
        (await stored(page)).tasks.find((task) => task.id === edited.id)
          ?.completedAt,
    )
    .toBeNull();
  await page
    .getByRole("button", {
      name: "Edit Review release notes carefully",
      exact: true,
    })
    .click();
  page.once("dialog", (confirmation) => confirmation.dismiss());
  await dialog
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await expect(dialog).toBeVisible();
  page.once("dialog", (confirmation) => confirmation.accept());
  await dialog
    .getByRole("button", { name: "Delete task", exact: true })
    .click();
  await page.reload();
  data = await stored(page);
  expect(data.tasks.some((task) => task.id === edited.id)).toBe(false);
  expect(data.tasks.some((task) => task.id === moved.id)).toBe(true);
});

test("all eight daily review answers persist against their calendar date", async ({
  page,
}) => {
  await page.goto("/#missions?day=1");
  const questions = [
    "What did I actually complete?",
    "What did I learn?",
    "What problems remain?",
    "What did I ask AI to do?",
    "What output did AI produce?",
    "What did I personally verify?",
    "What should I do tomorrow?",
    "What should I avoid tomorrow?",
  ];
  const answers = questions.map(
    (_, index) => `Recorded evidence for question ${index + 1}.`,
  );
  for (let index = 0; index < questions.length; index++)
    await page
      .getByLabel(questions[index], { exact: false })
      .fill(answers[index]);
  await page.getByRole("button", { name: "Save daily review" }).click();
  await expect(
    page.getByText("Review saved for this date.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Project day", exact: true })
    .selectOption("2");
  for (const question of questions)
    await expect(page.getByLabel(question, { exact: false })).toHaveValue("");
  await page
    .getByRole("combobox", { name: "Project day", exact: true })
    .selectOption("1");
  await page.reload();
  for (let index = 0; index < questions.length; index++)
    await expect(
      page.getByLabel(questions[index], { exact: false }),
    ).toHaveValue(answers[index]);
  const data = await stored(page);
  expect(Object.keys(data.reviews)).toEqual([data.settings.startDate]);
  expect(data.reviews[data.settings.startDate]).toMatchObject({
    date: data.settings.startDate,
    answers,
  });
});

test("daily review drafts autosave and stay on the correct date during navigation", async ({
  page,
}) => {
  await page.goto("/#missions?day=1");
  const firstDate = (await stored(page)).settings.startDate;
  await page
    .getByLabel("What did I learn?", { exact: false })
    .fill("A review should survive a normal pause.");
  await expect
    .poll(async () => (await stored(page)).reviews[firstDate]?.answers[1])
    .toBe("A review should survive a normal pause.");
  await page.reload();
  await expect(
    page.getByLabel("What did I learn?", { exact: false }),
  ).toHaveValue("A review should survive a normal pause.");

  await page
    .getByLabel("What problems remain?", { exact: false })
    .fill("Keep this answer on the first date.");
  await page
    .getByRole("combobox", { name: "Project day", exact: true })
    .selectOption("2");
  await expect(
    page.getByLabel("What problems remain?", { exact: false }),
  ).toHaveValue("");
  await expect
    .poll(async () => (await stored(page)).reviews[firstDate]?.answers[2])
    .toBe("Keep this answer on the first date.");
  await page
    .getByLabel("What should I do tomorrow?", { exact: false })
    .fill("Verify the second date before moving on.");
  await navigate(page, "Dashboard");
  const secondDate = shiftDate(firstDate, 1);
  await expect
    .poll(async () => (await stored(page)).reviews[secondDate]?.answers[6])
    .toBe("Verify the second date before moving on.");
  await page.goto("/#missions?day=2");
  await expect(
    page.getByLabel("What should I do tomorrow?", { exact: false }),
  ).toHaveValue("Verify the second date before moving on.");
  const data = await stored(page);
  expect(data.reviews[firstDate].answers[6]).toBe("");
  expect(data.reviews[secondDate].answers[1]).toBe("");
});

test("changing the start date shifts the schedule while preserving completion and historical reviews", async ({
  page,
}) => {
  await page.goto("/#missions?day=1");
  await page
    .getByRole("checkbox", { name: /^Mark .* complete$/ })
    .first()
    .check();
  await page
    .getByLabel("What did I actually complete?", { exact: false })
    .fill("Verified a first task.");
  await page.getByRole("button", { name: "Save daily review" }).click();
  const before = await stored(page);
  await navigate(page, "Settings & Data");
  await page
    .getByLabel("Project start date")
    .fill(shiftDate(before.settings.startDate, 7));
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText("Settings saved.");
  await page.reload();
  const after = await stored(page);
  expect(after.settings.startDate).toBe(
    shiftDate(before.settings.startDate, 7),
  );
  for (const task of before.tasks) {
    const result = after.tasks.find((item) => item.id === task.id)!;
    expect(result.deadline).toBe(
      task.deadline ? shiftDate(task.deadline, 7) : "",
    );
    expect(result.status).toBe(task.status);
    expect(result.completedAt).toBe(task.completedAt);
  }
  for (const milestone of before.milestones) {
    const result = after.milestones.find((item) => item.day === milestone.day)!;
    expect(result.startDate).toBe(shiftDate(milestone.startDate, 7));
    expect(result.dueDate).toBe(shiftDate(milestone.dueDate, 7));
  }
  expect(after.reviews).toEqual(before.reviews);
  await navigate(page, "Daily Missions");
  await page.getByLabel("Review date").selectOption(before.settings.startDate);
  await expect(
    page.getByLabel("What did I actually complete?", { exact: false }),
  ).toHaveValue("Verified a first task.");
  await expect(
    page.getByRole("combobox", { name: "Project day", exact: true }),
  ).toHaveValue("1");
});

test("JSON backup download restores only after confirmation and rejects corrupt data safely", async ({
  page,
}, testInfo) => {
  await page.goto("/#settings");
  await page.getByLabel("Your name", { exact: true }).fill("Before backup");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export JSON backup", exact: true })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(
    /^irham-studio-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
  const backupPath = testInfo.outputPath("downloaded-backup.json");
  await download.saveAs(backupPath);
  const backup = JSON.parse(await readFile(backupPath, "utf8")) as StudioData;
  expect(backup.settings.name).toBe("Before backup");
  expect(backup.milestones).toHaveLength(30);

  await page.getByLabel("Your name", { exact: true }).fill("After backup");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  const fileInput = page.getByLabel("Choose a Studio JSON backup");
  await fileInput.setInputFiles(backupPath);
  await expect(
    page.getByRole("heading", { name: "Review your backup", exact: true }),
  ).toBeVisible();
  expect((await stored(page)).settings.name).toBe("After backup");
  page.once("dialog", (confirmation) => confirmation.dismiss());
  await page
    .getByRole("button", { name: "Replace with this backup", exact: true })
    .click();
  expect((await stored(page)).settings.name).toBe("After backup");
  page.once("dialog", (confirmation) => confirmation.accept());
  await page
    .getByRole("button", { name: "Replace with this backup", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Backup imported successfully.",
  );
  await page.reload();
  expect(await stored(page)).toEqual(backup);

  for (const content of [
    "{ invalid JSON",
    JSON.stringify({ ...backup, version: 999 }),
    JSON.stringify({ ...backup, milestones: backup.milestones.slice(1) }),
  ]) {
    await fileInput.setInputFiles({
      name: "corrupt-backup.json",
      mimeType: "application/json",
      buffer: Buffer.from(content),
    });
    await expect(page.getByRole("alert")).toContainText("Import rejected:");
    await expect(page.getByRole("alert")).toContainText(
      "Your current data has been preserved.",
    );
    expect(await stored(page)).toEqual(backup);
    await expect(
      page.getByRole("button", {
        name: "Replace with this backup",
        exact: true,
      }),
    ).toHaveCount(0);
  }
});

test("reset requires the exact typed confirmation and restores the original plan", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("checkbox", { name: /^Complete / })
    .first()
    .check();
  await navigate(page, "Settings & Data");
  await page
    .getByLabel("Your name", { exact: true })
    .fill("A changed workspace");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reset Studio…", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Reset your Studio?" });
  const reset = dialog.getByRole("button", {
    name: "Reset all Studio data",
    exact: true,
  });
  await expect(reset).toBeDisabled();
  await dialog.getByLabel("Type RESET to confirm").fill("reset");
  await expect(reset).toBeDisabled();
  await dialog.getByLabel("Type RESET to confirm").fill("RESET");
  await expect(reset).toBeEnabled();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  expect((await stored(page)).settings.name).toBe("A changed workspace");
  await page
    .getByRole("button", { name: "Reset Studio…", exact: true })
    .click();
  await expect(dialog.getByLabel("Type RESET to confirm")).toHaveValue("");
  await dialog.getByLabel("Type RESET to confirm").fill("RESET");
  await reset.click();
  await expect(page.getByRole("status")).toContainText(
    "Studio reset to the original 30-day plan.",
  );
  await page.reload();
  const data = await stored(page);
  expect(data.settings.name).toBe("Irham");
  expect(data.milestones).toHaveLength(30);
  expect(
    data.tasks.every(
      (task) =>
        task.status === "Not Started" &&
        task.actual === 0 &&
        task.completedAt === null,
    ),
  ).toBe(true);
  expect(data.captures).toEqual([]);
  expect(data.reviews).toEqual({});
  expect(data.focusSessions).toEqual([]);
});

test("unreadable stored data stays protected, can be downloaded unchanged and recovered by import", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  const backup = await stored(page);
  const original = '{"version":999,"precious":"previous browser records"}';
  await page.evaluate(({ key, source }) => localStorage.setItem(key, source), {
    key: storageKey,
    source: original,
  });
  await page.reload();
  await expect(page.getByRole("alert")).toContainText(
    "Your previous data is protected.",
  );
  await expect(
    page.getByRole("heading", {
      name: "Let’s recover your workspace first.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Quick capture", exact: true }),
  ).toHaveCount(0);
  await navigate(page, "Daily Missions");
  await expect(
    page.getByRole("heading", {
      name: "Let’s recover your workspace first.",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Add a task", exact: true }),
  ).toHaveCount(0);
  await navigate(page, "Settings & Data");
  await expect(
    page.getByText(
      "Editing is paused. Your original data has been preserved.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.getByLabel("Your name", { exact: true })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Save settings", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Export JSON backup", exact: true }),
  ).toBeDisabled();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download original stored data", exact: true })
    .click();
  const download = await downloadPromise;
  const recoveryPath = testInfo.outputPath("original-recovery.json");
  await download.saveAs(recoveryPath);
  expect(await readFile(recoveryPath, "utf8")).toBe(original);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe(original);
  await page.reload();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), storageKey),
  ).toBe(original);
  await page.getByLabel("Choose a Studio JSON backup").setInputFiles({
    name: "valid-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByRole("heading", { name: "Review your backup", exact: true }),
  ).toBeVisible();
  page.once("dialog", (confirmation) => confirmation.accept());
  await page
    .getByRole("button", { name: "Replace with this backup", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Backup imported successfully.",
  );
  await expect(page.getByLabel("Your name", { exact: true })).toBeEnabled();
  await page.reload();
  expect(await stored(page)).toEqual(backup);
  await navigate(page, "Daily Missions");
  await expect(
    page.getByRole("button", { name: "Add a task", exact: true }),
  ).toBeVisible();
});

test("two open tabs share progress without losing changes and protect malformed external data", async ({
  page,
  context,
}) => {
  await page.goto("/");
  const initial = await stored(page);
  const [first, second] = initial.tasks.filter((task) => task.day === 1);
  const otherTab = await context.newPage();
  await otherTab.goto("/");
  await page
    .getByRole("checkbox", { name: `Complete ${first.title}`, exact: true })
    .check();
  await expect(
    otherTab.getByRole("checkbox", {
      name: `Complete ${first.title}`,
      exact: true,
    }),
  ).toBeChecked();
  await otherTab
    .getByRole("checkbox", { name: `Complete ${second.title}`, exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", {
      name: `Complete ${second.title}`,
      exact: true,
    }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", {
      name: `Complete ${first.title}`,
      exact: true,
    }),
  ).toBeChecked();
  const combined = await stored(page);
  expect(combined.tasks.find((task) => task.id === first.id)?.status).toBe(
    "Completed",
  );
  expect(combined.tasks.find((task) => task.id === second.id)?.status).toBe(
    "Completed",
  );
  await page.reload();
  await otherTab.reload();
  for (const tab of [page, otherTab]) {
    await expect(
      tab.getByRole("checkbox", {
        name: `Complete ${first.title}`,
        exact: true,
      }),
    ).toBeChecked();
    await expect(
      tab.getByRole("checkbox", {
        name: `Complete ${second.title}`,
        exact: true,
      }),
    ).toBeChecked();
  }

  const externalWriter = await context.newPage();
  await externalWriter.goto("/");
  const malformed = '{"version":';
  await externalWriter.evaluate(
    ({ key, source }) => localStorage.setItem(key, source),
    { key: storageKey, source: malformed },
  );
  for (const tab of [page, otherTab]) {
    await expect(
      tab.getByRole("heading", {
        name: "Let’s recover your workspace first.",
        exact: true,
      }),
    ).toBeVisible();
    await expect(tab.getByRole("checkbox", { name: /^Complete / })).toHaveCount(
      0,
    );
    expect(
      await tab.evaluate((key) => localStorage.getItem(key), storageKey),
    ).toBe(malformed);
  }
});

test("focus timer starts, pauses and saves actual elapsed time across reload", async ({
  page,
}) => {
  await page.goto("/");
  const task = (await stored(page)).tasks[0];
  await navigate(page, "Settings & Data");
  await page.getByLabel("Default focus duration (minutes)").fill("15");
  await page
    .getByRole("button", { name: "Save settings", exact: true })
    .click();
  await navigate(page, "Dashboard");
  await page
    .getByRole("button", { name: "Start focus session", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "One thing at a time." });
  await expect(dialog.getByRole("timer")).toHaveText("15:00");
  await dialog.getByLabel(/Connect to a task/).selectOption(task.id);
  await dialog
    .getByRole("button", { name: "Start focus", exact: true })
    .click();
  await expect(dialog.getByRole("timer")).not.toHaveText("15:00", {
    timeout: 2_000,
  });
  await dialog.getByRole("button", { name: "Pause", exact: true }).click();
  const pausedTime = await dialog.getByRole("timer").textContent();
  await page.waitForTimeout(600);
  await expect(dialog.getByRole("timer")).toHaveText(pausedTime!);
  await expect(
    dialog.getByRole("button", { name: "Resume focus", exact: true }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "End & save", exact: true }).click();
  await expect(
    dialog.getByText("Your actual focus time is saved. Take a breath.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  const sessions = (await stored(page)).focusSessions;
  expect(sessions).toHaveLength(1);
  expect(sessions[0].taskId).toBe(task.id);
  expect(sessions[0].minutes).toBeGreaterThan(0);
  expect(sessions[0].minutes).toBeLessThan(0.1);
  expect(
    (await stored(page)).tasks.find((item) => item.id === task.id)?.actual,
  ).toBe(sessions[0].minutes);
  await navigate(page, "Daily Missions");
  await page
    .getByRole("button", { name: `Edit ${task.title}`, exact: true })
    .click();
  const editor = page.getByRole("dialog", { name: "A clearer next step" });
  await editor
    .getByRole("textbox", { name: "Notes", exact: true })
    .fill("Verified after a short recorded focus session.");
  await editor.getByRole("button", { name: "Save task", exact: true }).click();
  await expect(editor).toHaveCount(0);
  await page.reload();
  expect(
    (await stored(page)).tasks.find((item) => item.id === task.id),
  ).toMatchObject({
    actual: sessions[0].minutes,
    notes: "Verified after a short recorded focus session.",
  });
});

test("quick capture, capture editing, category and text search, and deletion persist", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Quick capture", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("What are you capturing?")
    .selectOption("Mathematical idea");
  await dialog
    .getByLabel("Title", { exact: true })
    .fill("Explore quadratic patterns");
  await dialog
    .getByLabel(/A little more detail/)
    .fill("Compare first and second differences using visible examples.");
  await dialog
    .getByRole("button", { name: "Save thought", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Back to work", exact: true })
    .click();
  await navigate(page, "Notes & Resources");
  await expect(
    page.getByRole("heading", {
      name: "Explore quadratic patterns",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Edit Explore quadratic patterns",
      exact: true,
    })
    .click();
  dialog = page.getByRole("dialog", { name: "Edit capture", exact: true });
  await dialog
    .getByLabel("Title", { exact: true })
    .fill("Choose a quadratic visualization");
  await dialog
    .getByRole("combobox", { name: "Category", exact: true })
    .selectOption("Decision");
  await dialog.getByLabel(/^Tags/).fill("algebra, verified");
  await dialog
    .getByRole("textbox", { name: "Decision & reasoning", exact: true })
    .fill("Use interactive differences because learners can verify each step.");
  await dialog
    .getByRole("button", { name: "Save changes", exact: true })
    .click();
  await page.reload();
  await page.getByLabel("Search captures", { exact: true }).fill("verified");
  await expect(
    page.getByRole("heading", {
      name: "Choose a quadratic visualization",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByLabel("Filter capture category").selectOption("Bug");
  await expect(
    page.getByRole("heading", { name: "No matching captures", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Filter capture category").selectOption("Decision");
  await page.getByLabel("Search captures", { exact: true }).fill("unfindable");
  await expect(
    page.getByRole("heading", { name: "No matching captures", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Search captures", { exact: true }).fill("quadratic");
  await page.getByRole("button", { name: /Search your studio/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("searchbox", { name: "Search your studio", exact: true })
    .fill("Choose a quadratic");
  await page
    .getByRole("button", { name: /Choose a quadratic visualization Notes/ })
    .click();
  const before = (await stored(page)).captures[0];
  expect(before).toMatchObject({
    category: "Decision",
    tags: "algebra, verified",
    title: "Choose a quadratic visualization",
  });
  expect(before.createdAt).toEqual(expect.any(String));
  expect(before.updatedAt).toEqual(expect.any(String));
  page.once("dialog", (confirmation) => confirmation.accept());
  await page
    .getByRole("button", {
      name: "Delete Choose a quadratic visualization",
      exact: true,
    })
    .click();
  await page.reload();
  expect((await stored(page)).captures).toEqual([]);
  await expect(
    page.getByRole("heading", {
      name: "Choose a quadratic visualization",
      exact: true,
    }),
  ).toHaveCount(0);
});

test("390px mobile navigation exposes every workspace and pages and dialogs fit the viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  for (const entry of navigation) {
    await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .click();
    for (const item of navigation)
      await expect(navigationLink(page, item.name)).toBeVisible();
    await navigate(page, entry.name);
    await expect(
      page.getByRole("heading", { name: entry.heading, level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Open navigation", exact: true }),
    ).toHaveAttribute("aria-expanded", "false");
    await noHorizontalOverflow(page);
  }
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await navigate(page, "Daily Missions");
  await page.getByRole("button", { name: "Add a task", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await noHorizontalOverflow(page);
  await expect(dialog.getByLabel("Task title", { exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add a task", exact: true }),
  ).toBeFocused();
});
