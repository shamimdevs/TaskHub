import { db, json, tick } from "@/app/api/_data/db";

export async function GET(req: Request) {
  await tick();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const all = [...db.wallets.worker, ...db.wallets.buyer];
  const filtered =
    type && type !== "all" ? all.filter((t) => t.type === type) : all;
  return json(
    [...filtered].sort(
      (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
    ),
  );
}
