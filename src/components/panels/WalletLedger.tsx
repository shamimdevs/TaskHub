import {
  ArrowDownLeft,
  ArrowUpRight,
  type LucideIcon,
  Gift,
  Megaphone,
  ShieldAlert,
  Wallet as WalletIcon,
} from "lucide-react";
import type { WalletTransaction } from "@/types";
import { TXN_LABELS } from "@/lib/constants";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";

const ICONS: Record<string, LucideIcon> = {
  deposit: ArrowDownLeft,
  campaign_spend: Megaphone,
  task_reward: WalletIcon,
  withdrawal: ArrowUpRight,
  withdrawal_fee: ArrowUpRight,
  referral_bonus: Gift,
  penalty: ShieldAlert,
  adjustment: WalletIcon,
};

export function WalletLedger({ rows }: { rows: WalletTransaction[] }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((tx) => {
        const Icon = ICONS[tx.type] ?? WalletIcon;
        const credit = tx.direction === "credit";
        return (
          <li key={tx.id} className="flex items-center gap-3 py-3">
            <span
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                credit ? "bg-success-soft text-success" : "bg-bg-subtle text-fg-muted"
              }`}
            >
              <Icon size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-fg">
                {TXN_LABELS[tx.type]}
              </p>
              <p className="truncate text-xs text-fg-muted">
                {tx.description} · {formatDateTime(tx.createdAt)}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p
                className={`text-sm font-semibold tabular-nums ${
                  credit ? "text-success" : "text-fg"
                }`}
              >
                {formatMoney(credit ? tx.amount : -tx.amount, { sign: true })}
              </p>
              {tx.status !== "completed" && (
                <Badge tone={tx.status === "pending" ? "warning" : "danger"} className="mt-0.5">
                  {tx.status}
                </Badge>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
