import { forwardRef } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: LucideIcon;
  label: string;
  size?: "sm" | "md";
  variant?: "ghost" | "outline" | "solid";
}

const V = {
  ghost: "text-fg-muted hover:bg-bg-subtle hover:text-fg",
  outline: "border border-border-strong bg-card text-fg hover:bg-bg-subtle",
  solid: "bg-brand text-brand-fg hover:bg-brand-600",
};

export const IconButton = forwardRef<HTMLButtonElement, Props>(function IconButton(
  { icon: Icon, label, size = "md", variant = "ghost", className, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50",
        size === "sm" ? "h-8 w-8" : "h-10 w-10",
        V[variant],
        className,
      )}
      {...props}
    >
      <Icon size={size === "sm" ? 16 : 18} />
    </button>
  );
});
