import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { APP_NAME } from "@/lib/constants";

const host = process.env.MAIL_HOST;
const port = Number(process.env.MAIL_PORT) || 587;
// smtps scheme, MAIL_SECURE=true, or the implicit-TLS port 465 => secure socket.
const secure =
  process.env.MAIL_SCHEME === "smtps" ||
  process.env.MAIL_SECURE === "true" ||
  (process.env.MAIL_SECURE == null && port === 465);
const user = process.env.MAIL_USERNAME;
const pass = process.env.MAIL_PASSWORD;
const fromAddress = process.env.MAIL_FROM_ADDRESS || user || "no-reply@localhost";
const fromName = process.env.MAIL_FROM_NAME || APP_NAME;
const from = /</.test(fromAddress)
  ? fromAddress
  : `"${fromName}" <${fromAddress}>`;

/**
 * Master switch. Outgoing mail stays off until MAIL_ENABLED=true, so nothing
 * leaves the server while auth runs on a static OTP (see src/lib/auth.ts).
 * Messages are logged to the console instead, codes included.
 */
const enabled = process.env.MAIL_ENABLED === "true";
const configured = enabled && Boolean(host && user && pass);

let transporter: Transporter | null = null;
function getTransport(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user: user as string, pass: pass as string },
    });
  }
  return transporter;
}

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}

/**
 * Sends transactional mail over SMTP. While sending is off — or the MAIL_*
 * vars are incomplete — the message, code and all, goes to the server console
 * instead, so every flow stays completable end to end.
 */
export async function sendEmail({ to, subject, html, text, replyTo }: SendArgs): Promise<void> {
  if (!configured) {
    logToConsole(to, subject, text);
    return;
  }
  try {
    await getTransport().sendMail({ from, to, subject, html, text, replyTo });
  } catch (err) {
    // Don't let a transient SMTP failure 500 a sign-up / reset. Log the
    // message so the flow is still completable, and surface the cause.
    const code = (err as { code?: string; response?: string })?.code ?? "unknown";
    const detail = (err as { response?: string })?.response ?? (err as Error)?.message;
    console.error(`[email] SMTP send failed (${code}): ${detail} — falling back to console log.`);
    logToConsole(to, subject, text);
    throw new EmailDeliveryError(err);
  }
}

function logToConsole(to: string, subject: string, text: string): void {
  const tag = configured ? "fallback" : enabled ? "unconfigured" : "off";
  console.info(
    `\n📧 [email:${tag}] to=${to}\n   subject: ${subject}\n   ${text.replace(/\n/g, "\n   ")}\n`,
  );
}

/** Thrown after the console fallback has already run, so callers may ignore it. */
export class EmailDeliveryError extends Error {
  constructor(readonly cause: unknown) {
    super("Email delivery failed (the message was logged to the server console)");
    this.name = "EmailDeliveryError";
  }
}

/* ------------------------------------------------------------------ *
 * Templates — inline styles only, single-column, mobile-safe.
 * ------------------------------------------------------------------ */

function layout(heading: string, body: string, code: string): string {
  return `<!doctype html><html><body style="margin:0;background:#f4f4f6;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111">
  <table role="presentation" width="100%" style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e6e7ea">
    <tr><td style="padding:28px 24px">
      <p style="margin:0 0 4px;font-size:18px;font-weight:700;color:#059669">${APP_NAME}</p>
      <h1 style="margin:16px 0 8px;font-size:20px;line-height:1.3">${heading}</h1>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#3f3f46">${body}</p>
      <p style="margin:0;display:inline-block;background:#ecfdf5;color:#065f46;font-size:30px;font-weight:700;letter-spacing:8px;padding:14px 22px;border-radius:8px">${code}</p>
      <p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#71717a">Enter this code in the app to continue. It expires shortly.</p>
    </td></tr>
  </table>
  <p style="max-width:480px;margin:16px auto 0;font-size:11px;color:#a1a1aa;text-align:center">If you didn't request this, you can safely ignore this email.</p>
  </body></html>`;
}

export type OtpPurpose =
  | "sign-in"
  | "email-verification"
  | "forget-password"
  | "change-email";

const OTP_COPY: Record<OtpPurpose, { subject: string; heading: string; body: string }> = {
  "email-verification": {
    subject: `Verify your ${APP_NAME} email`,
    heading: "Confirm your email",
    body: `Use this code to verify your email and finish setting up your ${APP_NAME} account.`,
  },
  "forget-password": {
    subject: `Reset your ${APP_NAME} password`,
    heading: "Reset your password",
    body: "Use this code to choose a new password.",
  },
  "sign-in": {
    subject: `Your ${APP_NAME} sign-in code`,
    heading: "Sign in",
    body: "Use this code to sign in.",
  },
  "change-email": {
    subject: `Confirm your new ${APP_NAME} email`,
    heading: "Confirm your new email",
    body: "Use this code to confirm your new email address.",
  },
};

/** The one auth template: a code, never a link. */
export function otpEmail(code: string, type: OtpPurpose): Omit<SendArgs, "to"> {
  const copy = OTP_COPY[type];
  return {
    subject: copy.subject,
    text: `${copy.body}\n\nYour code: ${code}`,
    html: layout(copy.heading, copy.body, code),
  };
}

/* ------------------------------------------------------------------ *
 * Contact form -> CONTACT_RECEIVER
 * ------------------------------------------------------------------ */
export async function sendContactMessage(input: {
  name: string;
  email: string;
  subject?: string;
  message: string;
}): Promise<void> {
  const to = process.env.CONTACT_RECEIVER || fromAddress;
  const subject = `[${APP_NAME} contact] ${input.subject?.trim() || "New message"}`;
  const text = `From: ${input.name} <${input.email}>\n\n${input.message}`;
  const html = `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;line-height:1.6;color:#111">
    <p><strong>${escapeHtml(input.name)}</strong> &lt;${escapeHtml(input.email)}&gt;</p>
    <p style="white-space:pre-wrap">${escapeHtml(input.message)}</p>
  </div>`;
  await sendEmail({ to, subject, text, html, replyTo: `${input.name} <${input.email}>` });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&#39;";
    }
  });
}
