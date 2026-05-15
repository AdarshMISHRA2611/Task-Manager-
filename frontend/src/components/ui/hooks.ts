import { useEffect, useRef } from "react";

export function useClickOutside<T extends HTMLElement>(
  active: boolean,
  onOutside: () => void
) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!active) return;
    function handle(e: MouseEvent | TouchEvent) {
      const el = ref.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        onOutside();
      }
    }
    document.addEventListener("mousedown", handle);
    document.addEventListener("touchstart", handle);
    return () => {
      document.removeEventListener("mousedown", handle);
      document.removeEventListener("touchstart", handle);
    };
  }, [active, onOutside]);
  return ref;
}

export function useKey(
  key: string | string[],
  handler: (e: KeyboardEvent) => void,
  active: boolean = true
) {
  useEffect(() => {
    if (!active) return;
    const keys = Array.isArray(key) ? key : [key];
    function onKey(e: KeyboardEvent) {
      if (keys.includes(e.key)) handler(e);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [key, handler, active]);
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}
