"use client";

import { useEffect }        from "react";
import { useRouter }        from "next/navigation";
import { useAccount }       from "wagmi";
import { ConnectButton }    from "@rainbow-me/rainbowkit";
import { Shield, Clock, Users, ArrowRight, Lock } from "lucide-react";
import { HeroIllustration } from "@/components/ui/HeroIllustration";

const FEATURES = [
  {
    icon: Lock,
    title:  "Non-custodial",
    body:   "Your assets never leave your wallet. We only request transfer approval — executed once, and only if you're gone.",
  },
  {
    icon: Clock,
    title:  "Dead man's switch",
    body:   "A configurable check-in interval. Miss it, and a grace period begins. Beneficiaries can only claim after both elapse.",
  },
  {
    icon: Users,
    title:  "Multi-beneficiary",
    body:   "Split assets across up to 10 beneficiaries by percentage. Distributions execute on-chain with no intermediary.",
  },
  {
    icon: Shield,
    title:  "Guardian protection",
    body:   "Designate trusted guardians who can pause an active claim — giving you time to respond if you're incapacitated, not gone.",
  },
];

export default function LandingPage() {
  const { isConnected } = useAccount();
  const router          = useRouter();

  useEffect(() => {
    if (isConnected) router.replace("/dashboard");
  }, [isConnected, router]);

  return (
    <div style={{
      minHeight:   "100vh",
      background:  "var(--surface)",
      display:     "flex",
      flexDirection: "column",
    }}>
      {/* Nav */}
      <nav style={{
        padding:        "20px 48px",
        borderBottom:   "1px solid var(--outline-variant)",
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 32, height: 32,
            borderRadius: "6px",
            background: "var(--primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Shield size={16} color="var(--on-primary)" />
          </div>
          <div>
            <span style={{ fontSize: "15px", fontWeight: 600, color: "var(--on-surface)" }}>
              NextKey
            </span>
            <span style={{
              marginLeft: "8px",
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--primary)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>
              Inheritance Protocol
            </span>
          </div>
        </div>
        <ConnectButton />
      </nav>

      {/* Hero */}
<section style={{
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "60px",
  alignItems: "center",
  padding: "80px 48px",
  maxWidth: "1280px",
  margin: "0 auto",
  width: "100%",
}}>
  {/* Left — copy */}
  <div>
    <div style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      padding: "4px 12px", borderRadius: "2px",
      background: "rgba(78,222,163,0.08)", border: "1px solid rgba(78,222,163,0.2)",
      fontSize: "11px", fontWeight: 600, color: "var(--primary)",
      letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "24px",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)", display: "inline-block" }} />
      Live on Ethereum Sepolia
    </div>

    <h1 style={{
      fontSize: "40px", fontWeight: 700, lineHeight: 1.15,
      letterSpacing: "-0.025em", color: "var(--on-surface)", marginBottom: "18px",
    }}>
      Your crypto.<br />
      <span style={{ color: "var(--primary)" }}>Your legacy.</span>
    </h1>

    <p style={{
      fontSize: "15px", lineHeight: 1.75,
      color: "var(--on-surface-variant)", marginBottom: "36px",
    }}>
      NextKey is a non-custodial inheritance protocol. Designate
      beneficiaries, approve asset access, and prove liveness
      periodically. If you stop — your assets transfer automatically.
      No lawyers. No intermediaries. Code only.
    </p>

    <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
      <ConnectButton label="Connect Wallet to Start" />
      <a
        href={`https://sepolia.etherscan.io/address/${process.env.NEXT_PUBLIC_FACTORY_ADDRESS}`}
        target="_blank" rel="noopener noreferrer"
        style={{
          display: "inline-flex", alignItems: "center", gap: "6px",
          fontSize: "13px", color: "var(--on-surface-variant)", textDecoration: "none",
        }}
      >
        View contracts <ArrowRight size={13} />
      </a>
    </div>

    {/* Stats row */}
    <div style={{
      display: "flex", gap: "24px", marginTop: "40px",
      paddingTop: "28px", borderTop: "1px solid var(--outline-variant)",
    }}>
      {[
        { value: "0%",    label: "Custody risk"     },
        { value: "100%",  label: "On-chain"         },
        { value: "10",    label: "Max beneficiaries"},
      ].map(({ value, label }) => (
        <div key={label}>
          <div style={{
            fontSize: "22px", fontWeight: 700,
            color: "var(--primary)",
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {value}
          </div>
          <div style={{ fontSize: "11px", color: "var(--on-surface-variant)", marginTop: "2px" }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  </div>

  {/* Right — SVG illustration */}
  <div style={{
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  }}>
    <HeroIllustration />
  </div>
</section>

      {/* Footer */}
      <footer style={{
        borderTop:      "1px solid var(--outline-variant)",
        padding:        "20px 48px",
        display:        "flex",
        justifyContent: "space-between",
        alignItems:     "center",
      }}>
        <span style={{ fontSize: "12px", color: "var(--on-surface-variant)" }}>
          NextKey Protocol · Ethereum Sepolia
        </span>
        <span style={{
          fontSize:    "11px",
          fontFamily:  "'JetBrains Mono', monospace",
          color:       "var(--outline)",
        }}>
          {process.env.NEXT_PUBLIC_FACTORY_ADDRESS?.slice(0, 6)}…
          {process.env.NEXT_PUBLIC_FACTORY_ADDRESS?.slice(-4)}
        </span>
      </footer>
    </div>
  );
}
