"use client";

import { useState, useEffect }  from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useQueryClient }       from "@tanstack/react-query";
import { isAddress }            from "viem";
import toast                    from "react-hot-toast";
import { Settings, Plus, Trash2, Shield } from "lucide-react";
import { AppShell }             from "@/components/layout/AppShell";
import { Card, CardHeader }     from "@/components/ui/Card";
import { Button }               from "@/components/ui/Button";
import { Input }                from "@/components/ui/Input";
import { FACTORY_ADDRESS, factoryAbi, vaultAbi, TIMING_PRESETS, DAY } from "@/lib/contract";
import { formatDuration }       from "@/lib/utils";

function DaySlider({
  label, hint, value, onChange, min, max,
}: {
  label: string; hint: string;
  value: bigint; onChange: (v: bigint) => void;
  min: bigint; max: bigint;
}) {
  const days    = Number(value / DAY);
  const minDays = Number(min  / DAY);
  const maxDays = Number(max  / DAY);

  return (
    <div style={{ marginBottom: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
        <label className="label-caps">{label}</label>
        <span style={{
          fontSize: "13px", fontWeight: 700,
          fontFamily: "'JetBrains Mono', monospace",
          color: "var(--primary)",
        }}>
          {days} days
        </span>
      </div>
      <input
        type="range"
        min={minDays}
        max={maxDays}
        value={days}
        onChange={e => onChange(BigInt(parseInt(e.target.value)) * DAY)}
        style={{
          width: "100%", accentColor: "var(--primary)",
          background: "transparent", cursor: "pointer",
        }}
      />
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        <span style={{ fontSize: "11px", color: "var(--on-surface-variant)" }}>{minDays}d</span>
        <span style={{ fontSize: "11px", color: "var(--on-surface-variant)", textAlign: "center", flex: 1 }}>{hint}</span>
        <span style={{ fontSize: "11px", color: "var(--on-surface-variant)" }}>{maxDays}d</span>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { address } = useAccount();
  const qc          = useQueryClient();

  const { data: hasVault }     = useReadContract({
    address: FACTORY_ADDRESS, abi: factoryAbi,
    functionName: "hasVault",
    args:    address ? [address] : undefined,
    query:   { enabled: !!address },
  });

  const { data: vaultAddress } = useReadContract({
    address: FACTORY_ADDRESS, abi: factoryAbi,
    functionName: "vaultOf",
    args:    address ? [address] : undefined,
    query:   { enabled: !!address && !!hasVault },
  });

  const vb      = { address: vaultAddress as `0x${string}`, abi: vaultAbi };
  const enabled = { query: { enabled: !!vaultAddress } };

  const { data: currentInterval } = useReadContract({ ...vb, functionName: "checkInInterval", ...enabled });
  const { data: currentGrace    } = useReadContract({ ...vb, functionName: "gracePeriod",     ...enabled });
  const { data: currentDelay    } = useReadContract({ ...vb, functionName: "claimDelay",      ...enabled });
  const { data: guardians       } = useReadContract({ ...vb, functionName: "getGuardians",    ...enabled });

  const { writeContractAsync, isPending } = useWriteContract();

  const [interval,  setInterval ] = useState(180n * DAY);
  const [grace,     setGrace    ] = useState(30n  * DAY);
  const [delay,     setDelay    ] = useState(7n   * DAY);
  const [newGuardian, setNewGuardian] = useState("");
  const [guardianErr, setGuardianErr] = useState("");

  // Seed sliders from chain once loaded
  useEffect(() => { if (currentInterval) setInterval(currentInterval as bigint); }, [currentInterval]);
  useEffect(() => { if (currentGrace)    setGrace(currentGrace       as bigint); }, [currentGrace]);
  useEffect(() => { if (currentDelay)    setDelay(currentDelay       as bigint); }, [currentDelay]);

  async function handleCreateVault() {
    const tid = toast.loading("Deploying your vault…");
    try {
      await writeContractAsync({
        address: FACTORY_ADDRESS, abi: factoryAbi,
        functionName: "createVault",
        args: [interval, grace, delay],
      });
      toast.success("Vault deployed.", { id: tid, duration: 6000 });
      setTimeout(() => qc.invalidateQueries(), 5000);
    } catch (e: any) {
      toast.error(e?.message?.includes("User rejected") ? "Rejected." : "Deployment failed.", { id: tid });
    }
  }

  async function handleUpdateTimings() {
    const tid = toast.loading("Updating timings…");
    try {
      await writeContractAsync({
        address: vaultAddress as `0x${string}`, abi: vaultAbi,
        functionName: "updateTimings",
        args: [interval, grace, delay],
      });
      toast.success("Timings updated.", { id: tid });
      setTimeout(() => qc.invalidateQueries(), 4000);
    } catch (e: any) {
      toast.error(e?.message?.includes("User rejected") ? "Rejected." : "Update failed.", { id: tid });
    }
  }

  async function handleAddGuardian() {
    setGuardianErr("");
    if (!isAddress(newGuardian)) { setGuardianErr("Invalid address."); return; }
    const tid = toast.loading("Adding guardian…");
    try {
      await writeContractAsync({
        address: vaultAddress as `0x${string}`, abi: vaultAbi,
        functionName: "addGuardian",
        args: [newGuardian as `0x${string}`],
      });
      toast.success("Guardian added.", { id: tid });
      setNewGuardian("");
      setTimeout(() => qc.invalidateQueries(), 4000);
    } catch (e: any) {
      toast.error(e?.message?.includes("User rejected") ? "Rejected." : "Failed.", { id: tid });
    }
  }

  async function handleRemoveGuardian(g: string) {
    const tid = toast.loading("Removing guardian…");
    try {
      await writeContractAsync({
        address: vaultAddress as `0x${string}`, abi: vaultAbi,
        functionName: "removeGuardian",
        args: [g as `0x${string}`],
      });
      toast.success("Guardian removed.", { id: tid });
      setTimeout(() => qc.invalidateQueries(), 4000);
    } catch (e: any) {
      toast.error("Failed.", { id: tid });
    }
  }

  const isCreating = !hasVault;

  return (
    <AppShell>
      <div style={{ maxWidth: "640px" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div className="label-caps" style={{ marginBottom: "4px" }}>Configuration</div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--on-surface)", letterSpacing: "-0.01em" }}>
            {isCreating ? "Create Your Vault" : "Vault Settings"}
          </h1>
        </div>

        {/* Timings */}
        <Card style={{ marginBottom: "16px" }}>
          <CardHeader
            label="Dead man's switch"
            title="Timing configuration"
          />

          <div style={{
            padding: "12px 14px", borderRadius: "4px", marginBottom: "24px",
            background: "rgba(78,222,163,0.06)", border: "1px solid rgba(78,222,163,0.15)",
            fontSize: "12px", color: "var(--on-surface-variant)", lineHeight: 1.7,
          }}>
            Total minimum time from last check-in to claimable:{" "}
            <strong style={{ color: "var(--on-surface)", fontFamily: "'JetBrains Mono', monospace" }}>
              {formatDuration(interval + grace + delay)}
            </strong>
          </div>

          <DaySlider
            label="Check-in interval"
            hint="How often you must prove liveness"
            value={interval} onChange={setInterval}
            min={30n * DAY} max={730n * DAY}
          />
          <DaySlider
            label="Grace period"
            hint="Buffer after missed check-in"
            value={grace} onChange={setGrace}
            min={7n * DAY} max={180n * DAY}
          />
          <DaySlider
            label="Claim delay"
            hint="Window to cancel after claim is initiated"
            value={delay} onChange={setDelay}
            min={3n * DAY} max={30n * DAY}
          />

          <Button
            onClick={isCreating ? handleCreateVault : handleUpdateTimings}
            loading={isPending}
            icon={<Settings size={14} />}
          >
            {isCreating ? "Deploy Vault" : "Update Timings"}
          </Button>
        </Card>

        {/* Guardians — only show if vault exists */}
        {!isCreating && (
          <Card>
            <CardHeader
              label="Guardian protection"
              title="Trusted addresses"
            />
            <div style={{
              padding: "12px 14px", borderRadius: "4px", marginBottom: "20px",
              background: "rgba(78,222,163,0.06)", border: "1px solid rgba(78,222,163,0.15)",
              fontSize: "12px", color: "var(--on-surface-variant)", lineHeight: 1.6,
            }}>
              Guardians can pause an active claim, giving you time to check in if you are
              incapacitated but not deceased. Only you can fully reactivate the vault.
            </div>

            {/* Current guardians */}
            {((guardians as string[]) ?? []).length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
                {(guardians as string[]).map(g => (
                  <div key={g} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 12px", borderRadius: "4px",
                    background: "var(--surface-container-low)", border: "1px solid var(--outline-variant)",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Shield size={13} color="var(--primary)" />
                      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--on-surface)" }}>
                        {g}
                      </span>
                    </div>
                    <Button size="sm" variant="danger" onClick={() => handleRemoveGuardian(g)} icon={<Trash2 size={11} />}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {((guardians as string[]) ?? []).length === 0 && (
              <div style={{ fontSize: "13px", color: "var(--on-surface-variant)", marginBottom: "20px" }}>
                No guardians configured.
              </div>
            )}

            {/* Add guardian */}
            {((guardians as string[]) ?? []).length < 5 && (
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <Input
                    label="Guardian wallet address"
                    placeholder="0x..."
                    mono
                    value={newGuardian}
                    onChange={e => { setNewGuardian(e.target.value); setGuardianErr(""); }}
                    error={guardianErr}
                  />
                </div>
                <Button
                  onClick={handleAddGuardian}
                  loading={isPending}
                  disabled={!newGuardian}
                  icon={<Plus size={14} />}
                  style={{ marginBottom: guardianErr ? "20px" : "0" }}
                >
                  Add
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </AppShell>
  );
}