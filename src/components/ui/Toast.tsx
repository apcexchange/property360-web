"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  ReactNode,
} from "react";
import { Check, X, AlertCircle, Info } from "lucide-react";

type ToastTone = "success" | "error" | "info";

interface ToastInput {
  title: string;
  body?: string;
  durationMs?: number;
}

interface Toast extends ToastInput {
  id: number;
  tone: ToastTone;
}

interface ToastContextValue {
  success: (input: string | ToastInput) => void;
  error: (input: string | ToastInput) => void;
  info: (input: string | ToastInput) => void;
  dismiss: (id: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, input: string | ToastInput) => {
      const data =
        typeof input === "string" ? { title: input } : input;
      const id = ++counter.current;
      const toast: Toast = { id, tone, ...data };
      setToasts((prev) => [...prev, toast]);
      const duration = data.durationMs ?? DEFAULT_DURATION;
      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss]
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (i) => push("success", i),
      error: (i) => push("error", i),
      info: (i) => push("info", i),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

function ToastViewport({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="pointer-events-none fixed top-4 right-4 z-[60] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2 sm:top-6 sm:right-6"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={() => onDismiss(t.id)} />
      ))}
    </div>
  );
}

const TONE_STYLES: Record<
  ToastTone,
  { ring: string; iconBg: string; iconColor: string; icon: typeof Check }
> = {
  success: {
    ring: "ring-emerald-200",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    icon: Check,
  },
  error: {
    ring: "ring-red-200",
    iconBg: "bg-red-100",
    iconColor: "text-red-700",
    icon: AlertCircle,
  },
  info: {
    ring: "ring-cryola-300",
    iconBg: "bg-cryola-200",
    iconColor: "text-foundation-700",
    icon: Info,
  },
};

function ToastCard({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  const tone = TONE_STYLES[toast.tone];
  const Icon = tone.icon;

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-start gap-3 rounded-2xl bg-paper px-4 py-3 shadow-[0_18px_42px_-24px_rgb(15_39_44_/_0.4)] ring-1 ${tone.ring} transition-all duration-200 ease-out ${
        mounted
          ? "translate-x-0 opacity-100"
          : "translate-x-4 opacity-0"
      }`}
    >
      <span
        className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${tone.iconBg} ${tone.iconColor}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-foundation-700">
          {toast.title}
        </p>
        {toast.body && (
          <p className="mt-0.5 text-[12.5px] leading-[1.5] text-ink-muted">
            {toast.body}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-ink-muted transition hover:bg-foundation-700/5 hover:text-foundation-700"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
