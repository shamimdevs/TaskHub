/** Tiny conditional class joiner (no clsx/tailwind-merge dependency). */
type ClassInput =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean | null | undefined>
  | ClassInput[];

export function cn(...inputs: ClassInput[]): string {
  const out: string[] = [];
  const walk = (val: ClassInput) => {
    if (!val) return;
    if (typeof val === "string" || typeof val === "number") {
      out.push(String(val));
      return;
    }
    if (Array.isArray(val)) {
      val.forEach(walk);
      return;
    }
    if (typeof val === "object") {
      for (const [key, active] of Object.entries(val)) {
        if (active) out.push(key);
      }
    }
  };
  inputs.forEach(walk);
  return out.join(" ");
}

/**
 * Wallet money is USD. Rewards can be fractions of a cent, so amounts under a
 * dollar keep up to four decimals: $12.50, $0.02, $0.005.
 */
export function formatMoney(amount: number, opts?: { sign?: boolean }): string {
  const sign = opts?.sign && amount > 0 ? "+" : amount < 0 ? "−" : "";
  const abs = Math.abs(amount);
  const fmt = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: abs > 0 && abs < 1 ? 4 : 2,
  });
  return `${sign}$${fmt.format(abs)}`;
}

const BDT = new Intl.NumberFormat("en-BD", {
  maximumFractionDigits: 2,
  minimumFractionDigits: 0,
});

/** Cash still moves in taka — bKash / Nagad amounts, e.g. ৳1,250. */
export function formatBdt(amount: number, opts?: { sign?: boolean }): string {
  const sign = opts?.sign && amount > 0 ? "+" : amount < 0 ? "−" : "";
  return `${sign}৳${BDT.format(Math.abs(amount))}`;
}

/** Taka -> dollars at `rate` BDT per USD, rounded to the cent. */
export function toUsd(bdt: number, rate: number): number {
  if (!rate) return 0;
  return Math.round((bdt / rate) * 100) / 100;
}

/** Dollars -> taka at `rate` BDT per USD, rounded to the taka. */
export function toBdt(usd: number, rate: number): number {
  return Math.round(usd * rate);
}

const NUM = new Intl.NumberFormat("en-US");
export function formatNumber(n: number): string {
  return NUM.format(n);
}

/** 12,500 -> 12.5K, 1,200,000 -> 1.2M */
export function compactNumber(n: number): string {
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
}

export function formatDate(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function relativeTime(input: string | Date): string {
  const d = typeof input === "string" ? new Date(input) : input;
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536e6],
    ["month", 2592e6],
    ["day", 864e5],
    ["hour", 36e5],
    ["minute", 6e4],
    ["second", 1e3],
  ];
  for (const [unit, ms] of units) {
    if (abs >= ms || unit === "second") {
      return rtf.format(Math.round(diff / ms), unit);
    }
  }
  return "just now";
}

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.min(100, Math.round((part / whole) * 100));
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function titleCase(s: string): string {
  return s
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
