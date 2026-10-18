import { useState } from "react";
import {
  ArrowUpRight,
  Search as SearchIcon,
  FileText,
  CheckSquare,
  Flag,
} from "lucide-react";
import type { StudioData, Page } from "../types";
import { Modal } from "./ui";
export default function Search({
  data,
  navigate,
  onClose,
}: {
  data: StudioData;
  navigate: (page: Page, day?: number) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const results = q.length
    ? [
        ...data.tasks
          .filter((t) => (t.title + " " + t.notes).toLowerCase().includes(q))
          .map((t) => ({
            id: t.id,
            title: t.title,
            detail: `Day ${t.day} · ${t.project}`,
            page: "missions" as Page,
            day: t.day,
            icon: CheckSquare,
          })),
        ...data.milestones
          .filter((m) =>
            (m.title + " " + m.objective).toLowerCase().includes(q),
          )
          .map((m) => ({
            id: `day${m.day}`,
            title: m.title,
            detail: `Roadmap · Day ${m.day}`,
            page: "roadmap" as Page,
            day: m.day,
            icon: Flag,
          })),
        ...data.captures
          .filter((c) =>
            (c.title + " " + c.content + " " + c.tags)
              .toLowerCase()
              .includes(q),
          )
          .map((c) => ({
            id: c.id,
            title: c.title,
            detail: `Notes · ${c.category}`,
            page: "notes" as Page,
            day: undefined,
            icon: FileText,
          })),
      ].slice(0, 15)
    : [];
  return (
    <Modal title="Find a little clarity." onClose={onClose}>
      <label className="search-field global-search">
        <SearchIcon size={20} />
        <input
          autoFocus
          aria-label="Search your studio"
          type="search"
          placeholder="Tasks, milestones, notes…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <div className="search-results" aria-live="polite">
        {results.map((result) => (
          <button
            className="search-result"
            key={result.id}
            onClick={() => {
              navigate(result.page, result.day);
              onClose();
            }}
          >
            <result.icon size={18} />
            <span>
              <strong>{result.title}</strong>
              <small>{result.detail}</small>
            </span>
            <ArrowUpRight size={15} />
          </button>
        ))}
        {q && !results.length && (
          <p className="search-hint">
            No matches for “{query}”. Try another word.
          </p>
        )}
        {!q && (
          <p className="search-hint">
            Your work, all in one place. Start with a word or a project.
          </p>
        )}
      </div>
    </Modal>
  );
}
