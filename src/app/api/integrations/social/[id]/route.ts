import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, apiError, parseBody } from "@/lib/api";
import { setProfileUrlSchema } from "@/lib/validation";
import { publicAccount, setProfileUrl } from "@/lib/domain/social";
import { DomainError } from "@/lib/domain/errors";

async function owned(req: Request, id: string) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;
  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account) return apiError(404, "Account not linked");
  if (account.userId !== auth.id) return apiError(403, "Not your account");
  return account;
}

/**
 * Set the profile link. Facebook only hands it over with the `user_link`
 * permission, so a worker may have to supply it once; after that every proof
 * uses it automatically.
 *
 * Supplying the link the provider withheld leaves the verification alone.
 * *Changing* a link that is already there does not: the proof link is what the
 * verification stands behind, so moving it drops the account back to a bare
 * claim that has to be proved again. See `setProfileUrl`.
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const account = await owned(req, id);
  if (isResponse(account)) return account;

  const body = await parseBody(req, setProfileUrlSchema);
  if (isResponse(body)) return body;

  try {
    const updated = await setProfileUrl(account, body.profileUrl);
    return json(publicAccount(updated));
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }
}

/** Unlink. Past submissions keep the proof link they were sent with. */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const account = await owned(req, id);
  if (isResponse(account)) return account;

  await prisma.socialAccount.delete({ where: { id } });
  return json({ unlinked: true });
}
