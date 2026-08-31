import { cn } from "@/lib/utils";

export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-soft",
        interactive &&
          "cursor-pointer transition-[transform,box-shadow,border-color] duration-200 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-card focus-visible:-translate-y-0.5 focus-visible:shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5 sm:py-4",
        className,
      )}
    >
      <div className="min-w-0">
        <h3 className="truncate text-sm font-semibold tracking-tight text-fg sm:text-[0.95rem]">
          {title}
        </h3>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-fg-muted sm:text-sm">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 sm:p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 border-t border-border bg-card-muted px-4 py-3.5 sm:px-5 sm:py-4",
        className,
      )}
      {...props}
    />
  );
}
