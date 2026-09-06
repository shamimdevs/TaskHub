import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json, apiError, parseBody } from "@/lib/api";
import { createWithdrawalSchema } from "@/lib/validation";
import { createWithdrawal } from "@/lib/domain/payments";
import { DomainError } from "@/lib/domain/errors";

export async function GET(req: Request) {
  const auth = await requireApiRole(req, ["worker", "admin"]);
  if (isResponse(auth)) return auth;

  const scope = new URL(req.url).searchParams.get("scope");
  const where = auth.role === "admin" && scope !== "mine" ? {} : { workerId: auth.id };

  const withdrawals = await prisma.withdrawal.findMany({ where, orderBy: { createdAt: "desc" } });
  return json(withdrawals);
}

export async function POST(req: Request) {
  const auth = await requireApiRole(req, "worker");
  if (isResponse(auth)) return auth;

  const body = await parseBody(req, createWithdrawalSchema);
  if (isResponse(body)) return body;

  try {
    const withdrawal = await createWithdrawal({ id: auth.id, name: auth.name }, body);
    return json(withdrawal, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }
}
