import { type Address } from "viem";

// ── Deployed addresses (update after deployment) ───────────────────────
export const FACTORY_ADDRESS = process.env
  .NEXT_PUBLIC_FACTORY_ADDRESS as Address;

// ── VaultFactory ABI ───────────────────────────────────────────────────
export const factoryAbi = [
  {
    name: "createVault",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "checkInInterval", type: "uint256" },
      { name: "gracePeriod",     type: "uint256" },
      { name: "claimDelay",      type: "uint256" },
    ],
    outputs: [{ name: "vault", type: "address" }],
  },
  {
    name: "getVault",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "vaultOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    name: "hasVault",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    name: "totalVaults",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getVaults",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "offset", type: "uint256" },
      { name: "limit",  type: "uint256" },
    ],
    outputs: [{ name: "vaults", type: "address[]" }],
  },
  {
    name: "VaultCreated",
    type: "event",
    inputs: [
      { name: "owner",           type: "address", indexed: true  },
      { name: "vault",           type: "address", indexed: true  },
      { name: "checkInInterval", type: "uint256", indexed: false },
      { name: "gracePeriod",     type: "uint256", indexed: false },
      { name: "claimDelay",      type: "uint256", indexed: false },
      { name: "timestamp",       type: "uint256", indexed: false },
    ],
  },
] as const;

// ── InheritanceVault ABI ───────────────────────────────────────────────
export const vaultAbi = [
  // ── Reads ──────────────────────────────────────────────────────────
  { name: "owner",           type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "factory",         type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "status",          type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint8"   }] },
  { name: "checkInInterval", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "gracePeriod",     type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "claimDelay",      type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "lastCheckIn",     type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "claimInitiatedAt",type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "claimInitiator",  type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "isBeneficiary",   type: "function", stateMutability: "view", inputs: [{ name: "addr", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "isGuardian",      type: "function", stateMutability: "view", inputs: [{ name: "addr", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "isRegisteredToken",type:"function", stateMutability: "view", inputs: [{ name: "addr", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  {
    name: "getBeneficiaries",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{
      name: "",
      type: "tuple[]",
      components: [
        { name: "wallet",      type: "address" },
        { name: "basisPoints", type: "uint16"  },
      ],
    }],
  },
  { name: "getRegisteredTokens", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address[]" }] },
  { name: "getGuardians",        type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address[]" }] },
  { name: "secondsUntilOverdue", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "claimInitiableAt",    type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "claimExecutableAt",   type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "isOverdue",           type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "bool"    }] },
  {
    name: "distributableBalance",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "previewDistribution",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "token", type: "address" }],
    outputs: [
      { name: "wallets", type: "address[]" },
      { name: "amounts", type: "uint256[]" },
    ],
  },

  // ── Writes ─────────────────────────────────────────────────────────
  { name: "checkIn",        type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  {
    name: "updateTimings",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_checkInInterval", type: "uint256" },
      { name: "_gracePeriod",     type: "uint256" },
      { name: "_claimDelay",      type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "setBeneficiaries",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "wallets", type: "address[]" },
      { name: "shares",  type: "uint16[]"  },
    ],
    outputs: [],
  },
  { name: "registerToken",   type: "function", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }], outputs: [] },
  { name: "unregisterToken", type: "function", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }], outputs: [] },
  { name: "addGuardian",     type: "function", stateMutability: "nonpayable", inputs: [{ name: "guardian", type: "address" }], outputs: [] },
  { name: "removeGuardian",  type: "function", stateMutability: "nonpayable", inputs: [{ name: "guardian", type: "address" }], outputs: [] },
  { name: "initiateClaim",   type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "executeClaim",    type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "pauseClaim",      type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },

  // ── Events ─────────────────────────────────────────────────────────
  { name: "CheckedIn",       type: "event", inputs: [{ name: "timestamp",    type: "uint256", indexed: false }] },
  { name: "BeneficiariesSet",type: "event", inputs: [{ name: "wallets",      type: "address[]",indexed: false }, { name: "shares", type: "uint16[]", indexed: false }] },
  { name: "ClaimInitiated",  type: "event", inputs: [{ name: "initiator",    type: "address", indexed: true  }, { name: "executableAt", type: "uint256", indexed: false }] },
  { name: "ClaimExecuted",   type: "event", inputs: [{ name: "timestamp",    type: "uint256", indexed: false }] },
  { name: "ClaimPaused",     type: "event", inputs: [{ name: "pausedBy",     type: "address", indexed: true  }] },
  { name: "ClaimCancelled",  type: "event", inputs: [{ name: "cancelledBy",  type: "address", indexed: true  }] },
  { name: "VaultReactivated",type: "event", inputs: [{ name: "timestamp",    type: "uint256", indexed: false }] },
  { name: "TokenRegistered", type: "event", inputs: [{ name: "token",        type: "address", indexed: true  }] },
  { name: "TokenUnregistered",type:"event", inputs: [{ name: "token",        type: "address", indexed: true  }] },
  { name: "GuardianAdded",   type: "event", inputs: [{ name: "guardian",     type: "address", indexed: true  }] },
  { name: "GuardianRemoved", type: "event", inputs: [{ name: "guardian",     type: "address", indexed: true  }] },
  { name: "TimingsUpdated",  type: "event", inputs: [
    { name: "checkInInterval", type: "uint256", indexed: false },
    { name: "gracePeriod",     type: "uint256", indexed: false },
    { name: "claimDelay",      type: "uint256", indexed: false },
  ]},
] as const;

// ── Types ──────────────────────────────────────────────────────────────
export type VaultStatus = 0 | 1 | 2 | 3;

export const VAULT_STATUS = {
  0: { label: "Active",    color: "emerald" },
  1: { label: "Inactive",  color: "amber"   },
  2: { label: "Claiming",  color: "red"     },
  3: { label: "Claimed",   color: "slate"   },
} as const;

export type Beneficiary = {
  wallet:      Address;
  basisPoints: number;
};

// ── Time constants ─────────────────────────────────────────────────────
export const DAY = 86_400;

export const TIMING_PRESETS = {
  checkIn: [
    { label: "30 days",  value: 30  * DAY },
    { label: "90 days",  value: 90  * DAY },
    { label: "180 days", value: 180 * DAY },
    { label: "365 days", value: 365 * DAY },
    { label: "2 years",  value: 730 * DAY },
  ],
  grace: [
    { label: "7 days",   value: 7  * DAY },
    { label: "14 days",  value: 14 * DAY },
    { label: "30 days",  value: 30 * DAY },
    { label: "60 days",  value: 60 * DAY },
  ],
  delay: [
    { label: "3 days",   value: 3  * DAY },
    { label: "7 days",   value: 7  * DAY },
    { label: "14 days",  value: 14 * DAY },
    { label: "30 days",  value: 30 * DAY },
  ],
} as const;
