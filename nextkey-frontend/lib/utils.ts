import { type Address, formatUnits } from "viem";
import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ── Address formatting ─────────────────────────────────────────────────
export function shortAddress(addr: Address | string): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

// ── Time formatting ────────────────────────────────────────────────────
export function formatDuration(seconds: bigint): string {
  const s = Number(seconds);
  if (s <= 0)        return "0 days";
  if (s < 3_600)     return `${Math.floor(s / 60)}m`;
  if (s < 86_400)    return `${Math.floor(s / 3_600)}h`;
  if (s < 86_400 * 7) return `${Math.floor(s / 86_400)}d`;
  if (s < 86_400 * 30) return `${Math.floor(s / (86_400 * 7))}w`;
  if (s < 86_400 * 365) return `${Math.floor(s / (86_400 * 30))}mo`;
  return `${Math.floor(s / (86_400 * 365))}y`;
}

export function formatCountdown(seconds: bigint): {
  days: number; hours: number; minutes: number; label: string;
} {
  const s = Math.max(0, Number(seconds));
  const days    = Math.floor(s / 86_400);
  const hours   = Math.floor((s % 86_400) / 3_600);
  const minutes = Math.floor((s % 3_600)  / 60);
  const label   = days > 0
    ? `${days}d ${hours}h ${minutes}m`
    : hours > 0
    ? `${hours}h ${minutes}m`
    : `${minutes}m`;
  return { days, hours, minutes, label };
}

export function formatTimestamp(seconds: bigint): string {
  if (!seconds || seconds === 0n) return "—";
  return new Date(Number(seconds) * 1000).toLocaleString("en-GB", {
    day:    "2-digit",
    month:  "short",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function secondsFromNow(targetTimestamp: bigint): bigint {
  const now = BigInt(Math.floor(Date.now() / 1000));
  return targetTimestamp > now ? targetTimestamp - now : 0n;
}

// ── Token formatting ───────────────────────────────────────────────────
export function formatToken(
  amount: bigint,
  decimals = 18,
  maxDecimals = 4,
): string {
  const val = parseFloat(formatUnits(amount, decimals));
  if (val === 0) return "0";
  if (val < 0.0001) return "< 0.0001";
  return val.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  });
}

// ── Basis points ───────────────────────────────────────────────────────
export function bpToPercent(bp: number): string {
  return `${(bp / 100).toFixed(bp % 100 === 0 ? 0 : 2)}%`;
}

// ── Etherscan ──────────────────────────────────────────────────────────
export function etherscanTx(hash: string): string {
  return `https://sepolia.etherscan.io/tx/${hash}`;
}

export function etherscanAddr(addr: string): string {
  return `https://sepolia.etherscan.io/address/${addr}`;
}