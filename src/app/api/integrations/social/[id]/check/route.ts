import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, apiError } from "@/lib/api";
import {
  CHECK_COOLDOWN_MS,
  checkProfileCode,
  publicAccount,
} from "@/lib/domain/social";

/**
 * Check a claimed account's profile code right now.
 *
 * The cron does this on its own every few minutes, so nobody *has* to press
 * anything — this is only for the worker who just pasted the code and would
 * rather not wait for the next pass.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const { id } = await params;
  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account) return apiError(404, "Account not linked");
  if (account.userId !== auth.id) return apiError(403, "Not your account");

  // The cron is checking anyway; this button only skips the wait. Refusing a
  // rapid repeat costs the worker nothing and keeps one impatient person from
  // spending the day's YouTube quota.
  const since = account.lastCheckedAt?.getTime();
  if (since && Date.now() - since < CHECK_COOLDOWN_MS) {
    return json({
      verified: false,
      throttled: true,
      account: publicAccount(account),
    });
  }

  const verified = await checkProfileCode(account);
  if (verified) return json({ verified: true, account: publicAccount(verified) });

  // Not verified yet. Hand back the account as it now stands — `lastError`
  // says what the check saw, which is the useful part.
  const fresh = await prisma.socialAccount.findUnique({ where: { id } });
  return json({
    verified: false,
    account: publicAccount(fresh ?? account),
  });
}
