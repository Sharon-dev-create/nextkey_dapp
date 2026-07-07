import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { Contract } from "ethers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { VaultFactory } from "../typechain-types";

const DAY     = 86_400;
const DAYS_30 = 30 * DAY;
const DAYS_7  =  7 * DAY;
const DAYS_3  =  3 * DAY;

async function deployFactory(deployer: SignerWithAddress) {
  const Factory = await ethers.getContractFactory("VaultFactory", deployer);
  const factory = await Factory.deploy();
  await factory.waitForDeployment();
  return factory as unknown as VaultFactory;
}

function defaultArgs(): [number, number, number] {
  return [DAYS_30, DAYS_7, DAYS_3];
}

describe("VaultFactory", () => {
  let factory  : VaultFactory;
  let owner    : SignerWithAddress;
  let userA    : SignerWithAddress;
  let userB    : SignerWithAddress;
  let stranger : SignerWithAddress;

  beforeEach(async () => {
    [owner, userA, userB, stranger] = await ethers.getSigners();
    factory = await deployFactory(owner);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Deployment", () => {
    it("deploys with zero vaults", async () => {
      expect(await factory.totalVaults()).to.equal(0n);
    });

    it("returns empty list for getVaults(0, 10)", async () => {
      const vaults = await factory.getVaults(0, 10);
      expect(vaults).to.have.length(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE VAULT
  // ═══════════════════════════════════════════════════════════════════════════
  describe("createVault()", () => {
    it("deploys a vault and returns its address", async () => {
      const tx      = await factory.connect(userA).createVault(...defaultArgs());
      const receipt = await tx.wait();
      expect(receipt).to.not.be.null;

      const vaultAddr = await factory.vaultOf(userA.address);
      expect(vaultAddr).to.not.equal(ethers.ZeroAddress);
    });

    it("emits VaultCreated event with correct args", async () => {
      await expect(
        factory.connect(userA).createVault(...defaultArgs()),
      )
        .to.emit(factory, "VaultCreated")
        .withArgs(
          userA.address,
          // vault address — use anyValue matcher
          (v: string) => ethers.isAddress(v),
          DAYS_30,
          DAYS_7,
          DAYS_3,
          // timestamp — any number
          (t: bigint) => t > 0n,
        );
    });

    it("increments totalVaults", async () => {
      await factory.connect(userA).createVault(...defaultArgs());
      expect(await factory.totalVaults()).to.equal(1n);

      await factory.connect(userB).createVault(...defaultArgs());
      expect(await factory.totalVaults()).to.equal(2n);
    });

    it("stores vault in vaultOf mapping", async () => {
      await factory.connect(userA).createVault(...defaultArgs());
      const stored = await factory.vaultOf(userA.address);
      expect(ethers.isAddress(stored)).to.be.true;
      expect(stored).to.not.equal(ethers.ZeroAddress);
    });

    it("reverts if caller already has a vault", async () => {
      await factory.connect(userA).createVault(...defaultArgs());
      await expect(
        factory.connect(userA).createVault(...defaultArgs()),
      ).to.be.revertedWithCustomError(factory, "VaultAlreadyExists");
    });

    it("deploys separate vaults for different users", async () => {
      await factory.connect(userA).createVault(...defaultArgs());
      await factory.connect(userB).createVault(...defaultArgs());

      const vaultA = await factory.vaultOf(userA.address);
      const vaultB = await factory.vaultOf(userB.address);

      expect(vaultA).to.not.equal(vaultB);
    });

    it("vault owner is set to msg.sender", async () => {
      await factory.connect(userA).createVault(...defaultArgs());
      const vaultAddr = await factory.vaultOf(userA.address);
      const vault     = await ethers.getContractAt("InheritanceVault", vaultAddr) as unknown as InheritanceVault;
      expect(await vault.owner()).to.equal(userA.address);
    });

    it("vault timings are set correctly", async () => {
      const interval = 60 * DAY;
      const grace    = 14 * DAY;
      const delay    = 5  * DAY;

      await factory.connect(userA).createVault(interval, grace, delay);
      const vaultAddr = await factory.vaultOf(userA.address);
      const vault     = await ethers.getContractAt("InheritanceVault", vaultAddr) as unknown as InheritanceVault;

      expect(await vault.checkInInterval()).to.equal(interval);
      expect(await vault.gracePeriod()).to.equal(grace);
      expect(await vault.claimDelay()).to.equal(delay);
    });

    it("forwards InvalidTimings revert from vault constructor", async () => {
      await expect(
        factory.connect(userA).createVault(
          DAYS_3,       // below MIN_CHECKIN_INTERVAL
          DAYS_7,
          DAYS_3,
        ),
      ).to.be.revertedWithCustomError(
        // revert bubbles up from InheritanceVault
        await ethers.getContractAt(
          "InheritanceVault",
          ethers.ZeroAddress,
        ),
        "InvalidTimings",
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEWS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("View functions", () => {
    beforeEach(async () => {
      await factory.connect(userA).createVault(...defaultArgs());
      await factory.connect(userB).createVault(...defaultArgs());
    });

    it("getVault returns correct address", async () => {
      const fromMapping = await factory.vaultOf(userA.address);
      const fromGetter  = await factory.getVault(userA.address);
      expect(fromGetter).to.equal(fromMapping);
    });

    it("getVault reverts for address with no vault", async () => {
      await expect(
        factory.getVault(stranger.address),
      ).to.be.revertedWithCustomError(factory, "VaultNotFound");
    });

    it("hasVault returns true for existing vault", async () => {
      expect(await factory.hasVault(userA.address)).to.be.true;
    });

    it("hasVault returns false for no vault", async () => {
      expect(await factory.hasVault(stranger.address)).to.be.false;
    });

    it("getVaults returns correct page", async () => {
      const page = await factory.getVaults(0, 2);
      expect(page).to.have.length(2);
    });

    it("getVaults respects offset", async () => {
      const page0 = await factory.getVaults(0, 1);
      const page1 = await factory.getVaults(1, 1);
      expect(page0[0]).to.not.equal(page1[0]);
    });

    it("getVaults returns empty array when offset >= total", async () => {
      const page = await factory.getVaults(100, 10);
      expect(page).to.have.length(0);
    });

    it("getVaults clamps to available entries", async () => {
      // Only 2 vaults exist, request 10
      const page = await factory.getVaults(0, 10);
      expect(page).to.have.length(2);
    });
  });
});