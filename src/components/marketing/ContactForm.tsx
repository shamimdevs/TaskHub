"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { Field } from "@/components/ui/Field";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SUPPORT } from "@/lib/constants";

const TOPICS = [
  "General question",
  "Payments & withdrawals",
  "Campaigns & delivery",
  "Report a problem",
  "Partnership",
] as const;

type Errors = Partial<Record<"name" | "email" | "message", string>>;

export function ContactForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    topic: TOPICS[0] as string,
    message: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  function set(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFailed(null);
    const next: Errors = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email address.";
    if (form.message.trim().length < 10)
      next.message = "Your message should be at least 10 characters.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSending(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.topic,
          message: form.message.trim(),
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        setFailed(data?.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setFailed("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
        <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-inset ring-brand-500/15">
          <CheckCircle2 size={22} />
        </span>
        <p className="mt-3 text-sm font-semibold text-fg">Message sent</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
          Thanks for reaching out — we usually reply {SUPPORT.responseTime}. You
          can also email us at{" "}
          <a
            href={`mailto:${SUPPORT.email}`}
            className="font-medium text-brand underline underline-offset-2"
          >
            {SUPPORT.email}
          </a>
          .
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => setSent(false)}
        >
          Send another
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" htmlFor="c-name" required error={errors.name}>
          <Input
            id="c-name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            invalid={!!errors.name}
            placeholder="Full name"
            autoComplete="name"
          />
        </Field>
        <Field label="Email" htmlFor="c-email" required error={errors.email}>
          <Input
            id="c-email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            invalid={!!errors.email}
            placeholder="you@example.com"
            autoComplete="email"
          />
        </Field>
      </div>

      <Field label="Topic" htmlFor="c-topic">
        <Select
          id="c-topic"
          value={form.topic}
          onChange={(e) => set("topic", e.target.value)}
        >
          {TOPICS.map((topic) => (
            <option key={topic} value={topic}>
              {topic}
            </option>
          ))}
        </Select>
      </Field>

      <Field
        label="Message"
        htmlFor="c-message"
        required
        error={errors.message}
      >
        <Textarea
          id="c-message"
          rows={5}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          invalid={!!errors.message}
          placeholder="How can we help?"
        />
      </Field>

      {failed && (
        <p className="rounded-lg border border-danger/25 bg-danger-soft px-3 py-2 text-xs font-medium text-danger">
          {failed}
        </p>
      )}

      <Button type="submit" icon={Send} fullWidth loading={sending}>
        Send message
      </Button>
      <p className="text-center text-xs text-fg-subtle">
        We usually reply {SUPPORT.responseTime}.
      </p>
    </form>
  );
}
