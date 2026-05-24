"use client";

import { Component, ReactNode } from "react";
import { ErrorBox } from "@/components/app/ui";

interface Props {
  /** Page name shown in the error so the user can tell us which screen crashed. */
  name: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Wraps a /app or /me page so a render-time exception shows a useful
 * message + Reload action instead of Next.js's generic
 * "Application error: client-side exception" overlay.
 *
 * The Next default hides the error message in production builds; this
 * surfaces it so users can copy it to support and we can debug.
 */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error) {
    if (typeof window !== "undefined") {
      console.error(`[${this.props.name}] render error`, error);
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-2xl px-6 py-10">
          <ErrorBox
            message={`Something went wrong on the ${this.props.name} page: ${this.state.error.message}`}
            onRetry={() => {
              if (typeof window !== "undefined") window.location.reload();
            }}
          />
        </div>
      );
    }
    return this.props.children;
  }
}
