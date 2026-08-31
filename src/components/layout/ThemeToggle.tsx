"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

type Mode = "light" | "dark" | "system";
const KEY = "taskhub.theme";

function apply(mode: Mode) {
  const root = document.documentElement;
  if (mode === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", mode);
}

export function ThemeToggle() {
  const [mode, setMode] = useState<Mode>("system");

  useEffect(() => {
    const saved = (localStorage.getItem(KEY) as Mode) || "system";
    setMode(saved);
    apply(saved);
  }, []);

  const set = (m: Mode) => {
    setMode(m);
    localStorage.setItem(KEY, m);
    apply(m);
  };

  const opts: [Mode, typeof Sun][] = [
    ["light", Sun],
    ["system", Monitor],
    ["dark", Moon],
  ];

  return (
    <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-card p-0.5">
      {opts.map(([m, Icon]) => (
        <button
          key={m}
          onClick={() => set(m)}
          aria-label={`${m} theme`}
          aria-pressed={mode === m}
          className={cn(
            "rounded-md p-1.5 transition-colors",
            mode === m
              ? "bg-bg-subtle text-fg"
              : "text-fg-subtle hover:text-fg",
          )}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}
