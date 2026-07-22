"use client";

import { useAccount } from "wagmi";
import { useRouter }  from "next/navigation";
import { useEffect }  from "react";
import { Sidebar }    from "./Sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { isConnected } = useAccount();
  const router          = useRouter();

  useEffect(() => {
    if (!isConnected) router.replace("/");
  }, [isConnected, router]);

  if (!isConnected) return null;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main style={{
        marginLeft: "240px",
        flex: 1,
        minHeight: "100vh",
        background: "var(--surface)",
        padding: "32px 40px",
        maxWidth: "calc(100vw - 240px)",
      }}>
        {children}
      </main>
    </div>
  );
}
