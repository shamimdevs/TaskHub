import { json, me, referralPeople, tick } from "@/app/api/_data/db";
import { LIMITS } from "@/lib/constants";

export async function GET() {
  await tick();
  const user = me("worker");
  const totalEarned = referralPeople.reduce((s, r) => s + r.earnedForYou, 0);
  return json({
    code: user.referralCode,
    link: `https://taskhub.app/r/${user.referralCode}`,
    totalInvited: referralPeople.length,
    totalEarned,
    bonusPerReferral: LIMITS.referralBonus,
    people: referralPeople,
  });
}
