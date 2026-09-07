import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { APP_NAME, SUPPORT } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${APP_NAME} collects, uses and stores your data.`,
};

const LAST_UPDATED = "7 September 2026";

/* Section list — keep `id`s in sync with the table of contents.
 *
 * `#deletion` is load-bearing: it is the URL given to Meta as the "Data
 * Deletion Instructions" and to Google as the account-removal path. Renaming
 * it breaks an external reference, not just an anchor on this page. */
const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "who-we-are",
    title: "1. Who we are",
    body: (
      <>
        <p>
          {APP_NAME} (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;the
          platform&rdquo;) operates a marketplace where <strong>workers</strong>{" "}
          complete small social media tasks and <strong>buyers</strong> pay for
          those actions. This policy explains what personal data we collect, why
          we collect it, and what we do with it.
        </p>
        <p>
          It applies to the website, the worker and buyer dashboards, and the
          background jobs that verify completed tasks. Questions go to{" "}
          <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>.
        </p>
      </>
    ),
  },
  {
    id: "what-we-collect",
    title: "2. What we collect",
    body: (
      <>
        <p>
          <strong>Account details.</strong> Your name, email address, phone
          number and country. If you sign up with Google we receive your name,
          email address and profile picture from Google.
        </p>
        <p>
          <strong>Authentication data.</strong> A one-way hash of your password
          (never the password itself), session tokens, and the IP address and
          browser user-agent attached to each session.
        </p>
        <p>
          <strong>Payment details.</strong> The mobile money number you deposit
          from or withdraw to, the transaction ID you supply, and the amounts.
          We do not receive or store your bKash, Nagad or Rocket PIN, and we
          have no access to your mobile money account.
        </p>
        <p>
          <strong>Activity.</strong> The tasks you take, the submissions you
          make, your wallet balance and transaction history, and the
          notifications we send you.
        </p>
        <p>
          <strong>Connected social accounts.</strong> Covered separately in the
          next section, because it is the part most people want to read.
        </p>
      </>
    ),
  },
  {
    id: "social-accounts",
    title: "3. Connected social accounts",
    body: (
      <>
        <p>
          Linking a social account is optional, but it is how we confirm a task
          was actually done. It also enforces one rule that protects everyone:{" "}
          <strong>
            one social account can belong to only one {APP_NAME} worker
          </strong>
          , so the same profile cannot be paid several times for one task.
        </p>
        <p>
          Here is exactly what each platform gives us, and what we keep.
        </p>

        <p>
          <strong>YouTube (via Google).</strong> With your permission we request
          read-only access (<code>youtube.readonly</code>). We read:
        </p>
        <ul>
          <li>your channel&rsquo;s ID, name, handle and public description;</li>
          <li>
            whether you are subscribed to <strong>one specific channel</strong>{" "}
            — the one belonging to a task you took. We ask the question channel
            by channel; we do not download, browse or store your subscription
            list.
          </li>
        </ul>
        <p>
          We store your access and refresh tokens so this check can run after
          you close the browser. Tokens are stored on our server and are never
          sent to your browser or to any other user.
        </p>

        <p>
          <strong>Facebook.</strong> Depending on which flow you use:
        </p>
        <ul>
          <li>
            <em>Workers</em> — your app-scoped user ID, your name, and your
            profile link where Facebook provides it.
          </li>
          <li>
            <em>Buyers</em> — the list of Pages you administer, with each
            Page&rsquo;s ID, name, username, follower count, and a Page access
            token used to re-read that follower count.
          </li>
        </ul>

        <p>
          <strong>Instagram.</strong> Your app-scoped user ID and username. For
          buyers, the ID, username and follower count of the Instagram business
          account attached to a connected Facebook Page.
        </p>

        <p>
          <strong>What we never collect.</strong> We do not read your posts,
          photos, videos, messages, comments, friends, followers list, contacts
          or email. We cannot see <em>who</em> follows a Facebook Page or an
          Instagram account — those platforms provide no such data to anyone —
          which is precisely why follow tasks on them are confirmed by a change
          in the total follower count rather than by identifying you.
        </p>
        <p>
          We also store periodic snapshots of the <em>total</em> follower count
          of a connected Page or Instagram account. These are counts only, with
          no information about individuals.
        </p>
      </>
    ),
  },
  {
    id: "youtube-terms",
    title: "4. YouTube API Services",
    body: (
      <>
        <p>
          Our YouTube features use <strong>YouTube API Services</strong>. By
          linking your YouTube channel you also agree to the{" "}
          <a
            href="https://www.youtube.com/t/terms"
            target="_blank"
            rel="noopener noreferrer"
          >
            YouTube Terms of Service
          </a>
          , and Google&rsquo;s handling of your data is governed by the{" "}
          <a
            href="https://policies.google.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Privacy Policy
          </a>
          .
        </p>
        <p>
          You can revoke our access to your Google account at any time, without
          involving us, at{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            myaccount.google.com/permissions
          </a>
          . Doing so stops all automatic checks immediately; your existing
          rewards are unaffected.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use",
    title: "5. How we use your data",
    body: (
      <ul>
        <li>
          <strong>To run your account</strong> — sign you in, show your
          dashboard, and send verification and password-reset codes.
        </li>
        <li>
          <strong>To verify completed tasks</strong> — the single biggest reason
          we ask for a connected account. Without it a task proof is just a
          pasted link.
        </li>
        <li>
          <strong>To prevent fraud</strong> — enforcing one social account per
          worker, and reversing rewards where an action is undone during the
          hold period.
        </li>
        <li>
          <strong>To pay you</strong> — processing deposits, holds, rewards and
          withdrawals, and keeping the ledger that supports them.
        </li>
        <li>
          <strong>To support you</strong> — answering messages you send us.
        </li>
      </ul>
    ),
  },
  {
    id: "sharing",
    title: "6. Who we share it with",
    body: (
      <>
        <p>
          <strong>We do not sell your personal data, ever.</strong> We share it
          only where it is necessary to run the service:
        </p>
        <ul>
          <li>
            <strong>Meta and Google</strong> — when you link an account, to the
            extent needed to make the API requests described above.
          </li>
          <li>
            <strong>Our hosting and database providers</strong> — who store the
            data on our behalf.
          </li>
          <li>
            <strong>Our email provider</strong> — to deliver verification codes
            and notifications.
          </li>
          <li>
            <strong>Buyers</strong> — a buyer whose campaign you completed sees
            your display name and the public profile link on your submission.
            They never see your email, phone number, payment details or tokens.
          </li>
          <li>
            <strong>Authorities</strong> — where we are legally required to
            disclose.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "retention",
    title: "7. How long we keep it",
    body: (
      <ul>
        <li>
          <strong>Access and refresh tokens</strong> — until you unlink the
          account or delete your account, at which point they are erased.
        </li>
        <li>
          <strong>Connected account records</strong> — until you unlink them.
        </li>
        <li>
          <strong>Financial records</strong> — deposits, withdrawals and wallet
          transactions are kept after account deletion where we are required to
          retain them for accounting and anti-fraud purposes.
        </li>
        <li>
          <strong>Follower-count snapshots</strong> — retained while the related
          campaign is open, so a disputed delivery can be settled.
        </li>
      </ul>
    ),
  },
  {
    id: "deletion",
    title: "8. Deleting your data",
    body: (
      <>
        <p>
          <strong>Unlink one social account.</strong> Go to{" "}
          <strong>Connected accounts</strong> in your worker dashboard and press{" "}
          <strong>Unlink</strong>. This immediately erases that account&rsquo;s
          stored tokens, profile link and platform identifiers. Buyers can
          disconnect a Page from the campaign screen, which erases its Page
          token.
        </p>
        <p>
          <strong>Delete everything.</strong> Email{" "}
          <a href={`mailto:${SUPPORT.email}?subject=Data%20deletion%20request`}>
            {SUPPORT.email}
          </a>{" "}
          from the address on your account with the subject{" "}
          <em>Data deletion request</em>. We will delete your account, connected
          accounts, tokens, submissions and notifications{" "}
          <strong>within 30 days</strong> and confirm by email.
        </p>
        <p>
          Two honest caveats. Financial records are retained as described in
          section 7. And any withdrawal already in progress must complete or be
          cancelled before the account can be removed.
        </p>
        <p>
          For Facebook and Instagram specifically, you can also remove our
          access from your own settings, under{" "}
          <em>Settings &amp; Privacy → Settings → Apps and Websites</em>. For
          Google, see{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
          >
            myaccount.google.com/permissions
          </a>
          . Revoking access there stops future API access immediately; email us
          as well if you want the stored records erased too.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "9. How we protect it",
    body: (
      <ul>
        <li>Passwords are stored only as one-way hashes.</li>
        <li>
          Access and refresh tokens are held server-side and are never exposed
          to the browser or to other users.
        </li>
        <li>Traffic between you and the site is encrypted in transit.</li>
        <li>
          Account linking uses a single-use anti-forgery token, so a link
          request cannot be triggered on your behalf by another site.
        </li>
      </ul>
    ),
  },
  {
    id: "your-rights",
    title: "10. Your rights",
    body: (
      <>
        <p>You can ask us at any time to:</p>
        <ul>
          <li>give you a copy of the personal data we hold about you;</li>
          <li>correct anything inaccurate;</li>
          <li>delete your data, as described in section 8;</li>
          <li>stop sending you non-essential email.</li>
        </ul>
        <p>
          Write to <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>. We
          respond {SUPPORT.responseTime}.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    title: "11. Cookies",
    body: (
      <p>
        We use a small number of strictly necessary cookies: one to keep you
        signed in, and short-lived ones used during account linking to protect
        against cross-site request forgery. We do not use advertising or
        third-party tracking cookies. Blocking these cookies will stop sign-in
        from working.
      </p>
    ),
  },
  {
    id: "children",
    title: "12. Children",
    body: (
      <p>
        {APP_NAME} is for people aged 18 and over. We do not knowingly collect
        data from anyone under 18. If you believe a child has given us personal
        data, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: "changes",
    title: "13. Changes to this policy",
    body: (
      <p>
        We may update this policy. The &ldquo;last updated&rdquo; date at the
        top always reflects the current version, and we will notify you in-app
        or by email before a material change takes effect.
      </p>
    ),
  },
  {
    id: "contact",
    title: "14. Contact us",
    body: (
      <ul>
        <li>
          Email: <a href={`mailto:${SUPPORT.email}`}>{SUPPORT.email}</a>
        </li>
        <li>Phone: {SUPPORT.phone}</li>
        <li>Address: {SUPPORT.address}</li>
        <li>Hours: {SUPPORT.hours}</li>
      </ul>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <MarketingShell>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-fg-muted">Last updated {LAST_UPDATED}</p>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          What {APP_NAME} collects, why, and how to get rid of it. The section
          worth reading first is{" "}
          <a
            href="#social-accounts"
            className="text-brand underline underline-offset-2"
          >
            connected social accounts
          </a>{" "}
          — it sets out exactly what we can and cannot see on Facebook,
          Instagram and YouTube.
        </p>

        {/* Table of contents */}
        <nav
          aria-label="Table of contents"
          className="mt-8 rounded-2xl border border-border bg-card-muted p-4 sm:p-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            On this page
          </p>
          <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-fg-muted underline-offset-2 hover:text-brand hover:underline"
                >
                  {s.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* Sections */}
        <div className="mt-10 space-y-10">
          {SECTIONS.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-24">
              <h2 className="text-lg font-bold tracking-tight text-fg">
                {s.title}
              </h2>
              <div className="prose-terms mt-3 space-y-3 text-sm leading-relaxed text-fg-muted">
                {s.body}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-border bg-card p-5 text-sm text-fg-muted shadow-soft">
          Linking a social account is always optional, and you can unlink it
          again at any time from your dashboard.
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/terms"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border-strong bg-card px-5 text-sm font-semibold text-fg hover:bg-bg-subtle"
            >
              Terms &amp; Conditions
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-border-strong bg-card px-5 text-sm font-semibold text-fg hover:bg-bg-subtle"
            >
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </MarketingShell>
  );
}
