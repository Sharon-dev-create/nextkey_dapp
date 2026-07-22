import { ethers, network, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  NextKey — Inheritance Protocol Deployment");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  Network:  ${network.name}`);
  console.log(`  Deployer: ${deployer.address}`);
  console.log(
    `  Balance:  ${ethers.formatEther(
      await ethers.provider.getBalance(deployer.address)
    )} ETH`
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── 1. Deploy VaultFactory ──────────────────────────────────────────────
  console.log("\n[1/3] Deploying VaultFactory...");

  const VaultFactory = await ethers.getContractFactory("VaultFactory");
  const factory = await VaultFactory.deploy();
  await factory.waitForDeployment();

  const factoryAddress = await factory.getAddress();
  console.log(`      ✔ VaultFactory deployed: ${factoryAddress}`);

  // ── 2. Deploy InheritanceVault implementation for verification ──────────
  //    The actual vaults are deployed per-user via the factory.
  //    We deploy one reference vault here solely so Etherscan can verify
  //    the implementation bytecode — users' vaults share the same code.
  console.log("\n[2/3] Deploying reference InheritanceVault for verification...");

  const DAY = 86_400;
  const REFERENCE_CHECKIN_INTERVAL = 180 * DAY; // 180 days
  const REFERENCE_GRACE_PERIOD     =  30 * DAY; // 30 days
  const REFERENCE_CLAIM_DELAY      =   7 * DAY; // 7 days

  const InheritanceVault = await ethers.getContractFactory("InheritanceVault");
  const referenceVault = await InheritanceVault.deploy(
    deployer.address,
    REFERENCE_CHECKIN_INTERVAL,
    REFERENCE_GRACE_PERIOD,
    REFERENCE_CLAIM_DELAY
  );
  await referenceVault.waitForDeployment();

  const referenceVaultAddress = await referenceVault.getAddress();
  console.log(`      ✔ Reference vault deployed: ${referenceVaultAddress}`);

  // ── 3. Write deployment artifact ────────────────────────────────────────
  console.log("\n[3/3] Writing deployment artifact...");

  const artifact = {
    network:              network.name,
    chainId:              (await ethers.provider.getNetwork()).chainId.toString(),
    deployer:             deployer.address,
    deployedAt:           new Date().toISOString(),
    contracts: {
      VaultFactory: {
        address: factoryAddress,
        constructorArgs: [],
      },
      InheritanceVault: {
        address:          referenceVaultAddress,
        note:             "Reference deployment for Etherscan verification only. Users deploy their own vaults via VaultFactory.createVault()",
        constructorArgs: [
          deployer.address,
          REFERENCE_CHECKIN_INTERVAL,
          REFERENCE_GRACE_PERIOD,
          REFERENCE_CLAIM_DELAY,
        ],
      },
    },
  };

  // Write to file
  const fs   = await import("fs");
  const path = await import("path");

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const artifactPath = path.join(deploymentsDir, `${network.name}.json`);
  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`      ✔ Artifact saved: deployments/${network.name}.json`);

  // ── Summary ─────────────────────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("  Deployment complete");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`  VaultFactory:      ${factoryAddress}`);
  console.log(`  Reference vault:   ${referenceVaultAddress}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // ── 4. Verify on Etherscan (Sepolia only) ───────────────────────────────
  if (network.name === "sepolia") {
    console.log("\n  Waiting 30s for Etherscan to index...");
    await new Promise((r) => setTimeout(r, 30_000));

    console.log("\n  Verifying VaultFactory...");
    try {
      await run("verify:verify", {
        address:              factoryAddress,
        constructorArguments: [],
      });
      console.log("  ✔ VaultFactory verified");
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("Already Verified")) {
        console.log("  ✔ VaultFactory already verified");
      } else {
        console.error("  ✗ VaultFactory verification failed:", e);
      }
    }

    console.log("\n  Verifying reference InheritanceVault...");
    try {
      await run("verify:verify", {
        address:              referenceVaultAddress,
        constructorArguments: [
          deployer.address,
          REFERENCE_CHECKIN_INTERVAL,
          REFERENCE_GRACE_PERIOD,
          REFERENCE_CLAIM_DELAY,
        ],
      });
      console.log("  ✔ InheritanceVault verified");
    } catch (e: unknown) {
      if (e instanceof Error && e.message.includes("Already Verified")) {
        console.log("  ✔ InheritanceVault already verified");
      } else {
        console.error("  ✗ InheritanceVault verification failed:", e);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});