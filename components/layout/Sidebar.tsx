"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Coins,
  Settings,
  Activity,
  Shield,
  LogOut,
} from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard",     label: "Dashboard",    icon: LayoutDashboard },
  { href: "/beneficiaries", label: "Beneficiaries",icon: Users           },
  { href: "/assets",        label: "Covered Assets",icon: Coins          },
  { href: "/settings",      label: "Settings",     icon: Settings        },
  { href: "/activity",      label: "Activity Log", icon: Activity        },
];

export function Sidebar() {
  const pathname    = usePathname();
  const { disconnect } = useDisconnect();

  return (
    <aside
      style={{
        width: "240px",
        minHeight: "100vh",
        background: "var(--surface-container-low)",
        borderRight: "1px solid var(--outline-variant)",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        top: 0,
        left: 0,
        bottom: 0,
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid var(--outline-variant)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "6px",
            background: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}>
            <Shield size={16} color="var(--on-primary)" />
          </div>
          <div>
            <div style={{
              fontSize: "15px",
              fontWeight: 600,
              color: "var(--on-surface)",
              letterSpacing: "-0.01em",
            }}>
              NextKey
            </div>
            <div style={{
              fontSize: "10px",
              fontWeight: 600,
              color: "var(--primary)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>
              Inheritance Protocol
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: "2px" }}>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "9px 12px",
                borderRadius: "4px",
                fontSize: "13px",
                fontWeight: active ? 600 : 400,
                color: active ? "var(--primary)" : "var(--on-surface-variant)",
                background: active ? "rgba(78,222,163,0.08)" : "transparent",
                border: active ? "1px solid rgba(78,222,163,0.15)" : "1px solid transparent",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              <Icon size={15} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div style={{
        padding: "16px 10px",
        borderTop: "1px solid var(--outline-variant)",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
      }}>
        <ConnectButton
          accountStatus="avatar"
          chainStatus="icon"
          showBalance={false}
        />
        <button
          onClick={() => disconnect()}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 12px",
            borderRadius: "4px",
            fontSize: "12px",
            color: "var(--on-surface-variant)",
            background: "transparent",
            border: "1px solid transparent",
            cursor: "pointer",
            width: "100%",
            transition: "all 0.15s",
          }}
        >
          <LogOut size={13} strokeWidth={1.5} />
          Disconnect
        </button>
      </div>
    </aside>
  );
}
