import { prisma } from "@/lib/prisma";
import { requireApiRole, isResponse, json, apiError } from "@/lib/api";
import { getSettings } from "@/lib/domain/settings";

export async function GET(req: Request) {
  const auth = await requireApiRole(req, ["worker", "buyer"]);
  if (isResponse(auth)) return auth;

  const [user, referrals, settings] = await Promise.all([
    prisma.user.findUnique({ where: { id: auth.id }, select: { referralCode: true } }),
    prisma.referral.findMany({ where: { referrerId: auth.id }, orderBy: { joinedAt: "desc" } }),
    getSettings(),
  ]);
  if (!user) return apiError(404, "User not found");

  const base = process.env.BETTER_AUTH_URL ?? "https://taskhub.app";
  const totalEarned = referrals.reduce((s, r) => s + r.earnedForYou.toNumber(), 0);

  return json({
    code: user.referralCode,
    link: `${base}/register?ref=${user.referralCode}`,
    totalInvited: referrals.length,
    totalEarned,
    bonusPerReferral: settings.referralBonus,
    people: referrals.map((r) => ({
      id: r.id,
      name: r.name,
      joinedAt: r.joinedAt,
      status: r.status,
      earnedForYou: r.earnedForYou,
    })),
  });
}
