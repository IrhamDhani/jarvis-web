import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Route,
  ListChecks,
  Layers3,
  BookOpen,
  NotebookPen,
  Settings2,
  Search as SearchIcon,
  Menu,
  X,
  ArrowUpRight,
  Check,
  ShieldCheck,
  CloudOff,
  AlertTriangle,
  Sparkles,
  Clock3,
} from "lucide-react";
import type { Page } from "./types";
import { useStudio } from "./lib/storage";
import { projectDay, localDate, overallProgress } from "./lib/model";
import { Progress } from "./components/ui";
import { StudioMark } from "./components/StudioArt";
import Dashboard from "./pages/Dashboard";
import Roadmap from "./pages/Roadmap";
import Missions from "./pages/Missions";
import ProjectWorkspace from "./pages/ProjectWorkspace";
import Notes from "./pages/Notes";
import Settings from "./pages/Settings";
import QuickCapture from "./components/QuickCapture";
import Focus from "./components/Focus";
import Search from "./components/Search";
const pages: {
  id: Page;
  label: string;
  icon: typeof LayoutDashboard;
  group: string;
}[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    group: "YOUR WORKSPACE",
  },
  {
    id: "roadmap",
    label: "30-Day Roadmap",
    icon: Route,
    group: "YOUR WORKSPACE",
  },
  {
    id: "missions",
    label: "Daily Missions",
    icon: ListChecks,
    group: "YOUR WORKSPACE",
  },
  {
    id: "website",
    label: "IRHAM Math Lab",
    icon: Layers3,
    group: "YOUR PROJECTS",
  },
  {
    id: "workbook",
    label: "Algebra Workbook",
    icon: BookOpen,
    group: "YOUR PROJECTS",
  },
  {
    id: "notes",
    label: "Notes & Resources",
    icon: NotebookPen,
    group: "STUDIO ESSENTIALS",
  },
  {
    id: "settings",
    label: "Settings & Data",
    icon: Settings2,
    group: "STUDIO ESSENTIALS",
  },
];
function getRoute() {
  const [raw, query = ""] = window.location.hash.slice(1).split("?");
  const page = pages.some((p) => p.id === raw) ? (raw as Page) : "dashboard";
  const n = Number(new URLSearchParams(query).get("day"));
  return { page, day: n >= 1 && n <= 30 ? Math.floor(n) : undefined };
}
export default function App() {
  const studio = useStudio();
  const { data, saveError, storageWarning, storageLocked } = studio;
  const [route, setRoute] = useState(getRoute);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [capture, setCapture] = useState(false);
  const [focus, setFocus] = useState(false);
  const [search, setSearch] = useState(false);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState(new Date());
  const navigate = useCallback((page: Page, day?: number) => {
    const next = `#${page}${day ? `?day=${day}` : ""}`;
    window.location.hash = next;
    setRoute({ page, day });
    setMobileOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);
  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const listener = () => setRoute(getRoute());
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    document.title = `${pages.find((p) => p.id === route.page)?.label || "Dashboard"} · IRHAM STUDIO`;
    document.getElementById("workspace-title")?.focus({ preventScroll: true });
  }, [route.page]);
  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      if (
        e.key === "/" &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault();
        setSearch(true);
      }
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 720px)");
    const resized = () => {
      if (!media.matches) setMobileOpen(false);
    };
    media.addEventListener("change", resized);
    if (!mobileOpen) return () => media.removeEventListener("change", resized);
    const previous = document.activeElement as HTMLElement | null;
    const sidebar = document.querySelector<HTMLElement>(".sidebar");
    const controls = () =>
      Array.from(
        sidebar?.querySelectorAll<HTMLElement>("a, button") || [],
      ).filter((el) => el.getClientRects().length > 0);
    sidebar?.querySelector<HTMLElement>('[aria-current="page"]')?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = controls();
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
        event.preventDefault();
        items[0]?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      media.removeEventListener("change", resized);
      document.removeEventListener("keydown", trap);
      previous?.focus();
    };
  }, [mobileOpen]);
  const today = projectDay(data.settings.startDate, localDate(now));
  const active = pages.find((p) => p.id === route.page)!;
  return (
    <>
      <a href="#main-content" className="skip-link">
        Skip to workspace
      </a>
      {mobileOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}
        aria-label="Studio navigation"
        role={mobileOpen ? "dialog" : undefined}
        aria-modal={mobileOpen || undefined}
      >
        <a
          className="brand"
          href="#dashboard"
          onClick={() => setMobileOpen(false)}
        >
          <span className="brand-mark">
            <StudioMark size={39} />
          </span>
          <span>
            IRHAM <b>STUDIO</b>
            <small>A SPACE TO MAKE THINGS HAPPEN</small>
          </span>
        </a>
        <button
          className="icon-button mobile-close"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        >
          <X />
        </button>
        <div className="workspace-label">
          <span className="workspace-avatar">I</span>
          <div>
            My personal studio<small>Two projects. One intention.</small>
          </div>
          <span className="workspace-online" />
        </div>
        <nav>
          {pages.map((page, index) => (
            <div key={page.id}>
              {(index === 0 || pages[index - 1].group !== page.group) && (
                <p className="nav-group-label">{page.group}</p>
              )}
              <a
                href={`#${page.id}`}
                className={`nav-item ${route.page === page.id ? "active" : ""}`}
                aria-current={route.page === page.id ? "page" : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(page.id);
                }}
              >
                <page.icon size={19} strokeWidth={1.6} />
                <span>{page.label}</span>
                {page.id === "missions" && (
                  <span className="nav-count">
                    {
                      data.tasks.filter(
                        (t) =>
                          t.day === Math.max(1, Math.min(30, today)) &&
                          t.status !== "Completed",
                      ).length
                    }
                  </span>
                )}
                {page.id === "website" && (
                  <span className="nav-project-dot sage" />
                )}
                {page.id === "workbook" && (
                  <span className="nav-project-dot rose" />
                )}
              </a>
            </div>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="journey-card">
            <div className="journey-top">
              <Sparkles size={16} />
              <span>Your 30-day journey</span>
            </div>
            <p>Something worth finishing.</p>
            <div className="journey-progress">
              <span>{overallProgress(data)}% complete</span>
              <span>
                {today < 1
                  ? "Not started"
                  : today > 30
                    ? "Review time"
                    : `Day ${today} of 30`}
              </span>
            </div>
            <Progress value={overallProgress(data)} />
            <button className="text-link" onClick={() => navigate("roadmap")}>
              Keep the bigger picture close <ArrowUpRight size={13} />
            </button>
          </div>
          <div className="sidebar-profile">
            <span className="profile-avatar">
              {(data.settings.name || "I").slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{data.settings.name || "Irham"}’s workspace</strong>
              <small>Made for meaningful work</small>
            </div>
            <button
              className="icon-button"
              aria-label="Open settings"
              onClick={() => navigate("settings")}
            >
              <Settings2 size={17} />
            </button>
          </div>
        </div>
      </aside>
      <div className="main-shell" inert={mobileOpen}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen(true)}
            >
              <Menu size={22} />
            </button>
            <span className="breadcrumb-parent">
              My studio <span>/</span>
            </span>
            <span id="workspace-title" tabIndex={-1}>
              {active?.label}
            </span>
          </div>
          <div className="topbar-right">
            <button
              className="topbar-search"
              aria-label="Search your studio"
              onClick={() => setSearch(true)}
            >
              <SearchIcon size={17} />
              <span>Search your studio</span>
              <kbd>/</kbd>
            </button>
            {running && (
              <button className="running-focus" onClick={() => setFocus(true)}>
                <Clock3 size={15} />
                <span>Focusing</span>
              </button>
            )}
            <span className="topbar-date">
              {now.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              <span className="topbar-time">
                {now.toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </span>
            <span className="topbar-avatar">
              {(data.settings.name || "I").slice(0, 1).toUpperCase()}
            </span>
          </div>
        </header>
        <main id="main-content" className="workspace-main">
          {(storageWarning || saveError) && (
            <div className="storage-alert" role="alert">
              <AlertTriangle size={20} />
              <div>
                <strong>
                  {storageLocked
                    ? "Your previous data is protected."
                    : "Your data needs attention."}
                </strong>
                <p>{storageWarning || saveError}</p>
                <button
                  className="text-link"
                  onClick={() => navigate("settings")}
                >
                  Open backup & recovery <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          )}
          {storageLocked && route.page !== "settings" && (
            <div className="empty-state">
              <AlertTriangle size={28} />
              <h2>Let’s recover your workspace first.</h2>
              <p>
                Editing is paused to protect the original data. Download it from
                Settings, then restore a valid backup or choose to start fresh.
              </p>
              <button
                className="button primary"
                onClick={() => navigate("settings")}
              >
                Open backup & recovery <ArrowUpRight size={16} />
              </button>
            </div>
          )}
          {!storageLocked && route.page === "dashboard" && (
            <Dashboard
              {...studio}
              now={now}
              navigate={navigate}
              onCapture={() => setCapture(true)}
              onFocus={() => setFocus(true)}
            />
          )}
          {!storageLocked && route.page === "roadmap" && (
            <Roadmap
              key={`roadmap${route.day || ""}`}
              {...studio}
              initialDay={route.day}
            />
          )}
          {!storageLocked && route.page === "missions" && (
            <Missions
              key={`missions${route.day || ""}`}
              {...studio}
              initialDay={route.day}
              onFocus={() => setFocus(true)}
            />
          )}
          {!storageLocked &&
            (route.page === "website" || route.page === "workbook") && (
              <ProjectWorkspace
                key={route.page}
                {...studio}
                project={route.page === "website" ? "Website" : "Workbook"}
                openDay={(day) => navigate("missions", day)}
                openNotes={() => navigate("notes")}
              />
            )}
          {!storageLocked && route.page === "notes" && <Notes {...studio} />}
          {route.page === "settings" && (
            <Settings {...studio} storageLocked={storageLocked} />
          )}
        </main>
        <footer className="app-status">
          <span>
            <CloudOff size={13} /> Stored on this browser · No cloud sync
          </span>
          <span>
            {storageLocked || saveError ? (
              <>
                <AlertTriangle size={13} /> Saving needs attention
              </>
            ) : (
              <>
                <Check size={13} /> Auto-saved locally
              </>
            )}
            <span className="status-separator">·</span>
            <ShieldCheck size={13} /> Your personal space
          </span>
        </footer>
      </div>
      {!storageLocked && capture && (
        <QuickCapture {...studio} onClose={() => setCapture(false)} />
      )}
      <Focus
        {...studio}
        open={!storageLocked && focus}
        onClose={() => setFocus(false)}
        onRunning={setRunning}
      />
      {search && (
        <Search
          data={data}
          navigate={navigate}
          onClose={() => setSearch(false)}
        />
      )}
    </>
  );
}
