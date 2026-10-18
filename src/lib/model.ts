import type { Milestone, Project, StudioData, Task } from "../types";

/** A calendar date in the user's browser timezone, never a UTC date slice. */
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Local noon avoids midnight transitions; date arithmetic survives DST changes. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(year, month - 1, day, 12);
  result.setDate(result.getDate() + days);
  return localDate(result);
}

function calendarValue(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
}

/** Day 0 and days above 30 are intentional: the UI can describe both honestly. */
export function projectDay(startDate: string, today = localDate()): number {
  return (
    Math.round((calendarValue(today) - calendarValue(startDate)) / 86400000) + 1
  );
}

export function dayDate(data: StudioData, day: number): string {
  return (
    data.milestones.find((milestone) => milestone.day === day)?.dueDate ||
    addDays(data.settings.startDate, day - 1)
  );
}

export function percent(done: number, total: number): number {
  return total > 0
    ? Math.min(100, Math.max(0, Math.round((done / total) * 100)))
    : 0;
}

export function taskProgress(tasks: Task[]): number {
  return percent(
    tasks.filter((task) => task.status === "Completed").length,
    tasks.length,
  );
}

export function overallProgress(data: StudioData): number {
  return percent(
    data.milestones.filter((milestone) => milestone.status === "Completed")
      .length,
    30,
  );
}

export function projectProgress(data: StudioData, project: Project): number {
  return taskProgress(data.tasks.filter((task) => task.project === project));
}

export function getHealth(
  data: StudioData,
  today = localDate(),
): {
  label:
    "On Track" | "At Risk" | "Behind Schedule" | "Completed" | "Not started";
  reason: string;
} {
  const incomplete = data.milestones.filter(
    (milestone) => milestone.status !== "Completed",
  );
  const blocked =
    data.tasks.filter((task) => task.status === "Blocked").length +
    data.milestones.filter((milestone) => milestone.status === "Blocked")
      .length;
  const overdueMilestones = incomplete.filter(
    (milestone) => milestone.dueDate < today,
  ).length;
  const overdueTasks = data.tasks.filter(
    (task) =>
      task.status !== "Completed" && task.deadline && task.deadline < today,
  ).length;
  if (incomplete.length === 0 && data.milestones.length === 30) {
    return {
      label: "Completed",
      reason: "All 30 deliverables have been explicitly marked complete.",
    };
  }
  if (overdueMilestones > 0) {
    return {
      label: "Behind Schedule",
      reason: `${overdueMilestones} unfinished deliverable${overdueMilestones === 1 ? " is" : "s are"} past the recorded due date.`,
    };
  }
  if (blocked > 0 || overdueTasks > 0) {
    return {
      label: "At Risk",
      reason: `${blocked} blocked task${blocked === 1 ? "" : "s"}/deliverable${blocked === 1 ? "" : "s"} and ${overdueTasks} overdue task${overdueTasks === 1 ? "" : "s"} need attention.`,
    };
  }
  if (today < data.settings.startDate) {
    return {
      label: "Not started",
      reason: `Your 30-day schedule begins on ${data.settings.startDate}.`,
    };
  }
  return {
    label: "On Track",
    reason:
      "No unfinished deliverables or tasks are overdue, and nothing is marked blocked.",
  };
}

