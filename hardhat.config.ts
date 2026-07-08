import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

// Validate required env vars before anything runs
const PRIVATE_KEY  = process.env.PRIVATE_KEY;
const SEPOLIA_RPC  = process.env.SEPOLIA_RPC_URL;
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.26",
    settings: {
      optimizer: {
        enabled: true,
        runs:    200,
      },
    },
  },

  networks: {
    // Local hardhat network — used by tests
    hardhat: {
      chainId: 31337,
    },

    // Sepolia testnet
    sepolia: {
      url:      SEPOLIA_RPC ?? "https://rpc.ankr.com/eth_sepolia",
      accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
      chainId:  11155111,
    },
  },

  etherscan: {
  apiKey: process.env.ETHERSCAN_API_KEY!,
},

  // Typechain output
  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },

  // Gas reporter (optional — set REPORT_GAS=true to enable)
  gasReporter: {
    enabled:  process.env.REPORT_GAS === "true",
    currency: "USD",
  },
};

export default config;