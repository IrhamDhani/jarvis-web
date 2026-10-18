import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <main className="error-screen">
          <div className="card stack">
            <AlertTriangle size={28} />
            <h1>A moment to regroup.</h1>
            <p>
              The workspace couldn’t open. Refresh to try again. Your saved
              browser data has not been reset.
            </p>
            <button
              className="button primary"
              onClick={() => window.location.reload()}
            >
              <RotateCcw size={16} /> Refresh Studio
            </button>
          </div>
        </main>
      );
    return this.props.children;
  }
}
