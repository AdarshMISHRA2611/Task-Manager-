import { useEffect, useId, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Check, ChevronDown, Search } from "lucide-react";
import { useClickOutside } from "./hooks";

export interface SelectOption<V extends string | number = string> {
  value: V;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface SelectProps<V extends string | number = string> {
  value: V | "";
  onChange: (value: V) => void;
  options: SelectOption<V>[];
  placeholder?: string;
  searchable?: boolean;
  disabled?: boolean;
  size?: "sm" | "md";
  className?: string;
  emptyText?: string;
  id?: string;
}

export function Select<V extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Select…",
  searchable = false,
  disabled = false,
  size = "md",
  className,
  emptyText = "No matches",
  id,
}: SelectProps<V>) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useClickOutside<HTMLDivElement>(open, () => setOpen(false));

  const filtered = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || (o.description ?? "").toLowerCase().includes(q)
    );
  }, [options, query, searchable]);

  const selected = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const idx = filtered.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
    if (searchable) {
      requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  }, [open, filtered, value, searchable]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${activeIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function pick(opt: SelectOption<V>) {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(filtered.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Home") {
      e.preventDefault();
      setActiveIndex(0);
      return;
    }
    if (e.key === "End") {
      e.preventDefault();
      setActiveIndex(filtered.length - 1);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[activeIndex];
      if (opt) pick(opt);
    }
  }

  return (
    <div ref={containerRef} className={clsx("relative", className)}>
      <button
        id={selectId}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={onKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={clsx(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-border-strong bg-input text-left text-sm text-foreground transition focus-ring",
          size === "sm" ? "px-2.5 py-1.5" : "px-3 py-2.5",
          disabled ? "cursor-not-allowed opacity-60" : "hover:border-border-strong"
        )}
      >
        <span className={clsx("flex min-w-0 flex-col", !selected && "text-subtle")}>
          <span className="truncate">{selected?.label ?? placeholder}</span>
          {selected?.description && (
            <span className="truncate text-[11px] text-muted-foreground">{selected.description}</span>
          )}
        </span>
        <ChevronDown className={clsx("h-4 w-4 shrink-0 text-muted-foreground transition", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute left-0 right-0 z-50 mt-2 origin-top overflow-hidden rounded-lg bg-surface shadow-lg ring-1 ring-border animate-fade-in"
        >
          {searchable && (
            <div className="flex items-center gap-2 border-b border-border bg-surface-muted px-3 py-2">
              <Search className="h-4 w-4 text-subtle" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search…"
                className="w-full bg-transparent text-sm text-foreground placeholder:text-subtle focus:outline-none"
              />
            </div>
          )}
          <div
            ref={listRef}
            role="listbox"
            className="max-h-64 overflow-y-auto py-1"
          >
            {filtered.length === 0 ? (
              <p className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</p>
            ) : (
              filtered.map((opt, idx) => {
                const isSelected = opt.value === value;
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={`${opt.value}`}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    data-idx={idx}
                    disabled={opt.disabled}
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={() => pick(opt)}
                    className={clsx(
                      "flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition",
                      opt.disabled
                        ? "cursor-not-allowed text-subtle"
                        : isSelected
                        ? "bg-brand-subtle text-brand-subtle-foreground"
                        : isActive
                        ? "bg-surface-muted text-foreground"
                        : "text-foreground hover:bg-surface-muted",
                      isSelected && "font-semibold"
                    )}
                  >
                    <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center">
                      {isSelected ? <Check className="h-3.5 w-3.5 text-brand" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="block truncate text-[11px] text-muted-foreground">{opt.description}</span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
