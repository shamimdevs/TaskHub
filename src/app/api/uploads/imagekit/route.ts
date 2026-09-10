import { requireApiUser, isResponse, json, apiError } from "@/lib/api";
import { imagekitConfigured, signUpload } from "@/lib/imagekit";

/**
 * A short-lived grant the browser trades for one upload. Behind the session on
 * purpose: an open endpoint here would let anyone fill the media library.
 */
export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  if (!imagekitConfigured()) {
    return apiError(503, "Image uploads are not configured on this server");
  }
  // Everything a person uploads about themselves lands in one folder, named
  // after the account, so an avatar can be found again without a database.
  return json({ ...signUpload(), folder: `/taskhub/avatars/${auth.id}` });
}
