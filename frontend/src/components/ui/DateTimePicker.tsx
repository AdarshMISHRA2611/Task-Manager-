import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, X } from "lucide-react";

export interface DateTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  disablePast?: boolean;
  className?: string;
  id?: string;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function pad(n: number) {
  return n.toString().padStart(2, "0");
}

function formatLocalIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseLocalIso(s: string): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(s);
  if (!m) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4]), Number(m[5]));
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function displayDate(d: Date): string {
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

interface StepperProps {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
}

function Stepper({ value, onChange, min, max, step = 1, label }: StepperProps) {
  const wrap = (n: number) => {
    if (n > max) return min;
    if (n < min) return max;
    return n;
  };
  const stepClamped = (n: number) => {
    if (step <= 1) return n;
    return Math.round(n / step) * step;
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="flex flex-col items-center overflow-hidden rounded-lg border border-slate-300 bg-white">
        <button
          type="button"
          onClick={() => onChange(wrap(stepClamped(value + step)))}
          className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-ring"
          aria-label={`Increase ${label}`}
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <input
          inputMode="numeric"
          className="w-12 bg-transparent py-1 text-center text-sm font-semibold text-slate-900 focus:outline-none"
          value={pad(value)}
          onChange={(e) => {
            const n = parseInt(e.target.value.replace(/\D/g, ""), 10);
            if (Number.isFinite(n)) {
              const clamped = Math.min(max, Math.max(min, n));
              onChange(stepClamped(clamped));
            } else {
              onChange(min);
            }
          }}
        />
        <button
          type="button"
          onClick={() => onChange(wrap(stepClamped(value - step)))}
          className="px-2 py-0.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-ring"
          aria-label={`Decrease ${label}`}
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  disabled,
  disablePast = true,
  className,
  id,
}: DateTimePickerProps) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseLocalIso(value), [value]);
  const today = useMemo(() => startOfDay(new Date()), []);
  const [view, setView] = useState<Date>(() => {
    const base = parsed ?? new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const [hour, setHour] = useState<number>(parsed ? parsed.getHours() : 9);
  const [minute, setMinute] = useState<number>(parsed ? parsed.getMinutes() : 0);
  const [coords, setCoords] = useState<{ top: number; left: number; width: number; placement: "down" | "up" } | null>(
    null
  );

  useEffect(() => {
    if (parsed) {
      setHour(parsed.getHours());
      setMinute(parsed.getMinutes());
      setView(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    }
  }, [parsed]);

  useLayoutEffect(() => {
    if (!open) return;
    function reposition() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const popover = popoverRef.current;
      const popH = popover?.offsetHeight ?? 380;
      const popW = Math.max(320, rect.width);
      const spaceBelow = window.innerHeight - rect.bottom;
      const placement: "down" | "up" = spaceBelow < popH + 8 && rect.top > popH + 8 ? "up" : "down";
      const top = placement === "down" ? rect.bottom + 8 : rect.top - popH - 8;
      const left = Math.max(8, Math.min(window.innerWidth - popW - 8, rect.left));
      setCoords({ top, left, width: popW, placement });
    }
    reposition();
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent | TouchEvent) {
      const t = e.target as Node | null;
      if (!t) return;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const cells = useMemo(() => {
    const first = new Date(view.getFullYear(), view.getMonth(), 1);
    const startWeekday = first.getDay();
    const start = new Date(first);
    start.setDate(first.getDate() - startWeekday);
    const arr: Date[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [view]);

  function pickDay(d: Date) {
    const isPast = disablePast && startOfDay(d) < today;
    if (isPast) return;
    const next = new Date(d.getFullYear(), d.getMonth(), d.getDate(), hour, minute);
    onChange(formatLocalIso(next));
  }

  function setNow() {
    const now = new Date();
    setHour(now.getHours());
    setMinute(now.getMinutes() - (now.getMinutes() % 5));
    setView(new Date(now.getFullYear(), now.getMonth(), 1));
    onChange(formatLocalIso(new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() - (now.getMinutes() % 5))));
  }

  function applyTime(nextHour: number, nextMinute: number) {
    setHour(nextHour);
    setMinute(nextMinute);
    if (parsed) {
      const next = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate(), nextHour, nextMinute);
      onChange(formatLocalIso(next));
    }
  }

  const trigger = (
    <button
      ref={triggerRef}
      id={id}
      type="button"
      disabled={disabled}
      onClick={() => !disabled && setOpen((o) => !o)}
      className={clsx(
        "flex w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-left text-sm transition focus-ring",
        disabled ? "cursor-not-allowed opacity-60" : "hover:border-slate-400",
        className
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Calendar className="h-4 w-4 shrink-0 text-slate-500" />
        <span className={clsx("truncate", !parsed && "text-slate-400", parsed && "text-slate-900")}>
          {parsed ? displayDate(parsed) : placeholder}
        </span>
      </span>
      <span className="flex items-center gap-1">
        {parsed && !disabled && (
          <span
            role="button"
            tabIndex={0}
            aria-label="Clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }
            }}
            className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-ring"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronDown className={clsx("h-4 w-4 shrink-0 text-slate-500 transition", open && "rotate-180")} />
      </span>
    </button>
  );

  const popover =
    open && coords
      ? createPortal(
          <div
            ref={popoverRef}
            style={{ top: coords.top, left: coords.left, width: coords.width }}
            className="fixed z-[110] rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-slate-200 animate-fade-in"
          >
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() - 1, 1))}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-ring"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-slate-900">
                {view.toLocaleString(undefined, { month: "long", year: "numeric" })}
              </p>
              <button
                type="button"
                onClick={() => setView((v) => new Date(v.getFullYear(), v.getMonth() + 1, 1))}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 focus-ring"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-slate-500">
              {WEEKDAYS.map((d, i) => (
                <span key={`${d}-${i}`}>{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((d) => {
                const inMonth = d.getMonth() === view.getMonth();
                const isToday = isSameDay(d, new Date());
                const isSelected = parsed ? isSameDay(d, parsed) : false;
                const isPast = disablePast && startOfDay(d) < today;
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    disabled={isPast}
                    onClick={() => pickDay(d)}
                    className={clsx(
                      "h-9 rounded-lg text-sm transition focus-ring",
                      !inMonth && !isPast && "text-slate-300",
                      inMonth && !isSelected && !isPast && "text-slate-700 hover:bg-slate-100",
                      isToday && !isSelected && "ring-1 ring-brand-400",
                      isSelected && "bg-brand-600 text-white shadow-glow",
                      isPast && "cursor-not-allowed text-slate-300"
                    )}
                  >
                    {d.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex items-end justify-between gap-3">
              <div className="flex items-end gap-2">
                <Stepper value={hour} min={0} max={23} step={1} label="Hour" onChange={(n) => applyTime(n, minute)} />
                <span className="pb-2 text-lg font-semibold text-slate-400">:</span>
                <Stepper value={minute} min={0} max={59} step={5} label="Min" onChange={(n) => applyTime(hour, n)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={setNow}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 focus-ring"
                >
                  Now
                </button>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 focus-ring"
                >
                  Done
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      {trigger}
      {popover}
    </>
  );
}
