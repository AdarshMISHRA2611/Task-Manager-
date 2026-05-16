import { useMemo } from "react";
import { useTheme } from "@/services/themeContext";

type Size = "sm" | "md" | "lg" | "xl";

interface AvatarProps {
  name: string;
  size?: Size;
  className?: string;
  ring?: boolean;
}

const SIZE_CLASSES: Record<Size, { box: string; text: string }> = {
  sm: { box: "h-7 w-7", text: "text-[10px]" },
  md: { box: "h-9 w-9", text: "text-xs" },
  lg: { box: "h-12 w-12", text: "text-sm" },
  xl: { box: "h-16 w-16", text: "text-base" },
};

function hashName(name: string): number {
  let h = 5381;
  for (let i = 0; i < name.length; i++) {
    h = ((h << 5) + h + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h) % 360;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.charAt(0).toUpperCase();
  return (parts[0]!.charAt(0) + parts[parts.length - 1]!.charAt(0)).toUpperCase();
}

export function Avatar({ name, size = "md", className = "", ring = true }: AvatarProps) {
  const { resolved } = useTheme();
  const initials = useMemo(() => initialsOf(name), [name]);
  const hue = useMemo(() => hashName(name || "?"), [name]);

  const style =
    resolved === "dark"
      ? {
          backgroundColor: `hsl(${hue} 40% 22%)`,
          color: `hsl(${hue} 85% 85%)`,
          boxShadow: ring ? `inset 0 0 0 1px hsl(${hue} 45% 35%)` : undefined,
        }
      : {
          backgroundColor: `hsl(${hue} 70% 92%)`,
          color: `hsl(${hue} 55% 28%)`,
          boxShadow: ring ? `inset 0 0 0 1px hsl(${hue} 65% 78%)` : undefined,
        };

  const s = SIZE_CLASSES[size];
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold ${s.box} ${s.text} ${className}`}
      style={style}
      title={name}
    >
      {initials}
    </span>
  );
}
