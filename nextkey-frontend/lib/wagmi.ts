import { getDefaultConfig } from "rainbow-me/rainbowKit";
import { sepolia } from "wagmi/chains";

export const wagmiConfig = getDefaultConfig ({
    appName:     "NextKey — Inheritance Protocol",
  projectId:   process.env.NEXT_PUBLIC_WALLETCONNECT_ID ?? "nextkey_dev",
  chains:      [sepolia],
  ssr:         true,
});
