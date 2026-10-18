import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  StickyNote,
  Sparkles,
  Scale,
} from "lucide-react";
import { EmptyState, Modal, PageHeading } from "../components/ui";
import type { Capture, CaptureCategory, PageProps } from "../types";

const categories: CaptureCategory[] = [
  "Task",
  "Bug",
  "Mathematical idea",
  "Book improvement",
  "AI prompt",
  "Marketing idea",
  "Decision",
];
type CaptureDraft = Pick<Capture, "title" | "content" | "category" | "tags">;
const blankCapture = (category: CaptureCategory): CaptureDraft => ({
  title: "",
  content: "",
  category,
  tags: "",
});

function displayDate(timestamp: string) {
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime())
    ? timestamp
    : date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
}

export function Notes({
  data,
  actions,
  initialCategory,
}: PageProps & { initialCategory?: CaptureCategory }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<CaptureCategory | "All">(
    initialCategory ?? "All",
  );
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const isPrompts = initialCategory === "AI prompt";

  useEffect(() => {
    setCategory(initialCategory ?? "All");
    setSearch("");
  }, [initialCategory]);

  const captures = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return data.captures
      .filter(
        (capture) =>
          (category === "All" || capture.category === category) &&
          (!query ||
            [capture.title, capture.content, capture.category, capture.tags]
              .join(" ")
              .toLocaleLowerCase()
              .includes(query)),
      )
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [data.captures, category, search]);

  function openNew() {
    setEditingId(null);
    setDraft(
      blankCapture(category === "All" ? (initialCategory ?? "Task") : category),
    );
    setError("");
  }

  function editCapture(capture: Capture) {
    setEditingId(capture.id);
    setDraft({
      title: capture.title,
      content: capture.content,
      category: capture.category,
      tags: capture.tags,
    });
    setError("");
  }

  function saveCapture(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft) return;
    if (!draft.title.trim() || !draft.content.trim()) {
      setError("Add a title and some content before saving.");
      return;
    }
    try {
      const values = {
        ...draft,
        title: draft.title.trim(),
        content: draft.content.trim(),
        tags: draft.tags.trim(),
      };
      if (editingId) actions.updateCapture(editingId, values);
      else actions.addCapture(values);
      setNotice(editingId ? "Capture updated." : "Capture saved.");
      setCategory(draft.category);
      setSearch("");
      setDraft(null);
      setEditingId(null);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The capture could not be saved. Please try again.",
      );
    }
  }

  function deleteCapture(capture: Capture) {
    if (
      !window.confirm(
        `Delete “${capture.title}”? This capture will be removed from your workspace.`,
      )
    )
      return;
    try {
      actions.deleteCapture(capture.id);
      setNotice("Capture deleted.");
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The capture could not be deleted. Please try again.",
      );
    }
  }

  return (
    <div className="page-content">
      <PageHeading
        eyebrow={isPrompts ? "THINK WITH AI" : "GET IT OUT OF YOUR HEAD"}
        title={isPrompts ? "Prompt captures" : "Notes & captures"}
        description={
          isPrompts
            ? "Save useful prompts and the context that makes them work. The full prompt library is planned for Stage 2."
            : "Ideas, rough edges, and decisions. Give every loose thought a place to land."
        }
        actions={
          <button type="button" className="button primary" onClick={openNew}>
            <Plus size={17} aria-hidden="true" />
            {isPrompts ? "Save a prompt" : "New capture"}
          </button>
        }
      />
      {error && !draft && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          {notice}
        </div>
      )}
      <section
        className="card capture-toolbar"
        aria-label="Search and filter captures"
      >
        <div className="search-field">
          <Search size={18} aria-hidden="true" />
          <label className="visually-hidden" htmlFor="capture-search">
            Search captures
          </label>
          <input
            id="capture-search"
            type="search"
            placeholder="Search titles, ideas, or tags…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <label className="field" htmlFor="capture-category-filter">
          <span className="visually-hidden">Filter capture category</span>
          <select
            id="capture-category-filter"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as CaptureCategory | "All")
            }
          >
            <option value="All">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={`button ${category === "Decision" ? "primary" : "secondary"}`}
          aria-pressed={category === "Decision"}
          onClick={() =>
            setCategory(category === "Decision" ? "All" : "Decision")
          }
        >
          <Scale size={16} aria-hidden="true" /> Decision log
        </button>
      </section>
      <div className="section-heading">
        <p className="muted">
          {captures.length} {captures.length === 1 ? "capture" : "captures"}
          {category !== "All" ? ` · ${category}` : ""}
          {search.trim() ? ` matching “${search.trim()}”` : ""}
        </p>
        <span className="muted">Recently updated first</span>
      </div>
      {captures.length === 0 ? (
        <EmptyState
          title={
            search.trim() || category !== "All"
              ? "No matching captures"
              : "A clear space for your next idea"
          }
          description={
            search.trim() || category !== "All"
              ? "Try another search or category, or capture something new."
              : "Save a thought, document a decision, or capture a prompt to return to later."
          }
          action={
            <button type="button" className="button primary" onClick={openNew}>
              <Plus size={16} aria-hidden="true" /> New capture
            </button>
          }
        />
      ) : (
        <div className="notes-grid">
          {captures.map((capture) => (
            <article className="card capture-card" key={capture.id}>
              <div className="row capture-card-top">
                <span className="badge">
                  {capture.category === "AI prompt" ? (
                    <Sparkles size={13} aria-hidden="true" />
                  ) : (
                    <StickyNote size={13} aria-hidden="true" />
                  )}{" "}
                  {capture.category}
                </span>
                <div className="row">
                  <button
                    type="button"
                    className="button ghost small"
                    onClick={() => editCapture(capture)}
                    aria-label={`Edit ${capture.title}`}
                  >
                    <Pencil size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="button ghost small danger"
                    onClick={() => deleteCapture(capture)}
                    aria-label={`Delete ${capture.title}`}
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <h2>{capture.title}</h2>
              <p
                className="capture-content"
                style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
              >
                {capture.content}
              </p>
              {capture.tags.trim() && (
                <div className="chip-row" aria-label="Tags">
                  {capture.tags
                    .split(",")
                    .map((tag) => tag.trim())
                    .filter(Boolean)
                    .map((tag, index) => (
                      <span className="tag" key={`${tag}-${index}`}>
                        {tag.startsWith("#") ? tag : `#${tag}`}
                      </span>
                    ))}
                </div>
              )}
              <footer className="capture-metadata muted">
                <div>
                  Created{" "}
                  <time dateTime={capture.createdAt}>
                    {displayDate(capture.createdAt)}
                  </time>
                </div>
                <div>
                  Updated{" "}
                  <time dateTime={capture.updatedAt}>
                    {displayDate(capture.updatedAt)}
                  </time>
                </div>
              </footer>
            </article>
          ))}
        </div>
      )}
      {draft && (
        <Modal
          title={
            editingId
              ? "Edit capture"
              : isPrompts && draft.category === "AI prompt"
                ? "Save a prompt"
                : "New capture"
          }
          onClose={() => {
            setDraft(null);
            setError("");
          }}
          wide
        >
          <form onSubmit={saveCapture} className="stack">
            {error && (
              <div className="alert error" role="alert">
                {error}
              </div>
            )}
            <label className="field" htmlFor="capture-title">
              Title
              <input
                id="capture-title"
                maxLength={1000}
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
                placeholder="What would you like to remember?"
                required
                autoFocus
              />
            </label>
            <div className="form-grid">
              <label className="field" htmlFor="capture-category">
                Category
                <select
                  id="capture-category"
                  value={draft.category}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      category: event.target.value as CaptureCategory,
                    })
                  }
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field" htmlFor="capture-tags">
                Tags
                <input
                  id="capture-tags"
                  maxLength={2000}
                  value={draft.tags}
                  onChange={(event) =>
                    setDraft({ ...draft, tags: event.target.value })
                  }
                  placeholder="website, launch, later"
                />
                <span className="muted">Separate tags with commas.</span>
              </label>
            </div>
            <label className="field" htmlFor="capture-content">
              {draft.category === "AI prompt"
                ? "Prompt & context"
                : draft.category === "Decision"
                  ? "Decision & reasoning"
                  : "Content"}
              <textarea
                id="capture-content"
                maxLength={50000}
                rows={8}
                value={draft.content}
                onChange={(event) =>
                  setDraft({ ...draft, content: event.target.value })
                }
                placeholder={
                  draft.category === "Decision"
                    ? "What did you decide, why, and what should happen next?"
                    : "Make space for the details…"
                }
                required
              />
            </label>
            {editingId &&
              (() => {
                const original = data.captures.find(
                  (capture) => capture.id === editingId,
                );
                return original ? (
                  <p className="muted">
                    Created {displayDate(original.createdAt)} · Last updated{" "}
                    {displayDate(original.updatedAt)}
                  </p>
                ) : null;
              })()}
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => {
                  setDraft(null);
                  setError("");
                }}
              >
                Cancel
              </button>
              <button type="submit" className="button primary">
                {editingId ? "Save changes" : "Save capture"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Notes;
