import "server-only";
import { createHmac, randomUUID } from "node:crypto";

/**
 * Server half of the ImageKit upload.
 *
 * The file itself never passes through this app: the browser uploads straight
 * to ImageKit, and all we do is sign a short-lived, one-shot token for it. The
 * private key stays here and is never sent to the client.
 */

// Read at request time, not module load, so a restart is not needed to notice
// a newly filled .env — and the NEXT_PUBLIC_ spellings still work if someone
// copied them from the ImageKit docs for a client-side setup.
const privateKey = () => process.env.IMAGEKIT_PRIVATE_KEY;
const publicKey = () =>
  process.env.IMAGEKIT_PUBLIC_KEY || process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY;
const urlEndpoint = () =>
  process.env.IMAGEKIT_URL_ENDPOINT || process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT;

export function imagekitConfigured() {
  return Boolean(privateKey() && publicKey() && urlEndpoint());
}

export interface UploadGrant {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  urlEndpoint: string;
}

/**
 * ImageKit accepts an upload when the token is signed with the private key.
 * Five minutes is plenty for picking a file and sending it, and keeps a
 * leaked grant close to worthless (ImageKit's own ceiling is one hour).
 */
export function signUpload(ttlSeconds = 300): UploadGrant {
  const secret = privateKey();
  const key = publicKey();
  const endpoint = urlEndpoint();
  if (!secret || !key || !endpoint) {
    throw new Error("ImageKit is not configured");
  }
  const token = randomUUID();
  const expire = Math.floor(Date.now() / 1000) + ttlSeconds;
  const signature = createHmac("sha1", secret)
    .update(token + expire)
    .digest("hex");

  return { token, expire, signature, publicKey: key, urlEndpoint: endpoint };
}
