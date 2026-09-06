import { prisma } from "@/lib/prisma";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous chars

function random(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return out;
}

/** A short, human-friendly referral code derived from the name plus entropy. */
export async function generateReferralCode(name: string): Promise<string> {
  const base = (name || "USER").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5) || "USER";
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = `${base}${random(4)}`;
    const clash = await prisma.user.findUnique({
      where: { referralCode: code },
      select: { id: true },
    });
    if (!clash) return code;
  }
  return `${base}${random(8)}`;
}
