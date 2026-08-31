import { db, json, tick } from "@/app/api/_data/db";

export async function GET(req: Request) {
  await tick();
  const { searchParams } = new URL(req.url);
  const platform = searchParams.get("platform");
  const type = searchParams.get("type");
  let items = db.tasks.filter((t) => t.slotsLeft > 0);
  if (platform && platform !== "all") items = items.filter((t) => t.platform === platform);
  if (type && type !== "all") items = items.filter((t) => t.type === type);
  return json(items);
}
