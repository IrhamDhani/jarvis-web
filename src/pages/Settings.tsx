import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Download,
  Upload,
  ShieldCheck,
  HardDrive,
  RotateCcw,
  Check,
} from "lucide-react";
import { Modal, PageHeading } from "../components/ui";
import { parseBackup, STORAGE_KEY } from "../lib/storage";
import { localDate } from "../lib/model";
import type { PageProps, StudioData } from "../types";

export function Settings({
  data,
  actions,
  storageLocked = false,
}: PageProps & { storageLocked?: boolean }) {
  const [name, setName] = useState(data.settings.name);
  const [startDate, setStartDate] = useState(data.settings.startDate);
  const [focusMinutes, setFocusMinutes] = useState(
    String(data.settings.focusMinutes),
  );
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pendingBackup, setPendingBackup] = useState<StudioData | null>(null);
  const [backupName, setBackupName] = useState("");
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(data.settings.name);
    setStartDate(data.settings.startDate);
    setFocusMinutes(String(data.settings.focusMinutes));
  }, [data.settings.name, data.settings.startDate, data.settings.focusMinutes]);

  function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const minutes = Number(focusMinutes);
    if (
      !name.trim() ||
      !startDate ||
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > 180
    ) {
      setError(
        "Enter your name, a project start date, and a whole focus duration from 1 to 180 minutes.",
      );
      return;
    }
    try {
      actions.updateSettings({
        name: name.trim(),
        startDate,
        focusMinutes: minutes,
      });
      setNotice(
        "Settings saved. Your roadmap dates follow your project start date.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Your settings could not be saved. Please try again.",
      );
    }
  }

  function exportOriginal() {
    try {
      const original = window.localStorage.getItem(STORAGE_KEY);
      if (original === null)
        throw new Error("No stored data was found to download.");
      const url = URL.createObjectURL(
        new Blob([original], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = `irham-studio-original-${localDate()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice(
        "Original data download requested. Keep this recovery file before importing or resetting.",
      );
    } catch {
      setError(
        "The original data could not be read. Browser storage may be unavailable. Try enabling site storage or opening the original browser profile.",
      );
    }
  }

  function exportBackup() {
    setError("");
    setNotice("");
    let url: string | undefined;
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `irham-studio-backup-${localDate()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setNotice(
        "Backup download requested. Keep the JSON file somewhere safe.",
      );
    } catch {
      setError(
        "The backup could not be downloaded. Please try again in this browser.",
      );
    } finally {
      if (url) window.setTimeout(() => URL.revokeObjectURL(url!), 1000);
    }
  }

  async function readBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError("");
    setNotice("");
    setPendingBackup(null);
    try {
      const backup = parseBackup(await file.text());
      setPendingBackup(backup);
      setBackupName(file.name);
    } catch (cause) {
      const reason =
        cause instanceof Error
          ? cause.message
          : "The file is not a valid Studio backup.";
      setError(
        `Import rejected: ${reason} Your current data has been preserved.`,
      );
    }
  }

  function importBackup() {
    if (!pendingBackup) return;
    const approved = window.confirm(
      `Replace all current Studio data with “${backupName}”? This imports ${pendingBackup.tasks.length} tasks, ${pendingBackup.milestones.length} roadmap days, ${pendingBackup.captures.length} captures, ${Object.keys(pendingBackup.reviews).length} reviews, and ${pendingBackup.focusSessions.length} focus sessions. Export your current data first if you want to keep it.`,
    );
    if (!approved) return;
    try {
      actions.replaceData(pendingBackup);
      setPendingBackup(null);
      setError("");
      setNotice(
        "Backup imported successfully. Your Studio now uses the restored data.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "The backup could not be imported. Your current data has been preserved.",
      );
    }
  }

  function resetStudio() {
    if (resetText !== "RESET") return;
    try {
      actions.resetData();
      setResetOpen(false);
      setResetText("");
      setPendingBackup(null);
      setError("");
      setNotice("Studio reset to the original 30-day plan.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Studio could not be reset. Please try again.",
      );
    }
  }

  return (
    <div className="page-content">
      <PageHeading
        eyebrow="MAKE IT YOURS"
        title="Studio settings"
        description="Your name, your rhythm, your next 30 days."
      />
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert success" role="status">
          <Check size={17} aria-hidden="true" /> {notice}
        </div>
      )}
      {storageLocked && (
        <div className="alert error recovery-panel">
          <div>
            <strong>
              Editing is paused. Your original data has been preserved.
            </strong>
            <p>
              Download the original before restoring a valid backup or
              resetting. The recovery file may need repair or a compatible app
              version.
            </p>
            <button className="button secondary" onClick={exportOriginal}>
              Download original stored data
            </button>
          </div>
        </div>
      )}
      <div className="settings-grid">
        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Your workspace</h2>
              <p className="muted">Set the pace for your execution system.</p>
            </div>
          </div>
          <form onSubmit={saveSettings}>
            <fieldset
              disabled={storageLocked}
              className="stack settings-fieldset"
            >
              <label className="field" htmlFor="settings-name">
                Your name
                <input
                  id="settings-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  maxLength={100}
                  autoComplete="given-name"
                />
              </label>
              <label className="field" htmlFor="settings-start-date">
                Project start date
                <input
                  id="settings-start-date"
                  type="date"
                  min="1900-01-01"
                  max="2199-12-01"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  required
                />
                <span className="muted">
                  Changing this date shifts roadmap dates and task deadlines by
                  the same number of days.
                </span>
              </label>
              <label className="field" htmlFor="settings-focus-minutes">
                Default focus duration (minutes)
                <input
                  id="settings-focus-minutes"
                  type="number"
                  min="1"
                  max="180"
                  step="1"
                  value={focusMinutes}
                  onChange={(event) => setFocusMinutes(event.target.value)}
                  required
                />
                <span className="muted">
                  Applies when you start a new focus session.
                </span>
              </label>
              <div className="form-actions">
                <button type="submit" className="button primary">
                  Save settings
                </button>
              </div>
            </fieldset>
          </form>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h2>
                <HardDrive size={19} aria-hidden="true" /> Your data, close by
              </h2>
              <p className="muted">Stored in this browser, on this device.</p>
            </div>
          </div>
          <div className="stack">
            <p>
              Studio saves your progress locally. There is no account, cloud
              sync, or automatic backup. A different browser or device starts
              with its own workspace.
            </p>
            <p className="muted">
              Clearing site data or using private browsing can remove your
              progress. Export a JSON backup regularly and before moving
              devices.
            </p>
            <div className="row">
              <button
                type="button"
                className="button primary"
                onClick={exportBackup}
                disabled={storageLocked}
              >
                <Download size={16} aria-hidden="true" /> Export JSON backup
              </button>
              <button
                type="button"
                className="button secondary"
                onClick={() => importInput.current?.click()}
              >
                <Upload size={16} aria-hidden="true" /> Import backup
              </button>
            </div>
            <input
              ref={importInput}
              type="file"
              accept=".json,application/json"
              onChange={readBackup}
              aria-label="Choose a Studio JSON backup"
              className="visually-hidden"
            />
            {pendingBackup && (
              <div className="import-preview stack" aria-live="polite">
                <h3>Review your backup</h3>
                <p>
                  <strong>{backupName}</strong> · version{" "}
                  {pendingBackup.version}
                </p>
                <p>
                  Workspace for {pendingBackup.settings.name}, starting{" "}
                  {pendingBackup.settings.startDate}.
                </p>
                <ul>
                  <li>
                    {pendingBackup.tasks.length} tasks and{" "}
                    {pendingBackup.milestones.length} roadmap days
                  </li>
                  <li>
                    {pendingBackup.captures.length} captures and{" "}
                    {Object.keys(pendingBackup.reviews).length} daily reviews
                  </li>
                  <li>{pendingBackup.focusSessions.length} focus sessions</li>
                </ul>
                <p className="muted">
                  Import replaces your current workspace. You will be asked to
                  confirm before anything changes.
                </p>
                <div className="row">
                  <button
                    type="button"
                    className="button primary"
                    onClick={importBackup}
                  >
                    Replace with this backup
                  </button>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => setPendingBackup(null)}
                  >
                    Cancel import
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <div className="section-heading">
            <h2>
              <ShieldCheck size={19} aria-hidden="true" /> About this workspace
            </h2>
          </div>
          <div className="stack">
            <p>
              <strong>IRHAM STUDIO · Version 1</strong>
            </p>
            <p className="muted">
              A personal command center for focused execution. Backups use the
              version 1 JSON format.
            </p>
            <p className="muted">
              Netlify hosts the app; your Studio records stay in your browser.
              Deploying the app does not upload your tasks, notes, reviews, or
              backup files.
            </p>
          </div>
        </section>

        <section className="card danger-panel">
          <div className="section-heading">
            <div>
              <h2>Start fresh</h2>
              <p className="muted">
                Restore the original plan and clear your recorded progress.
              </p>
            </div>
          </div>
          <p>
            Reset removes custom tasks, captures, reviews, and focus sessions
            from this workspace. Export a backup first if you want to keep them.
          </p>
          <button
            type="button"
            className="button secondary danger"
            onClick={() => {
              setResetText("");
              setResetOpen(true);
            }}
          >
            <RotateCcw size={16} aria-hidden="true" /> Reset Studio…
          </button>
        </section>
      </div>
      {resetOpen && (
        <Modal title="Reset your Studio?" onClose={() => setResetOpen(false)}>
          <div className="stack">
            <p>
              This permanently replaces your current workspace with the original
              30-day plan. Your custom records and recorded progress will be
              removed from this browser.
            </p>
            <p>
              Export a backup before continuing if you want to restore this data
              later.
            </p>
            <label className="field" htmlFor="reset-confirmation">
              Type RESET to confirm
              <input
                id="reset-confirmation"
                autoComplete="off"
                value={resetText}
                onChange={(event) => setResetText(event.target.value)}
                placeholder="RESET"
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="button ghost"
                onClick={() => setResetOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button primary danger"
                disabled={resetText !== "RESET"}
                onClick={resetStudio}
              >
                Reset all Studio data
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export default Settings;
