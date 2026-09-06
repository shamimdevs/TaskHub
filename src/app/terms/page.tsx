import type { Metadata } from "next";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { APP_NAME, FEES, LIMITS, PAYMENT_METHODS, RATE_RANGE } from "@/lib/constants";
import { formatMoney } from "@/lib/utils";
import { t } from "@/lib/i18n/en";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: `The terms that govern your use of ${APP_NAME}.`,
};

const LAST_UPDATED = "31 August 2026";

const methods = Object.values(PAYMENT_METHODS)
  .filter((m) => m.label !== "Manual")
  .map((m) => m.label)
  .join(", ");

const holdMin = LIMITS.holdDaysRange[0];
const holdMax = LIMITS.holdDaysRange[1];

/* Section list — keep `id`s in sync with the table of contents. */
const SECTIONS: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "acceptance",
    title: "1. Acceptance of these terms",
    body: (
      <>
        <p>
          These Terms &amp; Conditions (&ldquo;Terms&rdquo;) form a binding
          agreement between you and {APP_NAME} (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;, &ldquo;the platform&rdquo;). By creating an account,
          accessing the site, or completing or ordering any task, you confirm
          that you have read, understood and agree to these Terms and to our
          Privacy Policy. If you do not agree, do not use {APP_NAME}.
        </p>
        <p>
          We may update these Terms from time to time. Material changes will be
          notified in-app or by email. Continued use after a change takes effect
          means you accept the revised Terms.
        </p>
      </>
    ),
  },
  {
    id: "eligibility",
    title: "2. Eligibility",
    body: (
      <ul>
        <li>You must be at least 18 years old and legally able to enter a contract.</li>
        <li>
          You must provide accurate registration details, including a valid phone
          number and a payment account (e.g. {methods}) in your own name.
        </li>
        <li>
          The service is intended for users in Bangladesh. You are responsible
          for complying with any laws that apply to you.
        </li>
        <li>
          Employees of {APP_NAME} and their immediate family may not earn as
          workers or claim referral bonuses.
        </li>
      </ul>
    ),
  },
  {
    id: "accounts",
    title: "3. Your account",
    body: (
      <ul>
        <li>
          One account per person. Creating multiple accounts, or operating an
          account on behalf of someone else, is not allowed.
        </li>
        <li>
          You are responsible for everything that happens under your account and
          for keeping your password secure. Tell us immediately if you suspect
          unauthorised use.
        </li>
        <li>
          A single account can act as both a <strong>worker</strong> (earning by
          completing tasks) and a <strong>buyer</strong> (ordering engagement for
          your own pages). The relevant terms below apply to whichever role you
          are using.
        </li>
        <li>
          We may refuse registration, or suspend or close an account, at our
          discretion where these Terms are breached or fraud is suspected.
        </li>
      </ul>
    ),
  },
  {
    id: "how-it-works",
    title: "4. How the platform works",
    body: (
      <>
        <p>
          {APP_NAME} connects <strong>buyers</strong>, who fund campaigns for
          social engagement (for example YouTube subscribers, watch time, video
          views, likes and comments, or follows on Facebook, Instagram and
          TikTok), with <strong>workers</strong>, who complete those actions
          manually and submit proof.
        </p>
        <p>
          {APP_NAME} is a marketplace and facilitator. We are not a party to the
          underlying social activity, we do not control third-party platforms,
          and we do not guarantee any particular business, marketing or
          monetisation outcome.
        </p>
      </>
    ),
  },
  {
    id: "worker-terms",
    title: "5. Worker terms",
    body: (
      <>
        <ul>
          <li>
            Complete each task genuinely, from a real, logged-in account that
            belongs to you, and exactly as the task instructions describe
            (including any minimum watch time).
          </li>
          <li>
            Submit truthful proof (screenshots, profile links and notes). Fake,
            edited, reused or misleading proof will be rejected.
          </li>
          <li>
            Approved rewards are credited at the published rate for that
            platform and action ({formatMoney(RATE_RANGE.min)}&ndash;
            {formatMoney(RATE_RANGE.max)} per action) and
            are held for {holdMin}&ndash;{holdMax} days
            (typically {LIMITS.holdDaysDefault}) so the action can be verified as
            genuine and lasting.
          </li>
          <li>
            If you undo an action during the hold period (unsubscribe, unfollow,
            unlike, delete a comment), the reward is reversed. Repeated or
            deliberate reversals lead to penalties and account termination.
          </li>
          <li>
            Bots, automation, emulators, click farms, account-selling, VPN/GPS
            spoofing and incentivised-traffic networks are strictly prohibited.
          </li>
          <li>
            We may withhold or reverse rewards linked to fraud, chargebacks by
            the buyer, or breach of these Terms. Rewards have no value until
            approved and past the hold period.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "buyer-terms",
    title: "6. Buyer terms",
    body: (
      <>
        <ul>
          <li>
            You may only promote content, pages, channels and links that you own
            or are authorised to promote, and that are lawful.
          </li>
          <li>
            You must not order engagement for content that is illegal, adult,
            hateful, deceptive, infringing, or that violates the rules of the
            target platform (YouTube, Meta, TikTok, X and others).
          </li>
          <li>
            Campaigns run against your wallet balance. You pay the rate
            published for the platform and action you choose (currently{" "}
            {formatMoney(RATE_RANGE.min)}&ndash;{formatMoney(RATE_RANGE.max)} per
            action). Rates, minimum and maximum quantities and features may
            change; the price shown at checkout is what applies to that campaign.
          </li>
          <li>
            Campaign quantity must be between{" "}
            {LIMITS.minCampaignQty.toLocaleString()} and{" "}
            {LIMITS.maxCampaignQty.toLocaleString()} actions. Campaigns may be
            reviewed before going live and rejected if they breach these Terms.
          </li>
          <li>
            Engagement is delivered by independent people. We do not guarantee
            delivery speed, permanent retention, watch-time eligibility for
            monetisation, or that a third-party platform will not adjust or
            remove counts under its own policies.
          </li>
          <li>
            You are responsible for keeping your target links live and correct
            for the duration of the campaign.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "deposits",
    title: "7. Deposits",
    body: (
      <ul>
        <li>
          Add funds by sending money to the {methods} number shown in-app and
          submitting the exact Transaction ID (TrxID) and amount.
        </li>
        <li>
          Deposits are credited after an administrator verifies the TrxID.
          Minimum deposit is {formatMoney(LIMITS.minDeposit)}.
        </li>
        <li>
          Submitting a false, reused, third-party or disputed TrxID is fraud and
          will result in immediate termination and possible legal action.
        </li>
        <li>
          Wallet balance is store credit for use on {APP_NAME} only. It is not a
          bank deposit and earns no interest.
        </li>
      </ul>
    ),
  },
  {
    id: "withdrawals",
    title: "8. Withdrawals & fees",
    body: (
      <ul>
        <li>
          Workers may withdraw available (cleared) balance from{" "}
          {formatMoney(LIMITS.minWithdraw)} upwards to a {methods} account in
          their own name.
        </li>
        <li>
          A withdrawal fee of {FEES.withdrawFeePct}% is deducted from each
          request. The amount you receive is shown before you confirm.
        </li>
        <li>
          Balances, rewards and campaign costs are held in US dollars. Money you
          send or receive over bKash, Nagad or Rocket is converted at the
          exchange rate published in the app, which we may change at any time.
          The rate is locked into each deposit and withdrawal when you submit
          it, so a later change never re-prices a request already in the queue.
        </li>
        <li>
          Withdrawal requests are processed manually and may take a few business
          days. We may pause a payout to investigate suspected fraud or a policy
          breach.
        </li>
        <li>
          Any taxes on your earnings are your responsibility.
        </li>
      </ul>
    ),
  },
  {
    id: "refunds",
    title: "9. Refunds",
    body: (
      <>
        <p>
          Because tasks are performed by real people whose time cannot be
          reclaimed, all payments are final except as set out here:
        </p>
        <ul>
          <li>
            If a campaign does not deliver the verified actions you paid for, the
            undelivered portion is refunded to your {APP_NAME} wallet.
          </li>
          <li>
            Deposits made in error may be refunded to the original account,
            minus any processing cost, at our discretion.
          </li>
          <li>
            No refund is due for a drop in counts caused by the third-party
            platform, by you changing or removing the target, or by a breach of
            these Terms.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "referrals",
    title: "10. Referrals",
    body: (
      <p>
        You earn a {formatMoney(LIMITS.referralBonus)} bonus when someone you
        invite signs up with your link and completes their first approved task.
        Self-referrals, fake accounts and other abuse void all related bonuses
        and may lead to account closure. We may change or end the referral
        programme at any time.
      </p>
    ),
  },
  {
    id: "prohibited",
    title: "11. Prohibited conduct",
    body: (
      <ul>
        <li>Fraud, fake proof, false TrxIDs, or manipulating the reward or hold system.</li>
        <li>Bots, scripts, automation, emulators, click farms or purchased/stolen accounts.</li>
        <li>Multiple or shared accounts, or reselling {APP_NAME} access.</li>
        <li>Promoting illegal, adult, hateful, deceptive or infringing content.</li>
        <li>Interfering with, scraping, overloading or reverse-engineering the platform.</li>
        <li>Any activity that puts {APP_NAME} or its payment partners at legal or financial risk.</li>
      </ul>
    ),
  },
  {
    id: "third-party",
    title: "12. Third-party platforms",
    body: (
      <p>
        {APP_NAME} is not affiliated with, endorsed by, or sponsored by YouTube,
        Google, Meta (Facebook / Instagram), TikTok, X or any other platform. You
        must comply with those platforms&rsquo; own terms of service. Using any
        engagement service may carry a risk of action against your account on the
        target platform; you accept that risk, and {APP_NAME} is not liable for
        it.
      </p>
    ),
  },
  {
    id: "suspension",
    title: "13. Suspension & termination",
    body: (
      <p>
        We may suspend or permanently close your account, cancel campaigns, and
        withhold or reverse balances tied to a breach of these Terms or to
        suspected fraud. Where a balance is not connected to any breach, we will
        make it available for withdrawal, subject to the normal minimums and
        fee. You may close your account at any time after settling any pending
        campaigns or withdrawals.
      </p>
    ),
  },
  {
    id: "disclaimer",
    title: "14. Disclaimer of warranties",
    body: (
      <p>
        The platform is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;, without warranties of any kind, whether express or
        implied. We do not warrant that the service will be uninterrupted or
        error-free, that any campaign will achieve a specific result, or that
        engagement delivered will be retained by third-party platforms.
      </p>
    ),
  },
  {
    id: "liability",
    title: "15. Limitation of liability",
    body: (
      <p>
        To the fullest extent permitted by law, {APP_NAME} and its team will not
        be liable for any indirect, incidental, special or consequential loss, or
        for lost profits, goodwill, data, or engagement counts. Our total
        liability for any claim relating to the service is limited to the amount
        you paid to {APP_NAME}, or that {APP_NAME} approved as your reward, in the
        30 days before the event giving rise to the claim.
      </p>
    ),
  },
  {
    id: "indemnity",
    title: "16. Indemnification",
    body: (
      <p>
        You agree to indemnify and hold {APP_NAME} harmless from any claim,
        demand, loss or expense (including reasonable legal fees) arising out of
        your use of the platform, your content or campaigns, or your breach of
        these Terms or of any third-party platform&rsquo;s rules.
      </p>
    ),
  },
  {
    id: "changes",
    title: "17. Changes to the service and pricing",
    body: (
      <p>
        We may add, change or remove features, task types, limits, fees and
        reward or client rates at any time. Changes apply to new campaigns,
        deposits and withdrawals from the moment they take effect; they do not
        retroactively change a campaign already running or a reward already
        approved.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "18. Governing law",
    body: (
      <p>
        These Terms are governed by the laws of the People&rsquo;s Republic of
        Bangladesh. The courts of Bangladesh have exclusive jurisdiction over any
        dispute, subject to any mandatory consumer-protection rights you have
        where you live.
      </p>
    ),
  },
  {
    id: "contact",
    title: "19. Contact",
    body: (
      <p>
        Questions about these Terms? Reach us through the in-app support channel
        or the contact details on our website. We aim to respond within a few
        business days.
      </p>
    ),
  },
];

export default function TermsPage() {
  return (
    <MarketingShell>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-brand">
          Legal
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-fg sm:text-4xl">
          Terms &amp; Conditions
        </h1>
        <p className="mt-2 text-sm text-fg-muted">
          Last updated {LAST_UPDATED}
        </p>
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          Please read these Terms carefully before using {APP_NAME}. They explain
          the rules for earning as a worker, ordering engagement as a buyer, and
          how deposits, rewards and withdrawals work.
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
          By continuing to use {APP_NAME} you acknowledge that you have read and
          agree to these Terms and to our Privacy Policy.
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-brand-fg hover:bg-brand-600"
            >
              {t.marketing.getStarted}
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
