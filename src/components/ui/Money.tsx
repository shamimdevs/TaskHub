import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/utils";

export function Money({
  amount,
  sign,
  className,
  colorBySign,
}: {
  amount: number;
  sign?: boolean;
  className?: string;
  colorBySign?: boolean;
}) {
  return (
    <span
      className={cn(
        "tabular-nums",
        colorBySign && amount > 0 && "text-success",
        colorBySign && amount < 0 && "text-danger",
        className,
      )}
    >
      {formatMoney(amount, { sign })}
    </span>
  );
}
