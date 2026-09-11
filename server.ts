/**
 * TaskHub's HTTP entry point: Next.js and Socket.IO share one server and one
 * Node process, which is what lets a route handler call `emitToUser()` and
 * reach the browser directly — see src/lib/realtime.ts.
 *
 *   npm run dev     → this file, Next in dev mode
 *   npm run build   → next build
 *   npm start       → this file, Next in production mode
 *
 * Run with `--import tsx` (the npm scripts do) since this file is TypeScript
 * and never goes through the Next compiler. It is also outside the bundle, so
 * it must not import anything that pulls in `server-only`.
 */
import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";
import { getSessionCookie } from "better-auth/cookies";
import { prisma } from "./src/lib/prisma";
import { roleRoom, setIo, userRoom } from "./src/lib/realtime";
import type { Role } from "./src/types";

const dev = process.argv.includes("--dev") || process.env.NODE_ENV === "development";
// Next reads NODE_ENV for itself; the npm scripts pass --dev instead of
// setting it, because `NODE_ENV=x cmd` is not portable to PowerShell.
if (!process.env.NODE_ENV) {
  (process.env as Record<string, string>).NODE_ENV = dev ? "development" : "production";
}

const port = Number(process.env.PORT) || 3000;
const hostname = process.env.HOSTNAME || "localhost";

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

interface SocketUser {
  id: string;
  role: Role;
}

/**
 * Who is on the other end of this socket.
 *
 * The session cookie is signed as `<token>.<signature>`; the token half is the
 * row in `Session`. Reading the row rather than the cookie cache costs one
 * query per connection and cannot be fooled by a stale or forged cache, and a
 * socket lives for hours — so it is worth doing properly once.
 */
async function identify(cookieHeader: string | undefined): Promise<SocketUser | null> {
  if (!cookieHeader) return null;

  // getSessionCookie takes anything with headers, and knows the __Secure- prefix.
  const signed = getSessionCookie(
    new Request("http://localhost", { headers: { cookie: cookieHeader } }),
  );
  if (!signed) return null;

  const token = signed.split(".")[0];
  const session = await prisma.session.findUnique({
    where: { token },
    select: {
      expiresAt: true,
      user: { select: { id: true, role: true, status: true } },
    },
  });

  if (!session || session.expiresAt < new Date()) return null;
  if (session.user.status === "banned") return null;
  return { id: session.user.id, role: session.user.role };
}

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(server, {
    // Same origin as the app, so no CORS block is needed.
    serveClient: false,
    // A phone that walks out of coverage should not be dropped instantly.
    pingTimeout: 25_000,
  });

  io.use(async (socket, done) => {
    try {
      const user = await identify(socket.handshake.headers.cookie);
      if (!user) return done(new Error("unauthorised"));
      socket.data.user = user;
      done();
    } catch (err) {
      console.error("[socket] auth failed:", (err as Error).message);
      done(new Error("unauthorised"));
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser;
    // Every tab of one person shares a room, and every admin shares another.
    socket.join(userRoom(user.id));
    socket.join(roleRoom(user.role));
    if (dev) console.log(`[socket] ${user.role} ${user.id} connected`);
  });

  // Hand the instance to the app: route handlers emit through src/lib/realtime.
  setIo(io);

  server.listen(port, () => {
    console.log(
      `> TaskHub on http://${hostname}:${port} (${dev ? "development" : "production"}) — realtime on`,
    );
    startVerifyLoop();
  });
});

/**
 * Runs `POST /api/cron/verify` from inside this process, so YouTube
 * subscriptions, follower counts and hold releases are settled without an
 * external scheduler having to be set up first — without one, nothing but the
 * on-submit check ever approved anything.
 *
 * It goes through the HTTP route rather than calling the domain directly
 * because this file sits outside the Next bundle and must not import anything
 * `server-only`. Several instances running it at once is safe: every
 * settlement is guarded on the submission's status.
 *
 * VERIFY_INTERVAL_MINUTES=0 turns it off (e.g. when a platform cron calls the
 * route instead).
 */
function startVerifyLoop() {
  const secret = process.env.CRON_SECRET;
  const minutes = Number(process.env.VERIFY_INTERVAL_MINUTES ?? 3);
  if (!secret || !(minutes > 0)) {
    console.log("> verify loop off (set CRON_SECRET and VERIFY_INTERVAL_MINUTES to enable)");
    return;
  }

  const host = hostname === "0.0.0.0" || hostname === "::" ? "127.0.0.1" : hostname;
  const url = `http://${host}:${port}/api/cron/verify`;
  let running = false;

  const tick = async () => {
    // A slow pass must not have the next one pile in on top of it.
    if (running) return;
    running = true;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { authorization: `Bearer ${secret}` },
      });
      if (!res.ok) console.error(`[verify] pass failed: HTTP ${res.status}`);
    } catch (err) {
      console.error("[verify] pass failed:", (err as Error).message);
    } finally {
      running = false;
    }
  };

  // First pass shortly after boot, once Next has had a moment to warm up.
  setTimeout(tick, 15_000).unref();
  setInterval(tick, minutes * 60_000).unref();
  console.log(`> verify loop every ${minutes} min`);
}
