"use client";

import { useState }       from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { useQueryClient } from "@tanstack/react-query";
import { isAddress }      from "viem";
import toast              from "react-hot-toast";
import { Plus, Trash2, ShieldCheck, ShieldOff, ExternalLink } from "lucide-react";
import { AppShell }         from "@/components/layout/AppShell";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button }           from "@/components/ui/Button";
import { Input }            from "@/components/ui/Input";
import { FACTORY_ADDRESS, factoryAbi, vaultAbi } from "@/lib/contract";
import { shortAddress, formatToken }              from "@/lib/utils";
import { erc20Abi, formatUnits }                  from "viem";
import { useReadContracts }                       from "wagmi";

const COMMON_TOKENS: { symbol: string; address: `0x${string}`; decimals: number }[] = [
  { symbol: "USDC",  address: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", decimals: 6  },
  { symbol: "WETH",  address: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14", decimals: 18 },
  { symbol: "LINK",  address: "0x779877A7B0D9E8603169DdbD7836e478b4624789", decimals: 18 },
  { symbol: "DAI",   address: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357", decimals: 18 },
];

function TokenRow({
  token,
  vaultAddress,
  ownerAddress,
  registered,
  onRegister,
  onUnregister,
}: {
  token: { symbol: string; address: `0x${string}`; decimals: number };
  vaultAddress: `0x${string}`;
  ownerAddress: `0x${string}`;
  registered: boolean;
  onRegister:   (addr: `0x${string}`) => void;
  onUnregister: (addr: `0x${string}`) => void;
}) {
  const { data } = useReadContracts({
    contracts: [
      { address: token.address, abi: erc20Abi, functionName: "balanceOf", args: [ownerAddress] },
      { address: token.address, abi: erc20Abi, functionName: "allowance", args: [ownerAddress, vaultAddress] },
    ],
    query: { refetchInterval: 15_000 },
  });

  const balance   = (data?.[0]?.result as bigint | undefined) ?? 0n;
  const allowance = (data?.[1]?.result as bigint | undefined) ?? 0n;
  const approved  = allowance > 0n;
  const distributable = allowance < balance ? allowance : balance;

  return (
    <tr style={{ borderBottom: "1px solid var(--outline-variant)" }}>
      <td style={{ padding: "14px 0" }}>
        <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--on-surface)" }}>{token.symbol}</div>
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "11px", color: "var(--on-surface-variant)" }}>
          {shortAddress(token.address)}
        </div>
      </td>
      <td style={{ padding: "14px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--on-surface)" }}>
        {formatToken(balance, token.decimals)}
      </td>
      <td style={{ padding: "14px 0" }}>
        {approved ? (
          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--primary)", display: "flex", alignItems: "center", gap: "4px" }}>
            <ShieldCheck size={12} /> Approved
          </span>
        ) : (
          <span style={{ fontSize: "11px", color: "var(--on-surface-variant)", display: "flex", alignItems: "center", gap: "4px" }}>
            <ShieldOff size={12} /> Not approved
          </span>
        )}
      </td>
      <td style={{ padding: "14px 0", fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: approved ? "var(--primary)" : "var(--outline)" }}>
        {approved ? formatToken(distributable, token.decimals) : "—"}
      </td>
      <td style={{ padding: "14px 0" }}>
        <div style={{ display: "flex", gap: "6px" }}>
          {registered ? (
            <Button size="sm" variant="danger" onClick={() => onUnregister(token.address)} icon={<Trash2 size={11} />}>
              Remove
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => onRegister(token.address)} icon={<Plus size={11} />}>
              Cover
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export default function AssetsPage() {
  const { address } = useAccount();
  const qc          = useQueryClient();

  const { data: vaultAddress } = useReadContract({
    address:      FACTORY_ADDRESS,
    abi:          factoryAbi,
    functionName: "vaultOf",
    args:         address ? [address] : undefined,
    query:        { enabled: !!address },
  });

  const { data: registeredTokens } = useReadContract({
    address:      vaultAddress as `0x${string}`,
    abi:          vaultAbi,
    functionName: "getRegisteredTokens",
    query:        { enabled: !!vaultAddress, refetchInterval: 15_000 },
  });

  const { writeContractAsync, isPending } = useWriteContract();
  const [customAddress, setCustomAddress] = useState("");
  const [customError, setCustomError]     = useState("");

  const registered = new Set(((registeredTokens as string[]) ?? []).map(a => a.toLowerCase()));

  async function registerToken(tokenAddr: `0x${string}`) {
    const tid = toast.loading("Registering token…");
    try {
      await writeContractAsync({
        address: vaultAddress as `0x${string}`,
        abi:     vaultAbi,
        functionName: "registerToken",
        args:    [tokenAddr],
      });
      toast.success("Token registered.", { id: tid });
      setTimeout(() => qc.invalidateQueries(), 4000);
    } catch (e: any) {
      toast.error(e?.message?.includes("User rejected") ? "Rejected." : "Failed.", { id: tid });
    }
  }

  async function unregisterToken(tokenAddr: `0x${string}`) {
    const tid = toast.loading("Removing token…");
    try {
      await writeContractAsync({
        address: vaultAddress as `0x${string}`,
        abi:     vaultAbi,
        functionName: "unregisterToken",
        args:    [tokenAddr],
      });
      toast.success("Token removed.", { id: tid });
      setTimeout(() => qc.invalidateQueries(), 4000);
    } catch (e: any) {
      toast.error(e?.message?.includes("User rejected") ? "Rejected." : "Failed.", { id: tid });
    }
  }

  async function addCustomToken() {
    setCustomError("");
    if (!isAddress(customAddress)) { setCustomError("Invalid address."); return; }
    await registerToken(customAddress as `0x${string}`);
    setCustomAddress("");
  }

  if (!vaultAddress || !address) return <AppShell><div style={{ color: "var(--on-surface-variant)", padding: "40px" }}>Connect your wallet.</div></AppShell>;

  return (
    <AppShell>
      <div style={{ maxWidth: "900px" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <div className="label-caps" style={{ marginBottom: "4px" }}>Asset Management</div>
          <h1 style={{ fontSize: "22px", fontWeight: 600, color: "var(--on-surface)", letterSpacing: "-0.01em" }}>
            Covered Assets
          </h1>
        </div>

        {/* Info banner */}
        <div style={{
          padding: "14px 16px", borderRadius: "4px", marginBottom: "24px",
          background: "rgba(78,222,163,0.06)", border: "1px solid rgba(78,222,163,0.15)",
          fontSize: "13px", color: "var(--on-surface-variant)", lineHeight: 1.6,
        }}>
          <strong style={{ color: "var(--on-surface)" }}>Your assets stay in your wallet.</strong>{" "}
          Registering a token tells the vault which assets to distribute. You must also
          approve the vault on each token contract so it can transfer on your behalf at claim time.
          You can revoke approval at any time.
        </div>

        {/* Token table */}
        <Card style={{ marginBottom: "20px" }}>
          <CardHeader label="Sepolia Testnet" title="Common tokens" />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--outline-variant)" }}>
                  {["Token", "Your Balance", "Approval", "Distributable", "Action"].map(h => (
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
                {COMMON_TOKENS.map(token => (
                  <TokenRow
                    key={token.address}
                    token={token}
                    vaultAddress={vaultAddress as `0x${string}`}
                    ownerAddress={address as `0x${string}`}
                    registered={registered.has(token.address.toLowerCase())}
                    onRegister={registerToken}
                    onUnregister={unregisterToken}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Custom token */}
        <Card>
          <CardHeader label="Custom" title="Add any ERC-20 token" />
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Token contract address"
                placeholder="0x..."
                mono
                value={customAddress}
                onChange={e => { setCustomAddress(e.target.value); setCustomError(""); }}
                error={customError}
              />
            </div>
            <Button
              onClick={addCustomToken}
              loading={isPending}
              disabled={!customAddress}
              icon={<Plus size={14} />}
              style={{ marginBottom: customError ? "20px" : "0" }}
            >
              Register
            </Button>
          </div>
        </Card>

        {/* Registered list */}
        {(registeredTokens as string[] ?? []).length > 0 && (
          <Card style={{ marginTop: "20px" }}>
            <CardHeader label="Vault registry" title="Registered for distribution" />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {(registeredTokens as string[]).map(addr => (
                <div key={addr} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 12px", borderRadius: "4px",
                  background: "var(--surface-container-low)", border: "1px solid var(--outline-variant)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <ShieldCheck size={14} color="var(--primary)" />
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "12px", color: "var(--on-surface)" }}>
                      {addr}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    
                      href={`https://sepolia.etherscan.io/token/${addr}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ color: "var(--on-surface-variant)", display: "flex", alignItems: "center" }}
                    >
                      <ExternalLink size={12} />
                    </a>
                    <Button size="sm" variant="danger" onClick={() => unregisterToken(addr as `0x${string}`)}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </AppShell>
  );
}