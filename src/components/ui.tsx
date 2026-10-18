import { useEffect, useId, useRef, type ReactNode } from "react";
import { X, Sprout } from "lucide-react";

export function Progress({ value, label }: { value: number; label?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-wrap">
      <div
        className="progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={safe}
        aria-label={label || "Completion"}
      >
        <span style={{ width: `${safe}%` }} />
      </div>
      {label && <span className="progress-caption">{label}</span>}
    </div>
  );
}
export function Badge({
  children,
  variant = "neutral",
}: {
  children: ReactNode;
  variant?: "sage" | "rose" | "caramel" | "neutral";
}) {
  return <span className={`badge badge-${variant}`}>{children}</span>;
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </header>
  );
}
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Sprout size={25} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const previousFocus = useRef(document.activeElement as HTMLElement | null);
  const titleId = useId();
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = previousFocus.current;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex="0"]',
        ) || [],
      ).filter((el) => !el.hasAttribute("disabled"));
    (
      ref.current?.querySelector<HTMLElement>("[autofocus], input, textarea") ||
      focusable()[0] ||
      ref.current
    )?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`modal ${wide ? "modal-wide" : ""}`}
      >
        <header className="modal-header">
          <h2 id={titleId}>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={21} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
