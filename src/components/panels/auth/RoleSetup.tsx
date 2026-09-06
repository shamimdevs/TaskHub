"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BadgeDollarSign, Check, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Misc";
import { authClient } from "@/lib/auth-client";
import { roleHome } from "@/lib/roles";
import { t } from "@/lib/i18n/en";
import { cn } from "@/lib/utils";

type SignupRole = "worker" | "buyer";

const CHOICES: {
  value: SignupRole;
  icon: typeof BadgeDollarSign;
  label: string;
  hint: string;
  points: string[];
}[] = [
  {
    value: "worker",
    icon: BadgeDollarSign,
    label: t.auth.roleWorker,
    hint: t.auth.roleWorkerHint,
    points: [
      "Complete simple tasks on your own accounts",
      "Get paid per verified action",
      "Cash out to bKash / Nagad",
    ],
  },
  {
    value: "buyer",
    icon: Megaphone,
    label: t.auth.roleBuyer,
    hint: t.auth.roleBuyerHint,
    points: [
      "Run campaigns on Facebook, YouTube, TikTok and more",
      "Real people, no bots",
      "Pay only for verified actions",
    ],
  },
];

/** One-time worker/buyer pick — see /setup-role and POST /api/session/role. */
export function RoleSetup({ name }: { name: string }) {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole>("worker");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/session/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(body?.error ?? "Could not save your choice. Try again.");
        return;
      }
      // The session cookie caches the old role for a few minutes; re-read it
      // so the redirect below lands on the right dashboard straight away.
      await authClient.getSession({ query: { disableCookieCache: true } });
      router.replace(roleHome(role));
      router.refresh();
    } catch {
      setError("Could not save your choice. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-fg">Welcome, {name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-fg-muted">
        How do you want to use TaskHub? You can only pick this once.
      </p>

      {error && (
        <Alert tone="danger" className="mt-5">
          {error}
        </Alert>
      )}

      <div className="mt-6 space-y-3">
        {CHOICES.map((c) => {
          const active = c.value === role;
          return (
            <button
              key={c.value}
              type="button"
              onClick={() => setRole(c.value)}
              aria-pressed={active}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                active
                  ? "border-brand bg-brand-50 dark:bg-brand-950"
                  : "border-border bg-card hover:bg-bg-subtle",
              )}
            >
              <div className="flex items-start gap-3">
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-lg",
                    active
                      ? "bg-brand text-brand-fg"
                      : "bg-bg-subtle text-fg-muted",
                  )}
                >
                  <c.icon size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-fg">{c.label}</p>
                  <p className="text-xs text-fg-muted">{c.hint}</p>
                </div>
                {active && <Check size={18} className="mt-1 shrink-0 text-brand" />}
              </div>
              <ul className="mt-3 space-y-1 pl-12 text-xs text-fg-muted">
                {c.points.map((p) => (
                  <li key={p} className="list-disc">
                    {p}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      <Button
        fullWidth
        size="lg"
        className="mt-6"
        loading={loading}
        iconRight={ArrowRight}
        onClick={confirm}
      >
        Continue as {role === "worker" ? "a worker" : "a buyer"}
      </Button>
    </div>
  );
}
