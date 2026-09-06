import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json, apiError, parseBody } from "@/lib/api";
import { createDepositSchema } from "@/lib/validation";
import { createDeposit } from "@/lib/domain/payments";
import { DomainError } from "@/lib/domain/errors";

export async function GET(req: Request) {
  const auth = await requireApiRole(req, ["buyer", "admin"]);
  if (isResponse(auth)) return auth;

  const scope = new URL(req.url).searchParams.get("scope");
  const where = auth.role === "admin" && scope !== "mine" ? {} : { buyerId: auth.id };

  const deposits = await prisma.deposit.findMany({ where, orderBy: { createdAt: "desc" } });
  return json(deposits);
}

export async function POST(req: Request) {
  const auth = await requireApiRole(req, "buyer");
  if (isResponse(auth)) return auth;

  const body = await parseBody(req, createDepositSchema);
  if (isResponse(body)) return body;

  try {
    const deposit = await createDeposit({ id: auth.id, name: auth.name }, body);
    return json(deposit, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return apiError(e.status, e.message);
    throw e;
  }
}
