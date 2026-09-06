import type { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json, pageParams } from "@/lib/api";
import { toUser } from "@/lib/dto";

const ROLES: Role[] = ["worker", "buyer", "admin"];

export async function GET(req: Request) {
  const auth = await requireApiRole(req, "admin");
  if (isResponse(auth)) return auth;

  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim();
  const roleParam = sp.get("role");
  const { skip, take } = pageParams(req, 50);

  const where: Prisma.UserWhereInput = {};
  if (roleParam && ROLES.includes(roleParam as Role)) where.role = roleParam as Role;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { phone: { contains: q } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
  });
  return json(users.map(toUser));
}
