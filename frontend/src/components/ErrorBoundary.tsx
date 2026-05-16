import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, message: err.message };
  }

  componentDidCatch(err: Error, info: ErrorInfo) {
    console.error("UI error:", err, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive-subtle text-destructive ring-1 ring-destructive-subtle-border">
            <AlertTriangle className="h-7 w-7" aria-hidden />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {this.state.message || "An unexpected error occurred. Try refreshing the page."}
            </p>
          </div>
          <button
            type="button"
            className="rounded-lg bg-surface px-4 py-2 text-sm font-medium text-foreground border border-border-strong transition hover:bg-surface-muted hover:border-border-strong focus-ring"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
