import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, apiError, parseBody } from "@/lib/api";
import { claimSocialAccountSchema } from "@/lib/validation";
import {
  CLAIMABLE,
  availableProviders,
  claimAccount,
  codeVerifiable,
  publicAccount,
} from "@/lib/domain/social";
import { DomainError } from "@/lib/domain/errors";

/** The signed-in person's linked social accounts. */
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const accounts = await prisma.socialAccount.findMany({
    where: { userId: auth.id },
    orderBy: { connectedAt: "asc" },
  });

  return json({
    /** Providers this server can run an OAuth link for right now. */
    available: availableProviders(),
    /** Providers a worker may instead claim by handle. */
    claimable: CLAIMABLE,
    /** Of those, the ones whose claim this server can actually settle. */
    codeVerifiable: CLAIMABLE.filter(codeVerifiable),
    accounts: accounts.map(publicAccount),
  });
}

/**
 * Claim a handle. The fallback for platforms that will not confirm an ordinary
 * personal account — Instagram since Basic Display was retired, most of all.
 * It proves nothing on its own; what it does is reserve the handle, so the
 * same account cannot farm one task through several TaskHub workers.
 */
export async function POST(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const body = await parseBody(req, claimSocialAccountSchema);
  if (isResponse(body)) return body;

  try {
    const account = await claimAccount(auth.id, body.provider, body.username);
    return json(publicAccount(account), { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }
}
