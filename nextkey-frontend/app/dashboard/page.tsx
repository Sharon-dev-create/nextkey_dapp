"use client";

import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useQueryClient }   from "@tanstack/react-query";
import { AppShell }         from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { StatusBadge }      from "@/components/ui/StatusBadge";
import { Button }           from "@/components/ui/Button";
import {
  FACTORY_ADDRESS, factoryAbi, vaultAbi,
  VAULT_STATUS, type VaultStatus,
} from "@/lib/contract";
import {
  formatCountdown, formatTimestamp,
  formatDuration, secondsFromNow, shortAddress,
} from "@/lib/utils";
import {
  AlertTriangle, CheckCircle, ArrowRight, Plus,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter }           from "next/navigation";
import toast                   from "react-hot-toast";
import Link                    from "next/link";

function CheckInCountdown({ seconds }: { seconds: bigint }) {
  const total     = Number(seconds);
  const { label } = formatCountdown(seconds);
  const urgency   = total < 86_400 * 7  ? "error"
                  : total < 86_400 * 30 ? "warning"
                  : "ok";
  const barColor  = urgency === "error"   ? "#ffb4ab"
                  : urgency === "warning" ? "#f59e0b"
                  : "var(--primary)";
  const pct = Math.min(100, Math.max(2, (total / (86_400 * 180)) * 100));

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px" }}>
        <span className="label-caps">Next check-in due in</span>
        <span style={{ fontSize: "22px", fontWeight: 700, color: barColor, fontFamily: "'JetBrains Mono', monospace" }}>
          {label}
        </span>
      </div>
      <div style={{ height: "4px", background: "var(--surface-container-high)", borderRadius: "2px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: barColor, borderRadius: "2px", transition: "width 1s linear" }} />
      </div>
      {urgency !== "ok" && (
        <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: barColor }}>
          <AlertTriangle size={12} />
          {urgency === "error"
            ? "Check-in overdue — check in immediately to prevent a claim."
            : "Check-in due soon — schedule your check-in."}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { address } = useAccount();
  const router      = useRouter();
  const qc          = useQueryClient();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  const { data: hasVault, isLoading: checkingVault } = useReadContract({
    address:      FACTORY_ADDRESS,
    abi:          factoryAbi,
    functionName: "hasVault",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address },
  });

  const { data: vaultAddress } = useReadContract({
    address:      FACTORY_ADDRESS,
    abi:          factoryAbi,
    functionName: "vaultOf",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address && !!hasVault },
  });

  const vb      = { address: vaultAddress as `0x${string}`, abi: vaultAbi };
  const enabled = { query: { enabled: !!vaultAddress, refetchInterval: 15_000 } };

  const { data: status           } = useReadContract({ ...vb, functionName: "status",              ...enabled });
  const { data: lastCheckIn      } = useReadContract({ ...vb, functionName: "lastCheckIn",         ...enabled });
  const { data: checkInInterval  } = useReadContract({ ...vb, functionName: "checkInInterval",     ...enabled });
  const { data: gracePeriod      } = useReadContract({ ...vb, functionName: "gracePeriod",         ...enabled });
  const { data: claimDelay       } = useReadContract({ ...vb, functionName: "claimDelay",          ...enabled });
  const { data: secondsLeft      } = useReadContract({ ...vb, functionName: "secondsUntilOverdue", ...enabled });
  const { data: beneficiaries    } = useReadContract({ ...vb, functionName: "getBeneficiaries",    ...enabled });
  const { data: tokens           } = useReadContract({ ...vb, functionName: "getRegisteredTokens", ...enabled });
  const { data: claimExecutableAt} = useReadContract({ ...vb, functionName: "claimExecutableAt",   ...enabled });

  const { writeContractAsync, isPending: checkingIn } = useWriteContract();

  async function handleCheckIn() {
    if (!vaultAddress) return;
    const tid = toast.loading("Signing check-in…");
    try {
      await writeContractAsync({ address: vaultAddress as `0x${string}`, abi: vaultAbi, functionName: "checkIn" });
      toast.success("Check-in confirmed.", { id: tid, duration: 5000 });
      setTimeout(() => qc.invalidateQueries(), 4000);
    } catch (e: any) {
      toast.error(e?.message?.includes("User rejected") ? "Rejected." : "Check-in failed.", { id: tid });
    }
  }

  const vaultStatus  = (status ?? 0) as VaultStatus;
  const statusConfig = VAULT_STATUS[vaultStatus];
  const secondsUntilExec = claimExecutableAt
    ? secondsFromNow(claimExecutableAt as bigint) : 0n;

  if (!checkingVault && !hasVault) {
    return (
      <AppShell>
        <div style={{ maxWidth: "480px", margin: "80px auto", textAlign: "center" }}>
          <div style={{
            width: 64, height: 64, borderRadius: "12px",
            background: "rgba(78,222,163,0.08)", border: "1px solid rgba(78,222,163,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px",
          }}>
            <Plus size={28} color="var(--primary)" strokeWidth={1.5} />
          </div>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--on-surface)", marginBottom: "12px" }}>
            No vault found
          </h2>
          <p style={{ fontSize: "14px", lineHeight: 1.6, color: "var(--on-surface-variant)", marginBottom: "28px" }}>
            You don&apos;t have an inheritance vault yet. Create one to start protecting your assets.
          </p>
          <Button onClick={() => router.push("/settings?create=true")} icon={<Plus size={14} />}>
            Create My Vault
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div style={{ maxWidth: "1280px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div className="label-caps" style={{ marginBottom: "4px" }}>Vault Dashboard</div>
            <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--on-surface)", letterSpacing: "-0.01em" }}>
              Inheritance Overview
            </h1>
          </div>
          <StatusBadge
            status={statusConfig.label.toLowerCase() as any}
            label={statusConfig.label}
            pulse={vaultStatus === 0}
          />
        </div>

        {/* Check-in card */}
        <Card style={{ marginBottom: "20px" }}>
          <CheckInCountdown seconds={secondsLeft ?? 0n} />
          <div style={{
            marginTop: "20px", paddingTop: "20px",
            borderTop: "1px solid var(--outline-variant)",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <div style={{ fontSize: "12px", color: "var(--on-surface-variant)" }}>
              Last check-in:{" "}
              <span style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--on-surface)" }}>
                {lastCheckIn ? formatTimestamp(lastCheckIn as bigint) : "—"}
              </span>
            </div>
            <Button onClick={handleCheckIn} loading={checkingIn} icon={<CheckCircle size={14} />} disabled={vaultStatus === 3}>
              Check In Now
            </Button>
          </div>
        </Card>

        {/* Claim warning */}
        {vaultStatus === 2 && (
          <div style={{
            marginBottom: "20px", padding: "16px 20px", borderRadius: "6px",
            background: "rgba(255,180,171,0.06)", border: "1px solid rgba(255,180,171,0.25)",
            display: "flex", alignItems: "center", gap: "12px",
          }}>
            <AlertTriangle size={16} color="#ffb4ab" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#ffb4ab", marginBottom: "2px" }}>
                Claim in progress
              </div>
              <div style={{ fontSize: "12px", color: "var(--on-surface-variant)" }}>
                A beneficiary has initiated a claim. Executable in{" "}
                <span style={{ color: "#ffb4ab", fontFamily: "'JetBrains Mono', monospace" }}>
                  {formatCountdown(secondsUntilExec).label}
                </span>
                {" "}— check in now to cancel.
              </div>
            </div>
            <Button variant="danger" onClick={handleCheckIn} loading={checkingIn} size="sm">
              Cancel Claim
            </Button>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          {[
            { label: "Check-in Interval", value: checkInInterval ? formatDuration(checkInInterval as bigint) : "—" },
            { label: "Grace Period",      value: gracePeriod     ? formatDuration(gracePeriod     as bigint) : "—" },
            { label: "Claim Delay",       value: claimDelay      ? formatDuration(claimDelay      as bigint) : "—" },
            { label: "Beneficiaries",     value: beneficiaries   ? String((beneficiaries as any[]).length)   : "0" },
            { label: "Covered Assets",    value: tokens          ? `${(tokens as any[]).length} tokens`      : "0 tokens" },
          ].map(({ label, value }) => (
            <Card key={label} padding="16px 20px">
              <div className="label-caps" style={{ marginBottom: "6px" }}>{label}</div>
              <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--on-surface)", fontFamily: "'JetBrains Mono', monospace" }}>
                {value}
              </div>
            </Card>
          ))}
        </div>

        {/* Vault address + quick links */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <Card>
            <CardHeader label="Vault Contract" title="Your vault address" />
            <div style={{
              padding: "10px 12px", background: "var(--surface-container-low)",
              borderRadius: "4px", border: "1px solid var(--outline-variant)",
              fontFamily: "'JetBrains Mono', monospace", fontSize: "12px",
              color: "var(--on-surface)", wordBreak: "break-all", marginBottom: "12px",
            }}>
              {vaultAddress ?? "—"}
            </div>
            
              href={`https://sepolia.etherscan.io/address/${vaultAddress}`}
              target="_blank" rel="noopener noreferrer"
              style={{ fontSize: "12px", color: "var(--primary)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              View on Etherscan <ArrowRight size={11} />
            </a>
          </Card>

          <Card>
            <CardHeader label="Quick Actions" title="Manage your vault" />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { href: "/beneficiaries", label: "Manage beneficiaries" },
                { href: "/assets",        label: "Cover assets"         },
                { href: "/settings",      label: "Update timings"       },
                { href: "/activity",      label: "View activity log"    },
              ].map(({ href, label }) => (
                <Link key={href} href={href} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "9px 12px", borderRadius: "4px",
                  background: "var(--surface-container-low)", border: "1px solid var(--outline-variant)",
                  fontSize: "13px", color: "var(--on-surface)", textDecoration: "none",
                }}>
                  {label}
                  <ArrowRight size={13} color="var(--on-surface-variant)" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}