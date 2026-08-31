import { forwardRef } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger" | "success";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand text-brand-fg hover:bg-brand-600 active:bg-brand-700 shadow-soft",
  secondary:
    "bg-fg text-bg hover:opacity-90 active:opacity-80",
  outline:
    "border border-border-strong bg-card text-fg hover:bg-bg-subtle",
  ghost: "text-fg hover:bg-bg-subtle",
  danger: "bg-danger text-white hover:brightness-95 active:brightness-90",
  success: "bg-success text-white hover:brightness-95 active:brightness-90",
};

const SIZES: Record<Size, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-md",
  md: "h-11 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-lg",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  children?: React.ReactNode;
}

const base =
  "inline-flex select-none items-center justify-center font-semibold transition-[background,opacity,filter,box-shadow] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

type ButtonProps = CommonProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof CommonProps>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", icon: Icon, iconRight: IconRight, loading, fullWidth, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(base, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...props}
    >
      {loading ? (
        <Loader2 size={size === "sm" ? 15 : 17} className="animate-spin" />
      ) : (
        Icon && <Icon size={size === "sm" ? 15 : 17} />
      )}
      {children}
      {IconRight && !loading && <IconRight size={size === "sm" ? 15 : 17} />}
    </button>
  );
});

type LinkButtonProps = CommonProps &
  Omit<React.ComponentProps<typeof Link>, "className">;

export function LinkButton({
  variant = "primary",
  size = "md",
  icon: Icon,
  iconRight: IconRight,
  fullWidth,
  className,
  children,
  ...props
}: LinkButtonProps) {
  return (
    <Link
      className={cn(base, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className)}
      {...props}
    >
      {Icon && <Icon size={size === "sm" ? 15 : 17} />}
      {children}
      {IconRight && <IconRight size={size === "sm" ? 15 : 17} />}
    </Link>
  );
}