export function uid(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `studio-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

type PlannedTask = [Project, string, number];
type Plan = {
  title: string;
  objective: string;
  deliverable: string;
  acceptance: string;
  tasks: PlannedTask[];
};

const plan: Plan[] = [
  {
    title: "Set the foundation",
    objective:
      "Finalize product scope, architecture, workbook outline, and the honest project baseline.",
    deliverable:
      "An approved scope, architecture decision, six-part workbook outline, and initial status record.",
    acceptance:
      "Both products have a defined audience, must-have scope, exclusions, and a measurable definition of done.",
    tasks: [
      [
        "Studio",
        "Write the audience, outcomes, and must-have scope for both products",
        45,
      ],
      [
        "Website",
        "Choose the website architecture and record the implementation decisions",
        45,
      ],
      [
        "Workbook",
        "Outline all six workbook chapters and their learning objectives",
        50,
      ],
      [
        "AI",
        "Ask ChatGPT to challenge the plan; record the decisions you accept",
        25,
      ],
    ],
  },
  {
    title: "Build the website foundation",
    objective:
      "Set up the website project, warm design system, and responsive navigation.",
    deliverable:
      "A running project with shared typography, colors, page layout, and module navigation.",
    acceptance:
      "The app starts and builds; keyboard and mobile users can navigate every planned module.",
    tasks: [
      [
        "Website",
        "Initialize the project and verify the development and production commands",
        45,
      ],
      [
        "Website",
        "Create the shared colors, typography, buttons, and responsive page layout",
        60,
      ],
      [
        "Website",
        "Implement desktop and mobile navigation for the learning modules",
        50,
      ],
      [
        "Verification",
        "Check keyboard access, narrow screens, and the production build",
        30,
      ],
    ],
  },
  {
    title: "Create the landing page",
    objective:
      "Explain the learning promise and give learners a clear starting point.",
    deliverable:
      "A responsive IRHAM MATH LAB landing page with working module entry points.",
    acceptance:
      "A new visitor can explain the product, find the first lesson, and use every link on mobile.",
    tasks: [
      [
        "Website",
        "Write the headline, learning promise, and concise module descriptions",
        40,
      ],
      [
        "Website",
        "Build the hero, module cards, and clear start-learning action",
        70,
      ],
      [
        "Website",
        "Add accessible mobile layout and useful empty or loading states",
        45,
      ],
      [
        "Verification",
        "Test landing-page links, heading order, and small-screen overflow",
        25,
      ],
    ],
  },
  {
    title: "Build Algebra Explorer",
    objective:
      "Implement the first interactive visualization of algebraic expressions.",
    deliverable:
      "A usable Algebra Explorer with adjustable variables and an explanatory worked example.",
    acceptance:
      "Changing a variable updates the visualization and expression consistently; representative values are manually checked.",
    tasks: [
      [
        "Website",
        "Define the first Algebra Explorer interaction and its mathematical model",
        40,
      ],
      [
        "Website",
        "Build the visualization with labeled variable controls and reset behavior",
        90,
      ],
      [
        "Workbook",
        "Draft a matching worked example connecting notation to the visualization",
        35,
      ],
      [
        "Verification",
        "Verify zero, negative, and positive inputs and record the results",
        35,
      ],
    ],
  },
  {
    title: "Prove the workbook format",
    objective:
      "Finalize the workbook outline and produce a representative sample section.",
    deliverable:
      "An approved chapter sequence and a complete sample section with exercises and solutions.",
    acceptance:
      "The sample includes objectives, definitions, a worked example, graded exercises, and checked answers.",
    tasks: [
      [
        "Workbook",
        "Refine chapter sequencing, prerequisites, and learning objectives",
        45,
      ],
      [
        "Workbook",
        "Write one complete sample section in the intended editorial style",
        70,
      ],
      [
        "Workbook",
        "Create sample exercises and write their full solutions",
        50,
      ],
      [
        "AI",
        "Ask ChatGPT to review pedagogy and verify each accepted correction yourself",
        35,
      ],
    ],
  },
  {
    title: "Implement Equation Lab",
    objective:
      "Make equation solving visible through valid operations on both sides.",
    deliverable:
      "An Equation Lab supporting a clear sequence of equivalent equation steps.",
    acceptance:
      "The interface preserves equality, explains each step, and rejects invalid operations with helpful feedback.",
    tasks: [
      [
        "Website",
        "Specify supported equations and equivalent-operation rules",
        40,
      ],
      [
        "Website",
        "Implement equation controls, step history, and reset behavior",
        90,
      ],
      [
        "Workbook",
        "Write examples that connect balancing equations to symbolic steps",
        35,
      ],
      [
        "Verification",
        "Check positive, negative, fractional, and invalid-operation cases",
        40,
      ],
    ],
  },
  {
    title: "Run the first audit",
    objective:
      "Review the technical foundation and sample content before expanding scope.",
    deliverable:
      "A dated audit record with prioritized defects and a stable first-week baseline.",
    acceptance:
      "Known issues have severity and next actions; core interactions and sample mathematics have recorded checks.",
    tasks: [
      [
        "Verification",
        "Audit navigation, responsiveness, accessibility, and core interactions",
        60,
      ],
      [
        "Verification",
        "Independently recompute every sample expression and equation",
        45,
      ],
      [
        "Website",
        "Fix the highest-severity foundation defects and rerun affected checks",
        60,
      ],
      [
        "Studio",
        "Record week-one outcomes, unresolved risks, and the next-week focus",
        25,
      ],
    ],
  },
  {
    title: "Implement Function Studio",
    objective:
      "Connect function notation, tables, and graphs through adjustable inputs.",
    deliverable:
      "A Function Studio with labeled graphs and linked function values.",
    acceptance:
      "Inputs, table values, and plotted points agree for the documented examples and boundaries.",
    tasks: [
      [
        "Website",
        "Define supported functions, domain controls, and graph labels",
        40,
      ],
      [
        "Website",
        "Build linked function input, value table, and graph interactions",
        90,
      ],
      [
        "Workbook",
        "Write a short explanation of inputs, outputs, and function notation",
        35,
      ],
      [
        "Verification",
        "Compare graph and table values against hand calculations",
        35,
      ],
    ],
  },
  {
    title: "Implement Polynomial Lab",
    objective:
      "Let learners explore polynomial coefficients, roots, and factorization.",
    deliverable:
      "A Polynomial Lab with adjustable coefficients and meaningful explanations.",
    acceptance:
      "Displayed polynomial values and factors match independently checked examples; unsupported cases are explained.",
    tasks: [
      [
        "Website",
        "Define the supported polynomial degree and coefficient ranges",
        30,
      ],
      [
        "Website",
        "Implement coefficient controls, polynomial rendering, and visualization",
        90,
      ],
      [
        "Workbook",
        "Prepare examples connecting expanded and factored forms",
        40,
      ],
      [
        "Verification",
        "Check repeated roots, zero coefficients, and non-factorable examples",
        40,
      ],
    ],
  },
  {
    title: "Write workbook Chapter 1",
    objective: "Draft Variables, Constants, Expressions, and Notation.",
    deliverable:
      "A full Chapter 1 draft with learning objectives, worked examples, exercises, and answers.",
    acceptance:
      "Definitions are consistent, notation is explained, and every exercise has a manually checked answer.",
    tasks: [
      [
        "Workbook",
        "Draft definitions and explanations for variables, constants, and expressions",
        65,
      ],
      [
        "Workbook",
        "Write worked examples and graduated notation exercises",
        65,
      ],
      [
        "Verification",
        "Solve every Chapter 1 exercise independently and record corrections",
        45,
      ],
      ["AI", "Ask ChatGPT to review clarity and prerequisite assumptions", 25],
    ],
  },
  {
    title: "Write workbook Chapter 2",
    objective:
      "Draft Algebraic Operations and Properties with clear reasoning.",
    deliverable:
      "A full Chapter 2 draft covering operations, properties, examples, and solutions.",
    acceptance:
      "The text distinguishes valid algebraic transformations and includes verified common-error examples.",
    tasks: [
      [
        "Workbook",
        "Explain algebraic operations and the properties that justify each step",
        65,
      ],
      [
        "Workbook",
        "Create worked examples, common-error notes, and graded exercises",
        65,
      ],
      ["Verification", "Check every derivation and answer in Chapter 2", 45],
      [
        "AI",
        "Ask Gemini to identify missing practice types from the approved outline",
        25,
      ],
    ],
  },
  {
    title: "Implement Practice Arena",
    objective:
      "Give learners focused practice with useful feedback and retry behavior.",
    deliverable:
      "A Practice Arena containing checked questions, answer handling, and feedback.",
    acceptance:
      "Correct, incorrect, empty, and malformed answers receive accurate feedback without losing the exercise state.",
    tasks: [
      [
        "Website",
        "Define question data, answer rules, hints, and feedback behavior",
        40,
      ],
      [
        "Website",
        "Build question navigation, answer submission, feedback, and retry",
        90,
      ],
      [
        "Workbook",
        "Select and adapt verified exercises for the initial practice set",
        40,
      ],
      [
        "Verification",
        "Test accepted answers, invalid inputs, retries, and keyboard use",
        40,
      ],
    ],
  },
  {
    title: "Write workbook Chapter 3",
    objective:
      "Draft Exponents and Algebraic Fractions with explicit restrictions.",
    deliverable:
      "A complete Chapter 3 draft with exponent rules, fraction examples, and solutions.",
    acceptance:
      "Domain restrictions and nonzero denominators are stated; every simplification and answer is verified.",
    tasks: [
      [
        "Workbook",
        "Draft exponent rules and algebraic-fraction explanations",
        65,
      ],
      [
        "Workbook",
        "Write examples and exercises that include domain restrictions",
        65,
      ],
      [
        "Verification",
        "Verify exponent edge cases, cancellation steps, and all solutions",
        50,
      ],
      [
        "AI",
        "Ask ChatGPT to identify misleading notation or hidden assumptions",
        25,
      ],
    ],
  },
  {
    title: "Integrate and audit the core",
    objective:
      "Bring existing modules and chapters together and close integration gaps.",
    deliverable:
      "An integrated website and a reviewed three-chapter workbook baseline.",
    acceptance:
      "Module navigation, common controls, notation, and cross-references are consistent; critical defects are logged.",
    tasks: [
      [
        "Website",
        "Integrate all learning modules and align shared interaction patterns",
        70,
      ],
      [
        "Workbook",
        "Review Chapters 1–3 for notation, structure, and cross-references",
        55,
      ],
      [
        "Verification",
        "Run an end-to-end learner walkthrough and record integration defects",
        50,
      ],
      [
        "Studio",
        "Reprioritize the remaining scope using the audit evidence",
        25,
      ],
    ],
  },
  {
    title: "Write workbook Chapter 4",
    objective:
      "Draft Equations and Inequalities with justified solution steps.",
    deliverable:
      "A complete Chapter 4 draft with equations, inequalities, exercises, and solutions.",
    acceptance:
      "Solutions include substitution checks, inequality direction changes, and clear solution-set notation.",
    tasks: [
      [
        "Workbook",
        "Explain equation and inequality methods with justified transformations",
        70,
      ],
      ["Workbook", "Write graduated exercises and fully worked solutions", 65],
      [
        "Verification",
        "Substitute answers and verify inequality sign changes and intervals",
        50,
      ],
      [
        "AI",
        "Ask ChatGPT to review explanations of common solving mistakes",
        25,
      ],
    ],
  },
  {
    title: "Write workbook Chapter 5",
    objective:
      "Draft Polynomials and Factorization with a deliberate difficulty progression.",
    deliverable:
      "A complete Chapter 5 draft with polynomial operations, factoring, and checked answers.",
    acceptance:
      "Every factorization expands back correctly and the examples cover the declared methods.",
    tasks: [
      [
        "Workbook",
        "Draft polynomial operations and factorization strategies",
        70,
      ],
      [
        "Workbook",
        "Create worked examples and exercises for each supported strategy",
        65,
      ],
      [
        "Verification",
        "Expand each factored answer and verify all polynomial calculations",
        50,
      ],
      [
        "AI",
        "Ask Gemini to flag repetition or missing exercise difficulty levels",
        25,
      ],
    ],
  },
  {
    title: "Create cumulative exercises",
    objective:
      "Connect all chapters through cumulative practice and verified solutions.",
    deliverable:
      "Chapter 6 with mixed exercises, challenge problems, and a complete solution set.",
    acceptance:
      "All five chapter objectives are represented; every problem has an independently verified solution.",
    tasks: [
      [
        "Workbook",
        "Map cumulative exercises to the five chapter learning objectives",
        40,
      ],
      [
        "Workbook",
        "Write mixed practice, challenge problems, and step-by-step solutions",
        90,
      ],
      [
        "Verification",
        "Independently solve the entire cumulative exercise set",
        60,
      ],
      [
        "Workbook",
        "Adjust ordering and difficulty using the verification findings",
        30,
      ],
    ],
  },
  {
    title: "Assemble the complete draft",
    objective:
      "Combine all workbook chapters into one coherent first product draft.",
    deliverable:
      "A single complete workbook draft with contents, chapters, solutions, and front matter.",
    acceptance:
      "No chapter or answer section is missing; references and numbering are consistent and known gaps are listed.",
    tasks: [
      [
        "Workbook",
        "Merge all chapters, solutions, contents, and introductory material",
        65,
      ],
      [
        "Workbook",
        "Normalize terminology, symbols, exercise numbering, and cross-references",
        60,
      ],
      [
        "Verification",
        "Audit chapter completeness and create a remaining-content issue list",
        40,
      ],
      [
        "Studio",
        "Save a dated backup of the complete draft and document its status",
        20,
      ],
    ],
  },
  {
    title: "Track learning progress",
    objective:
      "Help learners resume their work with honest browser-local progress tracking.",
    deliverable:
      "Learning Progress that records completed practice and supports a clear reset.",
    acceptance:
      "Progress survives refresh, reflects actual actions, handles empty data, and explains local-storage limitations.",
    tasks: [
      [
        "Website",
        "Define the learner-progress data and explicit completion rules",
        35,
      ],
      [
        "Website",
        "Implement saved learning progress, resume links, and confirmed reset",
        90,
      ],
      [
        "Verification",
        "Test refresh persistence, invalid storage, and independent browser behavior",
        45,
      ],
      [
        "Website",
        "Explain device-local storage and provide useful first-use empty states",
        25,
      ],
    ],
  },
  {
    title: "Learn from real users",
    objective:
      "Observe real learners using the website and reading workbook sample pages.",
    deliverable:
      "Actual user-testing notes with observed problems and prioritized feedback.",
    acceptance:
      "Feedback records the tested task, observed result, and specific follow-up; no uncollected feedback is invented.",
    tasks: [
      [
        "Studio",
        "Prepare short learner tasks and invite available testers",
        35,
      ],
      [
        "Website",
        "Observe website use on desktop and mobile and record actual problems",
        60,
      ],
      [
        "Workbook",
        "Collect feedback on sample explanations, exercises, and readability",
        50,
      ],
      [
        "Studio",
        "Group evidence by severity and choose the fixes required for launch",
        35,
      ],
    ],
  },
  {
    title: "Prepare a release candidate",
    objective:
      "Resolve high-priority problems and freeze a testable release candidate.",
    deliverable:
      "A labeled website release candidate and corrected workbook draft.",
    acceptance:
      "Critical and high-priority launch blockers are resolved or explicitly documented; affected checks have been rerun.",
    tasks: [
      [
        "Website",
        "Fix the highest-priority website issues from user testing",
        80,
      ],
      [
        "Workbook",
        "Correct confusing explanations and verified content defects",
        65,
      ],
      [
        "Verification",
        "Retest every fix and record remaining release risks",
        50,
      ],
      [
        "Studio",
        "Freeze the release scope and save the release-candidate backup",
        20,
      ],
    ],
  },
  {
    title: "Format the workbook PDF",
    objective:
      "Turn the complete workbook draft into a clear, consistent printable document.",
    deliverable:
      "A formatted PDF candidate with readable mathematics, navigation, and sample pages.",
    acceptance:
      "Page breaks, margins, equation rendering, headers, contents, and exported text are checked in the PDF.",
    tasks: [
      [
        "Workbook",
        "Apply consistent page styles, typography, headings, and equation layout",
        90,
      ],
      [
        "Workbook",
        "Prepare cover, contents, page numbering, and printable sample pages",
        55,
      ],
      [
        "Workbook",
        "Export the complete PDF and open it in more than one reader",
        30,
      ],
      [
        "Verification",
        "Check clipping, page breaks, links, and print readability",
        45,
      ],
    ],
  },
  {
    title: "Run the final content audit",
    objective:
      "Complete the mathematical and editorial review before public release.",
    deliverable:
      "A dated final audit with checked solutions and resolved editorial issues.",
    acceptance:
      "Every chapter and answer section has a recorded mathematical and editorial review; unresolved issues are explicit.",
    tasks: [
      [
        "Verification",
        "Recheck mathematics, definitions, derivations, and answer keys",
        100,
      ],
      [
        "Workbook",
        "Review grammar, consistent notation, references, and accessibility",
        65,
      ],
      [
        "AI",
        "Use ChatGPT as a second reviewer and personally verify proposed changes",
        35,
      ],
      [
        "Verification",
        "Record final audit evidence and any release-blocking issues",
        25,
      ],
    ],
  },
  {
    title: "Deploy the learning website",
    objective:
      "Publish the verified website to Netlify and test the real public URL.",
    deliverable:
      "A working production deployment with recorded URL and deployment instructions.",
    acceptance:
      "The production build passes and direct links, core interactions, and mobile behavior work at the deployed URL.",
    tasks: [
      [
        "Website",
        "Run the production build and review deployment configuration",
        35,
      ],
      [
        "Website",
        "Deploy the release candidate to Netlify and record the public URL",
        45,
      ],
      [
        "Verification",
        "Smoke-test the deployed homepage, modules, direct links, and mobile layout",
        55,
      ],
      [
        "Website",
        "Document deployment, rollback, and known browser-local data limits",
        30,
      ],
    ],
  },
  {
    title: "Build the workbook sales page",
    objective:
      "Describe the workbook accurately and provide a clear ordering path.",
    deliverable:
      "A sales landing page with honest product details, sample pages, price, and ordering instructions.",
    acceptance:
      "Visitors can understand who the workbook serves, view sample pages, and follow a documented order process.",
    tasks: [
      [
        "Website",
        "Write the workbook promise, chapter overview, and accurate product details",
        45,
      ],
      [
        "Website",
        "Build the responsive sales page with samples and ordering instructions",
        75,
      ],
      [
        "Workbook",
        "Prepare approved sample pages, product description, and final file details",
        40,
      ],
      [
        "Verification",
        "Test every download, contact link, and ordering instruction",
        30,
      ],
    ],
  },
  {
    title: "Prepare promotional content",
    objective:
      "Create useful launch materials that demonstrate the products without unsupported claims.",
    deliverable:
      "An approved set of launch posts, product visuals, and a simple publishing schedule.",
    acceptance:
      "Every promotional item has a clear audience, working destination, and evidence-based claim.",
    tasks: [
      [
        "Studio",
        "Choose the launch channels and write a realistic publishing schedule",
        35,
      ],
      [
        "AI",
        "Ask ChatGPT for launch-copy options using the actual product features",
        30,
      ],
      [
        "Workbook",
        "Create sample-page visuals and a short educational demonstration",
        60,
      ],
      [
        "Verification",
        "Proofread launch materials and test all destination links",
        30,
      ],
    ],
  },
  {
    title: "Begin the launch",
    objective:
      "Release the learning website and workbook with clear support and ordering information.",
    deliverable:
      "Published launch announcements and an accessible product and support path.",
    acceptance:
      "The announced links are live, the final file is available through the chosen delivery workflow, and actual activity is recorded.",
    tasks: [
      [
        "Studio",
        "Run the launch readiness checklist and record any remaining risks",
        35,
      ],
      [
        "Studio",
        "Publish the approved announcements through the chosen channels",
        45,
      ],
      [
        "Website",
        "Verify public product links and support or contact information",
        30,
      ],
      [
        "Studio",
        "Record actual launch feedback, inquiries, and next actions",
        30,
      ],
    ],
  },
  {
    title: "Test ordering and delivery",
    objective:
      "Verify that a customer can follow the real ordering and workbook delivery workflow.",
    deliverable:
      "A documented end-to-end order and delivery test with clear customer instructions.",
    acceptance:
      "The selected manual or integrated process is genuinely tested; payment and delivery claims match available capabilities.",
    tasks: [
      [
        "Studio",
        "Write the ordering, payment confirmation, and delivery instructions",
        45,
      ],
      [
        "Verification",
        "Walk through the actual chosen order process and record the result",
        55,
      ],
      [
        "Workbook",
        "Verify that the delivered PDF opens correctly and matches the final version",
        30,
      ],
      [
        "Studio",
        "Fix unclear customer instructions and record the support procedure",
        35,
      ],
    ],
  },
  {
    title: "Review actual launch results",
    objective:
      "Use real results and feedback to decide what deserves the next improvement.",
    deliverable:
      "A launch-results review using only recorded sales, usage evidence, and feedback.",
    acceptance:
      "Unavailable metrics remain unknown; the review separates observed evidence from assumptions and selects practical actions.",
    tasks: [
      [
        "Studio",
        "Collect actual inquiries, customer feedback, and available usage evidence",
        40,
      ],
      [
        "Studio",
        "Record actual sales and revenue only where supported by order records",
        30,
      ],
      [
        "AI",
        "Ask ChatGPT to analyze anonymized findings and prioritize useful changes",
        30,
      ],
      [
        "Studio",
        "Choose the next improvements and explain the evidence for each",
        40,
      ],
    ],
  },
  {
    title: "Close the release and hand over",
    objective:
      "Complete the release review, preserve backups, and prepare a maintainable next phase.",
    deliverable:
      "A final release review, verified backups, maintenance notes, and next-phase priorities.",
    acceptance:
      "Source, final PDF, project data, deployment notes, and known limitations are preserved and the backup restore path is checked.",
    tasks: [
      [
        "Verification",
        "Review final acceptance criteria and record completed and unfinished deliverables",
        50,
      ],
      [
        "Studio",
        "Back up project data, source code, final PDFs, and deployment details",
        40,
      ],
      [
        "Verification",
        "Check that backups can be opened and document the restore procedure",
        35,
      ],
      [
        "Studio",
        "Write the handover, lessons learned, and focused next-phase backlog",
        45,
      ],
    ],
  },
];

export function createInitialData(today = localDate()): StudioData {
  const milestones: Milestone[] = plan.map((item, index) => ({
    day: index + 1,
    title: item.title,
    objective: item.objective,
    description: `${item.objective} Work toward the recorded deliverable, verify the result, and save evidence before marking this milestone complete.`,
    deliverable: item.deliverable,
    acceptance: item.acceptance,
    priority: [1, 7, 14, 21, 23, 24, 27, 30].includes(index + 1)
      ? "High"
      : "Medium",
    status: "Not Started",
    notes: "",
    links: "",
    prompts: "",
    startDate: addDays(today, index),
    dueDate: addDays(today, index),
  }));
  const tasks: Task[] = plan.flatMap((item, index) =>
    item.tasks.map(([project, title, estimate], order) => ({
      id: `day-${index + 1}-task-${order + 1}`,
      day: index + 1,
      title,
      project,
      status: "Not Started" as const,
      priority: order === 0 ? ("High" as const) : ("Medium" as const),
      estimate,
      actual: 0,
      notes: "",
      deadline: addDays(today, index),
      prompt: "",
      completedAt: null,
      order,
    })),
  );
  return {
    version: 1,
    settings: { name: "Irham", startDate: today, focusMinutes: 25 },
    tasks,
    milestones,
    reviews: {},
    captures: [],
    focusSessions: [],
  };
}
