import { db, json, me, roleFromRequest, tick } from "@/app/api/_data/db";
import { FEES } from "@/lib/constants";
import type { Withdrawal } from "@/types";

export async function GET(req: Request) {
  await tick();
  const role = roleFromRequest(req);
  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope");
  let items = db.withdrawals;
  if (role === "worker" && scope !== "all") {
    items = items.filter(
      (w) => w.workerId === me("worker").id || w.workerName === "Rakib Hasan",
    );
  }
  return json(
    [...items].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt)),
  );
}

export async function POST(req: Request) {
  await tick();
  const body = (await req.json()) as {
    method: Withdrawal["method"];
    accountNumber: string;
    amount: number;
  };
  const amount = Number(body.amount) || 0;
  const fee = +((amount * FEES.withdrawFeePct) / 100).toFixed(2);
  const row: Withdrawal = {
    id: `x_${Date.now()}`,
    workerId: me("worker").id,
    workerName: "Rakib Hasan",
    method: body.method,
    accountNumber: body.accountNumber,
    amount,
    fee,
    net: +(amount - fee).toFixed(2),
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  db.withdrawals.unshift(row);
  return json(row, { status: 201 });
}
