import { db, json, tick } from "@/app/api/_data/db";

export async function GET(req: Request) {
  await tick();
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.toLowerCase().trim();
  const role = searchParams.get("role");
  let items = db.users;
  if (role && role !== "all") items = items.filter((u) => u.role === role);
  if (q) {
    items = items.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.phone.includes(q),
    );
  }
  return json(
    [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  );
}
