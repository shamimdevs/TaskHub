"use client";

/**
 * Browser half of the ImageKit upload: ask this app for a signed grant, then
 * send the file straight to ImageKit. The file never touches our server, so it
 * is not bound by the route body limit and costs us no bandwidth.
 */

const UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {}

interface Grant {
  token: string;
  expire: number;
  signature: string;
  publicKey: string;
  folder: string;
}

/** Uploads one image and returns its public URL. Throws `UploadError`. */
export async function uploadImage(file: File): Promise<string> {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    throw new UploadError("Pick a JPG, PNG or WebP image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadError("That image is larger than 5 MB.");
  }

  const res = await fetch("/api/uploads/imagekit");
  if (!res.ok) {
    throw new UploadError(
      res.status === 503
        ? "Image uploads are not set up on this server yet."
        : "Could not start the upload.",
    );
  }
  const grant: Grant = await res.json();

  const form = new FormData();
  form.append("file", file);
  // A stable-ish name per upload; ImageKit adds its own suffix when it clashes.
  form.append("fileName", `${Date.now()}-${file.name}`.slice(-100));
  form.append("folder", grant.folder);
  form.append("publicKey", grant.publicKey);
  form.append("signature", grant.signature);
  form.append("expire", String(grant.expire));
  form.append("token", grant.token);
  form.append("useUniqueFileName", "true");

  const upload = await fetch(UPLOAD_URL, { method: "POST", body: form });
  const body = await upload.json().catch(() => null);

  if (!upload.ok) {
    throw new UploadError(
      (body as { message?: string } | null)?.message ?? "ImageKit refused the upload.",
    );
  }
  const url = (body as { url?: string } | null)?.url;
  if (!url) throw new UploadError("ImageKit did not return a link.");
  return url;
}
