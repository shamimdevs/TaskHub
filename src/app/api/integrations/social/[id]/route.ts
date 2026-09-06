import { prisma } from "@/lib/prisma";
import { requireApiUser, isResponse, json, apiError, parseBody } from "@/lib/api";
import { setProfileUrlSchema } from "@/lib/validation";

async function owned(req: Request, id: string) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;
  const account = await prisma.socialAccount.findUnique({ where: { id } });
  if (!account) return apiError(404, "Account not linked");
  if (account.userId !== auth.id) return apiError(403, "Not your account");
  return account;
}

/**
 * Fill in the profile link. Facebook only hands it over with the `user_link`
 * permission, so a worker may have to supply it once; after that every proof
 * uses it automatically.
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

  const updated = await prisma.socialAccount.update({
    where: { id },
    data: { profileUrl: body.profileUrl },
    select: { id: true, provider: true, name: true, profileUrl: true, connectedAt: true },
  });
  return json(updated);
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
