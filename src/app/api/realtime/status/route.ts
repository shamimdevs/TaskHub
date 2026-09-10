import { requireApiRole, isResponse, json } from "@/lib/api";
import { getIo } from "@/lib/realtime";
import { pushEnabled } from "@/lib/push";

/**
 * Is live delivery actually working? `realtime` is false whenever the app is
 * served by plain `next dev`/`next start` instead of server.ts — the one thing
 * that silently turns every notification into a page-refresh-only affair.
 */
export async function GET(req: Request) {
  const auth = await requireApiRole(req, "admin");
  if (isResponse(auth)) return auth;

  const io = getIo();
  return json({
    realtime: Boolean(io),
    connectedClients: io?.engine.clientsCount ?? 0,
    push: pushEnabled(),
  });
}
