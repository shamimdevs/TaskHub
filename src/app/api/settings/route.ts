import { db, json, tick } from "@/app/api/_data/db";
import type { PlatformSettings } from "@/types";

export async function GET() {
  await tick();
  return json(db.settings);
}

export async function PUT(req: Request) {
  await tick();
  const body = (await req.json()) as Partial<PlatformSettings>;
  db.settings = { ...db.settings, ...body };
  return json(db.settings);
}
