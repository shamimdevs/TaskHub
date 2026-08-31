import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Mail, MapPin, MessageCircleQuestion, Phone } from "lucide-react";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { ContactForm } from "@/components/marketing/ContactForm";
import { APP_NAME, PAYMENT_METHODS, SUPPORT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact",
  description: `Get in touch with the ${APP_NAME} team.`,
};

const depositMethods = Object.values(PAYMENT_METHODS)
  .filter((m) => m.label !== "Manual")
  .map((m) => m.label)
  .join(" / ");

const CHANNELS = [
  {
    icon: Mail,
    label: "Email",
    value: SUPPORT.email,
    href: `mailto:${SUPPORT.email}`,
  },
  {
    icon: Phone,
    label: "Phone / WhatsApp",
    value: SUPPORT.phone,
    href: `tel:${SUPPORT.phone.replace(/\s/g, "")}`,
  },
  { icon: Clock, label: "Support hours", value: SUPPORT.hours },
  { icon: MapPin, label: "Based in", value: SUPPORT.address },
];

export default function ContactPage() {
  return (
    <MarketingShell>
      <p className="text-xs font-semibold uppercase tracking-wide text-brand">
        Contact
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
        Get in touch
      </h1>
      <p className="mt-4 text-base leading-relaxed text-fg-muted">
        Questions about earning, campaigns, deposits or withdrawals? Send us a
        message and the {APP_NAME} team will get back to you{" "}
        {SUPPORT.responseTime}.
      </p>

      {/* Channels */}
      <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CHANNELS.map((c) => {
          const inner = (
            <>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/15">
                <c.icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-fg-muted">{c.label}</span>
                <span className="block truncate text-sm font-medium text-fg">
                  {c.value}
                </span>
              </span>
            </>
          );
          return c.href ? (
            <a
              key={c.label}
              href={c.href}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft transition-colors hover:border-brand-200"
            >
              {inner}
            </a>
          ) : (
            <div
              key={c.label}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              {inner}
            </div>
          );
        })}
      </div>

      {/* Form */}
      <div className="mt-10">
        <h2 className="text-lg font-bold tracking-tight text-fg">
          Send us a message
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Fields marked with <span className="text-danger">*</span> are required.
        </p>
        <div className="mt-4">
          <ContactForm />
        </div>
      </div>

      {/* Helpful pointers */}
      <div className="mt-10 rounded-2xl border border-border bg-card-muted p-5 sm:p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <MessageCircleQuestion size={16} className="text-brand" />
          Before you write
        </h2>
        <ul className="prose-terms mt-3 space-y-2 text-sm leading-relaxed text-fg-muted">
          <li>
            Many answers are already on the{" "}
            <Link href="/#faq">FAQ</Link> and in the{" "}
            <Link href="/terms">Terms &amp; Conditions</Link>.
          </li>
          <li>
            <strong>Deposit not showing?</strong> Deposits are credited after an
            admin verifies your {depositMethods} Transaction ID (TrxID). Include
            the exact TrxID and amount in your message.
          </li>
          <li>
            <strong>Withdrawal question?</strong> Tell us the request date and the
            account number you withdrew to &mdash; never share your password or
            OTP.
          </li>
          <li>
            <strong>Task rejected?</strong> Include the task and your proof link
            so we can review it.
          </li>
        </ul>
      </div>
    </MarketingShell>
  );
}
