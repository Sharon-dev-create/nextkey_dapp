"use client";

import { useAccount, useReadContract } from "wagmi";
import { usePublicClient }             from "wagmi";
import { useState, useEffect }         from "react";
import { AppShell }                    from "@/components/layout/AppShell";
import { Card, CardHeader }            from "@/components/ui/Card";
import { FACTORY_ADDRESS, factoryAbi, vaultAbi } from "@/lib/contract";
import { formatTimestamp, shortAddress, etherscanTx } from "@/lib/utils";
import { ExternalLink, RefreshCw }     from "lucide-react";
import { Button }                      from "@/components/ui/Button";
import { parseAbiItem }                from "viem";

type LogEntry = {
  event:    string;
  detail:   string;
  hash:     string;
  block:    bigint;
  time?:    bigint;
};

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  CheckedIn:       { label: "Check-in",            color: "var(--primary)" },
  BeneficiariesSet:{ label: "Beneficiaries set",   color: "#bec6e0"        },
  ClaimInitiated:  { label: "Claim initiated",      color: "#ffb4ab"        },
  ClaimExecuted:   { label: "Claim executed",       color: "#ffb4ab"        },
  ClaimCancelled:  { label: "Claim cancelled",      color: "var(--primary)" },
  ClaimPaused:     { label: "Claim paused",         color: "#f59e0b"        },
  VaultReactivated:{ label: "Vault reactivated",    color: "var(--primary)" },
  TokenRegistered: { label: "Token registered",     color: "#bec6e0"        },
  TokenUnregistered:{ label: "Token removed",       color: "#f59e0b"        },
  GuardianAdded:   { label: "Guardian added",       color: "#bec6e0"        },
  GuardianRemoved: { label: "Guardian removed",     color: "#f59e0b"        },
  TimingsUpdated:  { label: "Timings updated",      color: "#bec6e0"        },
};

export default function ActivityPage() {
  const { address }   = useAccount();
  const publicClient  = usePublicClient();
  const [logs, setLogs]       = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const { data: vaultAddress } = useReadContract({
    address:      FACTORY_ADDRESS,
    abi:          factoryAbi,
    functionName: "vaultOf",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address },
  });

  async function fetchLogs() {
    if (!vaultAddress || !publicClient) return;
    setLoading(true);
    try {
      const eventNames = Object.keys(EVENT_LABELS);
      const allLogs: LogEntry[] = [];

      for (const eventName of eventNames) {
        const abiItem = vaultAbi.find(
          (x): x is typeof x & { type: "event"; name: string } =>
            x.type === "event" && "name" in x && x.name === eventName,
        );
        if (!abiItem) continue;

        try {
          const raw = await publicClient.getLogs({
            address:   vaultAddress as `0x${string}`,
            event:     abiItem as any,
            fromBlock: 0n,
            toBlock:   "latest",
          });

          for (const log of raw) {
            allLogs.push({
              event:  eventName,
              detail: buildDetail(eventName, log.args),
              hash:   log.transactionHash ?? "",
              block:  log.blockNumber ?? 0n,
            });
          }
        } catch {
          // Some events may not exist on older blocks — skip
        }
      }

      // Sort newest first
      allLogs.sort((a, b) => Number(b.block - a.block));

      // Fetch block timestamps
      const blocks = [...new Set(allLogs.map(l => l.block))];
      const timestamps = await Promise.all(
        blocks.map(b => publicClient.getBlock({ blockNumber: b })),
      );
      const blockTime = new Map(timestamps.map(b => [b.number, b.timestamp]));

      setLogs(allLogs.map(l => ({ ...l, time: blockTime.get(l.block) })));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLogs(); }, [vaultAddress]);

  function buildDetail(event: string, args: any): string {
    if (!args) return "";
    switch (event) {
      case "ClaimInitiated":  return `Initiator: ${shortAddress(args.initiator ?? "")}`;
      case "ClaimPaused":     return `Paused by: ${shortAddress(args.pausedBy ?? "")}`;
      case "ClaimCancelled":  return `Cancelled by: ${shortAddress(args.cancelledBy ?? "")}`;
      case "TokenRegistered": return `Token: ${shortAddress(args.token ?? "")}`;
      case "TokenUnregistered":return `Token: ${shortAddress(args.token ?? "")}`;
      case "GuardianAdded":   return `Guardian: ${shortAddress(args.guardian ?? "")}`;
      case "GuardianRemoved": return `Guardian: ${shortAddress(args.guardian ?? "")}`;
      case "TimingsUpdated":  return `Interval: ${Number((args.checkInInterval ?? 0n) / 86400n)}d`;
      default:                return "";
    }
  }

  return (
    <AppShell>
      <div style={{ maxWidth: "860px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div className="label-caps" style={{ marginBottom: "4px" }}>On-chain</div>
            <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--on-surface)", letterSpacing: "-0.01em" }}>
              Activity Log
            </h1>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchLogs}
            loading={loading}
            icon={<RefreshCw size={13} />}
          >
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader label={`${logs.length} events`} title="Vault history" />

          {loading && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--on-surface-variant)", fontSize: "13px" }}>
              Fetching on-chain events…
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div style={{ padding: "40px 0", textAlign: "center", color: "var(--on-surface-variant)", fontSize: "13px" }}>
              No activity found.{vaultAddress ? "" : " Connect your wallet."}
            </div>
          )}

          {!loading && logs.length > 0 && (
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                  {["Event", "Detail", "Block", "Timestamp", "Tx"].map(h => (
                    <th key={h} style={{
                      textAlign: "left", padding: "6px 0 10px",
                      fontSize: "11px", fontWeight: 600,
                      letterSpacing: "0.07em", textTransform: "uppercase",
                      color: "var(--on-surface-variant)",
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const cfg = EVENT_LABELS[log.event] ?? { label: log.event, color: "var(--on-surface)" };
                  return (
                    <tr key={i} style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                      <td style={{ padding: "12px 0" }}>
                        <span style={{
                          fontSize: "11px", fontWeight: 600,
                          color: cfg.color,
                          padding: "2px 6px", borderRadius: "2px",
                          background: `${cfg.color}18`,
                        }}>
                          {cfg.label}
                        </span>
                      </td>
                      <td style={{ padding: "12px 0", fontSize: "12px", color: "var(--on-surface-variant)", fontFamily: "'JetBrains Mono', monospace" }}>
                        {log.detail || "—"}
                      </td>
                      <td style={{ padding: "12px 0", fontSize: "12px", fontFamily: "'JetBrains Mono', monospace", color: "var(--on-surface-variant)" }}>
                        {log.block.toString()}
                      </td>
                      <td style={{ padding: "12px 0", fontSize: "12px", color: "var(--on-surface-variant)" }}>
                        {log.time ? formatTimestamp(log.time) : "—"}
                      </td>
                      <td style={{ padding: "12px 0" }}>
                        {log.hash ? (
                          
                            href={etherscanTx(log.hash)}
                            target="_blank" rel="noopener noreferrer"
                            style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}
                          >
                            <ExternalLink size={12} />
                          </a>
                        ) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </AppShell>
  );
}