import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiRole, requireApiUser, isResponse, json, parseBody } from "@/lib/api";
import { updateSettingsSchema } from "@/lib/validation";
import { getSettings, getRateCard } from "@/lib/domain/settings";

export async function GET(req: Request) {
  const auth = await requireApiUser(req);
  if (isResponse(auth)) return auth;

  const [settings, rates] = await Promise.all([getSettings(), getRateCard()]);
  return json({ ...settings, rates });
}

export async function PUT(req: Request) {
  const auth = await requireApiRole(req, "admin");
  if (isResponse(auth)) return auth;

  const body = await parseBody(req, updateSettingsSchema);
  if (isResponse(body)) return body;

  const data: Prisma.PlatformSettingsUpdateInput = {};
  if (body.usdRate !== undefined) data.usdRate = new Prisma.Decimal(body.usdRate);
  if (body.minDeposit !== undefined) data.minDeposit = new Prisma.Decimal(body.minDeposit);
  if (body.minWithdraw !== undefined) data.minWithdraw = new Prisma.Decimal(body.minWithdraw);
  if (body.withdrawFeePct !== undefined) data.withdrawFeePct = new Prisma.Decimal(body.withdrawFeePct);
  if (body.holdDays !== undefined) data.holdDays = body.holdDays;
  if (body.referralBonus !== undefined) data.referralBonus = new Prisma.Decimal(body.referralBonus);
  if (body.autoApproveDeposits !== undefined) data.autoApproveDeposits = body.autoApproveDeposits;
  if (body.autoVerify !== undefined) data.autoVerify = body.autoVerify;
  if (body.autoVerifyGraceMins !== undefined) data.autoVerifyGraceMins = body.autoVerifyGraceMins;
  if (body.maintenanceMode !== undefined) data.maintenanceMode = body.maintenanceMode;

  await getSettings(); // ensure the row exists
  await prisma.platformSettings.update({ where: { id: "singleton" }, data });

  // Rates are upserted one pair at a time — the admin may send only the rows
  // they touched, and a pair may not have a row yet.
  for (const r of body.rates ?? []) {
    const rate = new Prisma.Decimal(r.rate);
    await prisma.rateCard.upsert({
      where: { platform_type: { platform: r.platform, type: r.type } },
      update: { rate, ...(r.enabled === undefined ? {} : { enabled: r.enabled }) },
      create: { platform: r.platform, type: r.type, rate, enabled: r.enabled ?? true },
    });
  }

  const [settings, rates] = await Promise.all([getSettings(), getRateCard()]);
  return json({ ...settings, rates });
}
