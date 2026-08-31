"use client";

import { Check, X, Ban, Banknote } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ReviewButtons({
  onApprove,
  onReject,
  onPenalize,
  onMarkPaid,
  loading,
  approveLabel = "Approve",
  compact,
}: {
  onApprove?: () => void;
  onReject?: () => void;
  onPenalize?: () => void;
  onMarkPaid?: () => void;
  loading?: boolean;
  approveLabel?: string;
  compact?: boolean;
}) {
  const size = compact ? "sm" : "sm";
  return (
    <div className="flex flex-wrap gap-2">
      {onApprove && (
        <Button size={size} variant="success" icon={Check} loading={loading} onClick={onApprove}>
          {approveLabel}
        </Button>
      )}
      {onMarkPaid && (
        <Button size={size} icon={Banknote} loading={loading} onClick={onMarkPaid}>
          Mark paid
        </Button>
      )}
      {onReject && (
        <Button
          size={size}
          variant="outline"
          icon={X}
          className="text-danger"
          loading={loading}
          onClick={onReject}
        >
          Reject
        </Button>
      )}
      {onPenalize && (
        <Button
          size={size}
          variant="ghost"
          icon={Ban}
          className="text-danger hover:bg-danger-soft"
          loading={loading}
          onClick={onPenalize}
        >
          Penalize
        </Button>
      )}
    </div>
  );
}
