"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  Check,
  Lock,
  Megaphone,
} from "lucide-react";
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
  /** Fills the button once this side is chosen. */
  cta: string;
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
    cta: "Continue as a worker",
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
    cta: "Continue as a buyer",
  },
];

/**
 * One-time worker/buyer pick — see /setup-role and POST /api/session/role.
 *
 * Nothing is preselected on purpose. The choice cannot be undone without an
 * admin, so it should cost one deliberate tap rather than being something you
 * can land on by pressing Continue without reading.
 */
export function RoleSetup({ name }: { name: string }) {
  const router = useRouter();
  const [role, setRole] = useState<SignupRole | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = CHOICES.find((c) => c.value === role);

  async function confirm() {
    if (!role) return;
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
      <h1 className="text-2xl font-bold tracking-tight text-fg">
        Welcome, {name.split(" ")[0]}
      </h1>
      <p className="mt-1.5 text-sm text-fg-muted">
        Choose how you want to use TaskHub.
      </p>

      {/* The permanence is the one thing on this screen that must not be
          skimmed past, so it gets its own line rather than a clause. */}
      <p className="mt-3 flex items-center gap-2 rounded-lg bg-bg-subtle px-3 py-2 text-xs font-medium text-fg-muted ring-1 ring-inset ring-border">
        <Lock size={13} className="shrink-0" />
        This is permanent — you cannot switch later.
      </p>

      {error && (
        <Alert tone="danger" className="mt-4">
          {error}
        </Alert>
      )}

      <fieldset className="mt-5 space-y-3">
        <legend className="sr-only">How do you want to use TaskHub?</legend>

        {CHOICES.map((c) => {
          const active = c.value === role;
          return (
            <label
              key={c.value}
              className="block cursor-pointer"
              // Radio inputs give this the semantics the old buttons faked:
              // one group, one answer, arrow keys between options.
            >
              <input
                type="radio"
                name="role"
                value={c.value}
                checked={active}
                onChange={() => setRole(c.value)}
                className="peer sr-only"
              />
              <div
                className={cn(
                  "rounded-xl border p-4 transition-all",
                  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring",
                  active
                    ? "border-brand bg-brand-50 ring-1 ring-brand dark:bg-brand-950/50"
                    : "border-border bg-card hover:border-border-strong hover:bg-bg-subtle",
                )}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid size-10 shrink-0 place-items-center rounded-lg transition-colors",
                      active
                        ? "bg-brand text-brand-fg"
                        : "bg-bg-subtle text-fg-muted",
                    )}
                  >
                    <c.icon size={19} />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-fg">
                      {c.label}
                    </span>
                    <span className="block text-xs text-fg-muted">{c.hint}</span>
                  </span>

                  {/* Always visible, so "pick one of these" reads at a glance
                      instead of only after something is selected. */}
                  <span
                    aria-hidden
                    className={cn(
                      "grid size-4.5 shrink-0 place-items-center rounded-full border-2 transition-colors",
                      active ? "border-brand" : "border-border-strong",
                    )}
                  >
                    {active && <span className="size-2 rounded-full bg-brand" />}
                  </span>
                </div>

                <ul
                  className={cn(
                    "mt-3 space-y-1.5 border-t pt-3",
                    active ? "border-brand/20" : "border-border",
                  )}
                >
                  {c.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-2 text-xs leading-snug text-fg-muted"
                    >
                      <Check
                        size={13}
                        className={cn(
                          "mt-0.5 shrink-0",
                          active ? "text-brand" : "text-fg-subtle",
                        )}
                      />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </label>
          );
        })}
      </fieldset>

      <Button
        fullWidth
        size="lg"
        className="mt-5"
        loading={loading}
        disabled={!role}
        iconRight={ArrowRight}
        onClick={confirm}
      >
        {chosen ? chosen.cta : "Select an option"}
      </Button>
    </div>
  );
}
