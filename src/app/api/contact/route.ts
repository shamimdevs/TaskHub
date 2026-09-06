import { json, apiError, parseBody, isResponse } from "@/lib/api";
import { contactSchema } from "@/lib/validation";
import { sendContactMessage } from "@/lib/email";

/** Public contact form -> CONTACT_RECEIVER inbox. */
export async function POST(req: Request) {
  const body = await parseBody(req, contactSchema);
  if (isResponse(body)) return body;

  try {
    await sendContactMessage(body);
    return json({ ok: true } as const);
  } catch (e) {
    console.error("[contact] send failed:", e);
    return apiError(502, "Could not send your message. Please email us directly.");
  }
}
