# NextKey DApp

NextKey is a non-custodial inheritance protocol built on Ethereum. It lets a wallet owner configure a vault that only becomes active when they stop checking in. Assets remain in the owner's wallet until a valid claim is executed, at which point registered ERC-20 tokens are pulled directly from the owner's wallet and distributed to predefined beneficiaries.

## What this project includes

- `contracts/InheritanceVault.sol` — a single-user inheritance vault contract.
- `contracts/VaultFactory.sol` — factory contract that deploys and tracks one vault per owner.
- `scripts/deploy.ts` — deploys the factory and a reference vault for verification.
- `test/` — Hardhat tests covering vault lifecycle, timings, beneficiary distribution, claim flow, and guard behavior.
- `nextkey-frontend/` — a React/Next.js frontend for vault creation, configuration, asset coverage, and monitoring.

## Core idea

NextKey implements a dead-man's switch for ERC-20 assets, without ever taking custody of funds. The owner keeps full control of assets and only grants token allowances to the vault. The claim flow is gated by three timing parameters:

- `checkInInterval`: how often the owner must prove they are still active.
- `gracePeriod`: the additional buffer after the missed check-in before claims can begin.
- `claimDelay`: the final waiting window after a beneficiary initiates a claim, during which the owner can still cancel by checking in.

## Smart contract architecture

### VaultFactory

The factory is the on-chain registry for vaults. It supports:

- `createVault(checkInInterval, gracePeriod, claimDelay)` — deploys a vault for the caller.
- `vaultOf(owner)` / `hasVault(owner)` — lookup functions for a user's vault.
- `getVaults(offset, limit)` — paginated list of deployed vault addresses.

The factory enforces one vault per owner and does not hold funds.

### InheritanceVault

Each vault stores:

- owner address
- timing parameters
- last check-in timestamp
- beneficiaries and their share splits
- registered ERC-20 tokens
- a small guardian set for emergency pause
- claim state and claim initiator information

The main user flows are:

- `checkIn()` — owner proves they are still active. It also cancels an active claim or reactivates a paused vault.
- `updateTimings(...)` — owner can change timing parameters before a claim has been executed.
- `setBeneficiaries(wallets, shares)` — owner defines who receives the assets and their percentage split.
- `registerToken(token)` and `unregisterToken(token)` — owner tells the vault which ERC-20 tokens to attempt to distribute.
- `addGuardian(guardian)` / `removeGuardian(guardian)` — owner defines trusted guardians who can pause a claim.
- `initiateClaim()` — beneficiary starts the claim process after the inactivity window and grace period have passed.
- `executeClaim()` — beneficiary distributes approved assets once the claim delay has elapsed.
- `pauseClaim()` — a guardian can pause an active claim and move the vault to an inactive state without claiming.

### How distribution works

When `executeClaim()` runs, the vault pulls each registered token from the owner's wallet using `transferFrom`:

- only the minimum of token allowance and owner balance is used
- each beneficiary receives their configured share
- the last beneficiary receives any remainder from division rounding
- zero allowance or zero balance tokens are skipped gracefully

## Frontend overview

The frontend is a Next.js app in `nextkey-frontend/`. It integrates with Wagmi and RainbowKit for wallet connection.

Available pages:

- `/` — landing page with product summary and wallet connect.
- `/dashboard` — shows vault status, next check-in countdown, and quick links.
- `/settings` — create a vault, update timing parameters, and manage guardians.
- `/beneficiaries` — configure beneficiary wallets and basis point shares.
- `/assets` — register ERC-20 tokens for distribution and review approved assets.
- `/activity` — on-chain event history for vault actions.

## How to use the DApp

### Owner setup flow

1. Connect a wallet on the frontend.
2. Go to Settings and deploy your vault with chosen timings.
3. Add beneficiaries in the Beneficiaries page. Shares must total 10,000 basis points (100%).
4. Register tokens on the Assets page and approve the vault contract for each token you want covered.
5. Optionally add guardians who can pause a claim if needed.
6. Use Dashboard to check in before the next interval expires.

### Claim flow

A claim can only begin after all of these have elapsed since the last check-in:

- `checkInInterval`
- `gracePeriod`

Then a beneficiary calls `initiateClaim()`, starting the final `claimDelay` countdown. During this countdown the owner can still cancel the claim by calling `checkIn()`. After `claimDelay`, a beneficiary may call `executeClaim()` to distribute assets.

Guardians may call `pauseClaim()` while a claim is active, which moves the vault to an `Inactive` state and buys the owner more time.

## Local development

### Prerequisites

- Node.js 20.x or newer
- npm 10.x or newer
- A Sepolia RPC endpoint
- A wallet private key with Sepolia ETH for deployment and transactions

### Backend / contract setup

From the repository root:

```bash
npm install
```

Run tests:

```bash
npx hardhat test
```

Deploy to Sepolia:

```bash
export PRIVATE_KEY="your_private_key"
export SEPOLIA_RPC_URL="https://your-sepolia-rpc"
export ETHERSCAN_API_KEY="your_etherscan_api_key"
npx hardhat run scripts/deploy.ts --network sepolia
```

### Frontend setup

```bash
cd nextkey-frontend
npm install
```

Create a `.env.local` file with at least:

```env
NEXT_PUBLIC_FACTORY_ADDRESS=0xAA9202C6e80bCF722C6702827511b2BDdf5D1b55
```

Start the frontend locally:

```bash
npm run dev
```

If you deploy your own factory, update `NEXT_PUBLIC_FACTORY_ADDRESS` accordingly.

## Existing Sepolia deployment

This repository already includes a Sepolia deployment artifact at `deployments/sepolia.json`.

- `VaultFactory` address: `0xAA9202C6e80bCF722C6702827511b2BDdf5D1b55`
- Reference `InheritanceVault` address: `0x5aA97fF4416d2f92BA7470755a830de249985e8F`

> The reference `InheritanceVault` is deployed only for verification. User vaults are created on demand through `VaultFactory.createVault()`.

## Important notes

- The vault does not hold funds before a claim. It only pulls approved ERC-20 tokens from the owner's wallet when a claim is executed.
- The owner remains the ultimate authority until a claim is finalized.
- Beneficiaries must be set with basis points that sum exactly to 10,000.
- The owner can revoke token approvals at any time using the token contract.
- There is no upgradeability and no admin key in the contracts.

## Code structure

- `contracts/` — solidity contracts.
- `scripts/deploy.ts` — deployment script for the factory and reference vault.
- `test/` — Hardhat tests for the vault behavior.
- `nextkey-frontend/` — frontend app and React pages.
- `typechain-types/` — generated contract types.

## Further exploration

- `nextkey-frontend/lib/contracts.ts` contains the ABI definitions used by the app.
- `nextkey-frontend/app/dashboard/page.tsx` implements the owner dashboard and check-in flow.
- `nextkey-frontend/app/settings/page.tsx` handles vault creation, timing updates, and guardian management.
- `nextkey-frontend/app/beneficiaries/page.tsx` manages beneficiary setup.
- `nextkey-frontend/app/assets/page.tsx` manages token registration and approval status.
- `nextkey-frontend/app/activity/page.tsx` reads on-chain vault events.
