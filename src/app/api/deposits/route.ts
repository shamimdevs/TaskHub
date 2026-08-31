import { db, json, me, roleFromRequest, tick } from "@/app/api/_data/db";
import type { Deposit } from "@/types";

export async function GET(req: Request) {
  await tick();
  const role = roleFromRequest(req);
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  let items = db.deposits;
  if (role === "buyer" && scope !== "all") {
    items = items.filter(
      (d) => d.buyerId === me("buyer").id || d.buyerName === "Sadia Akter",
    );
  }
  return json(
    [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  );
}

export async function POST(req: Request) {
  await tick();
  const body = (await req.json()) as {
    method: Deposit["method"];
    senderNumber: string;
    trxId: string;
    amount: number;
  };
  const row: Deposit = {
    id: `d_${Date.now()}`,
    buyerId: me("buyer").id,
    buyerName: "Sadia Akter",
    method: body.method,
    senderNumber: body.senderNumber,
    trxId: body.trxId,
    amount: Number(body.amount) || 0,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  db.deposits.unshift(row);
  return json(row, { status: 201 });
}
