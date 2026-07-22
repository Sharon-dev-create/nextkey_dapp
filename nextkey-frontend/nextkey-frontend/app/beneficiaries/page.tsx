"use client";

import { useState }       from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { isAddress }      from "viem";
import toast              from "react-hot-toast";
import { Plus, Trash2, Users, AlertTriangle } from "lucide-react";
import { AppShell }         from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button }           from "@/components/ui/Button";
import { Input }            from "@/components/ui/Input";
import { FACTORY_ADDRESS, factoryAbi, vaultAbi } from "@/lib/contracts";
import { shortAddress, bpToPercent } from "@/lib/utils";

type BenRow = { wallet: string; basisPoints: string };

export default function BeneficiariesPage() {
  const { address } = useAccount();
  const qc          = useQueryClient();

  const { data: vaultAddress } = useReadContract({
    address:      FACTORY_ADDRESS,
    abi:          factoryAbi,
    functionName: "vaultOf",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address },
  });

  const { data: existing, isLoading } = useReadContract({
    address:      vaultAddress as `0x${string}`,
    abi:          vaultAbi,
    functionName: "getBeneficiaries",
    query:        { enabled: !!vaultAddress, refetchInterval: 15_000 },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  const [rows, setRows]       = useState<BenRow[]>([{ wallet: "", basisPoints: "" }]);
  const [editing, setEditing] = useState(false);

  function addRow() {
    if (rows.length >= 10) return;
    setRows(r => [...r, { wallet: "", basisPoints: "" }]);
  }

  function removeRow(i: number) {
    setRows(r => r.filter((_, idx) => idx !== i));
  }

  function updateRow(i: number, field: keyof BenRow, value: string) {
    setRows(r => r.map((row, idx) => idx === i ? { ...row, [field]: value } : row));
  }

  function totalBP() {
    return rows.reduce((sum, r) => sum + (parseInt(r.basisPoints) || 0), 0);
  }

  function validate(): string | null {
    if (rows.length === 0) return "Add at least one beneficiary.";
    for (const r of rows) {
      if (!isAddress(r.wallet))           return `Invalid address: ${r.wallet || "(empty)"}`;
      if (r.wallet.toLowerCase() === address?.toLowerCase()) return "Owner cannot be a beneficiary.";
      const bp = parseInt(r.basisPoints);
      if (isNaN(bp) || bp <= 0 || bp > 10000) return "Each share must be between 1 and 10000.";
    }
    if (totalBP() !== 10000) return `Shares must total 100% (10000 bp). Current: ${totalBP()} bp.`;
    const wallets = rows.map(r => r.wallet.toLowerCase());
    if (new Set(wallets).size !== wallets.length) return "Duplicate wallet addresses.";
    return null;
  }

  async function handleSave() {
    const err = validate();
    if (err) { toast.error(err); return; }

    const tid = toast.loading("Saving beneficiaries…");
    try {
      await writeContractAsync({
        address:      vaultAddress as `0x${string}`,
        abi:          vaultAbi,
        functionName: "setBeneficiaries",
        args: [
          rows.map(r => r.wallet as `0x${string}`),
          rows.map(r => parseInt(r.basisPoints)),
        ],
      });
      toast.success("Beneficiaries saved.", { id: tid, duration: 5000 });
      setEditing(false);
      setTimeout(() => qc.invalidateQueries(), 4000);
    } catch (e: any) {
      toast.error(e?.message?.includes("User rejected") ? "Rejected." : "Transaction failed.", { id: tid });
    }
  }

  function startEdit() {
    const bens = (existing as any[]) ?? [];
    setRows(
      bens.length > 0
        ? bens.map((b: any) => ({ wallet: b.wallet, basisPoints: String(b.basisPoints) }))
        : [{ wallet: "", basisPoints: "" }],
    );
    setEditing(true);
  }

  const bens   = (existing as any[]) ?? [];
  const total  = totalBP();
  const valid  = total === 10000;

  return (
    <AppShell>
      <div style={{ maxWidth: "720px" }}>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
          <div>
            <div className="label-caps" style={{ marginBottom: "4px" }}>Inheritance</div>
            <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--on-surface)", letterSpacing: "-0.01em" }}>
              Beneficiaries
            </h1>
          </div>
          {!editing && (
            <Button onClick={startEdit} icon={<Users size={14} />} variant="secondary">
              {bens.length > 0 ? "Edit" : "Add Beneficiaries"}
            </Button>
          )}
        </div>

        {/* Current beneficiaries */}
        {!editing && (
          <Card>
            <CardHeader label="Current configuration" title="Asset distribution" />
            {isLoading ? (
              <div style={{ color: "var(--on-surface-variant)", fontSize: "13px" }}>Loading…</div>
            ) : bens.length === 0 ? (
              <div style={{
                padding: "40px 0", textAlign: "center",
                color: "var(--on-surface-variant)", fontSize: "13px",
              }}>
                No beneficiaries configured yet.
              </div>
            ) : (
              <div>
                {/* Distribution bar */}
                <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", marginBottom: "20px" }}>
                  {bens.map((b: any, i: number) => {
                    const colors = ["var(--primary)", "#bec6e0", "#b9c7e0", "#f59e0b", "#ffb4ab"];
                    return (
                      <div
                        key={i}
                        style={{
                          width:      `${(b.basisPoints / 100).toFixed(2)}%`,
                          background: colors[i % colors.length],
                        }}
                      />
                    );
                  })}
                </div>

                {/* Table */}
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                      {["Wallet", "Share", "BP"].map(h => (
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
                    {bens.map((b: any, i: number) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                        <td style={{ padding: "12px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--on-surface)" }}>
                          {shortAddress(b.wallet)}
                        </td>
                        <td style={{ padding: "12px 0", fontSize: "13px", fontWeight: 600, color: "var(--primary)" }}>
                          {bpToPercent(b.basisPoints)}
                        </td>
                        <td style={{ padding: "12px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--on-surface-variant)" }}>
                          {b.basisPoints}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {/* Edit form */}
        {editing && (
          <Card>
            <CardHeader label="Edit" title="Set beneficiaries" />

            <div style={{
              padding: "12px 14px", borderRadius: "4px", marginBottom: "20px",
              background: "rgba(78,222,163,0.06)", border: "1px solid rgba(78,222,163,0.15)",
              fontSize: "12px", color: "var(--on-surface-variant)", lineHeight: 1.6,
            }}>
              Shares are in basis points (bp). 10000 bp = 100%. All shares must add up to exactly 10000.
              Example: two equal beneficiaries = 5000 bp each.
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "20px" }}>
              {rows.map((row, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 140px 36px", gap: "8px", alignItems: "flex-end" }}>
                  <Input
                    label={i === 0 ? "Wallet address" : undefined}
                    placeholder="0x..."
                    mono
                    value={row.wallet}
                    onChange={e => updateRow(i, "wallet", e.target.value)}
                  />
                  <Input
                    label={i === 0 ? "Basis points" : undefined}
                    placeholder="5000"
                    value={row.basisPoints}
                    onChange={e => updateRow(i, "basisPoints", e.target.value.replace(/\D/g, ""))}
                  />
                  <button
                    onClick={() => removeRow(i)}
                    disabled={rows.length === 1}
                    style={{
                      width: "36px", height: "36px", borderRadius: "4px",
                      background: "transparent", border: "1px solid var(--outline-variant)",
                      color: rows.length === 1 ? "var(--outline)" : "#ffb4ab",
                      cursor: rows.length === 1 ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            {/* Total indicator */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "10px 14px", borderRadius: "4px", marginBottom: "20px",
              background: valid ? "rgba(78,222,163,0.06)" : "rgba(255,180,171,0.06)",
              border: `1px solid ${valid ? "rgba(78,222,163,0.2)" : "rgba(255,180,171,0.2)"}`,
            }}>
              <span style={{ fontSize: "12px", color: "var(--on-surface-variant)" }}>
                Total basis points
              </span>
              <span style={{
                fontSize: "14px", fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                color: valid ? "var(--primary)" : "#ffb4ab",
              }}>
                {total} / 10000
              </span>
            </div>

            {!valid && total > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: "6px",
                fontSize: "12px", color: "#ffb4ab", marginBottom: "16px",
              }}>
                <AlertTriangle size={12} />
                {total > 10000 ? `Over by ${total - 10000} bp` : `Short by ${10000 - total} bp`}
              </div>
            )}

            <div style={{ display: "flex", gap: "8px" }}>
              <Button onClick={handleSave} loading={isPending} disabled={!valid}>
                Save Beneficiaries
              </Button>
              <Button variant="secondary" onClick={() => setEditing(false)}>
                Cancel
              </Button>
              {rows.length < 10 && (
                <Button variant="ghost" onClick={addRow} icon={<Plus size={13} />}>
                  Add row
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}