"use client";

import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider }                  from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState }                       from "react";
import { wagmiConfig }                    from "@/lib/wagmi";

import "@rainbow-me/rainbowkit/styles.css";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime:      12_000,
        refetchInterval: 15_000,
        retry: 2,
      },
    },
  }));

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor:            "#4edea3",
            accentColorForeground:  "#003824",
            borderRadius:           "small",
            fontStack:              "system",
            overlayBlur:            "small",
          })}
          locale="en-US"
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}