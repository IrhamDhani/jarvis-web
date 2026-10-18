export type TaskStatus =
  "Not Started" | "In Progress" | "Blocked" | "Completed";
export type Priority = "High" | "Medium" | "Low";
export type Project = "Website" | "Workbook" | "Studio" | "AI" | "Verification";
export interface Task {
  id: string;
  title: string;
  day: number;
  project: Project;
  status: TaskStatus;
  priority: Priority;
  estimate: number;
  actual: number;
  notes: string;
  deadline: string;
  prompt: string;
  completedAt: string | null;
  order: number;
}
export interface Milestone {
  day: number;
  title: string;
  objective: string;
  description: string;
  deliverable: string;
  acceptance: string;
  priority: Priority;
  status: TaskStatus;
  notes: string;
  links: string;
  prompts: string;
  startDate: string;
  dueDate: string;
}
export interface Review {
  date: string;
  answers: string[];
  updatedAt: string;
}
export type CaptureCategory =
  | "Task"
  | "Bug"
  | "Mathematical idea"
  | "Book improvement"
  | "AI prompt"
  | "Marketing idea"
  | "Decision";
export interface Capture {
  id: string;
  category: CaptureCategory;
  title: string;
  content: string;
  tags: string;
  createdAt: string;
  updatedAt: string;
}
export interface FocusSession {
  id: string;
  date: string;
  minutes: number;
  taskId: string | null;
}
export interface StudioData {
  version: 1;
  settings: { name: string; startDate: string; focusMinutes: number };
  tasks: Task[];
  milestones: Milestone[];
  reviews: Record<string, Review>;
  captures: Capture[];
  focusSessions: FocusSession[];
}
export interface StudioActions {
  updateTask: (id: string, changes: Partial<Task>) => void;
  addTask: (task: Omit<Task, "id" | "completedAt" | "order">) => void;
  deleteTask: (id: string) => void;
  moveTask: (id: string, direction: -1 | 1) => void;
  updateMilestone: (day: number, changes: Partial<Milestone>) => void;
  saveReview: (review: Review) => void;
  updateSettings: (changes: Partial<StudioData["settings"]>) => void;
  addCapture: (
    capture: Omit<Capture, "id" | "createdAt" | "updatedAt">,
  ) => void;
  updateCapture: (id: string, changes: Partial<Capture>) => void;
  deleteCapture: (id: string) => void;
  addFocus: (session: Omit<FocusSession, "id">) => void;
  replaceData: (data: StudioData) => void;
  resetData: () => void;
}
export interface PageProps {
  data: StudioData;
  actions: StudioActions;
}
export type Page =
  | "dashboard"
  | "roadmap"
  | "missions"
  | "website"
  | "workbook"
  | "notes"
  | "settings";
