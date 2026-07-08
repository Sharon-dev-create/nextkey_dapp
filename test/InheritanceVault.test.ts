import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
// Typechain types may not be present in all environments;    cy
// and fall back to using any where necessary.
type InheritanceVault = any;
type VaultFactory = any;
type ERC20Mock = any;

// ── Time constants (mirrors contract) ────────────────────────────────────────
const DAY     = 86_400;
const DAYS_30 = 30  * DAY;
const DAYS_7  =  7  * DAY;
const DAYS_3  =  3  * DAY;

// Default vault config — smallest allowed values for fast tests
const DEFAULT_CHECKIN_INTERVAL = DAYS_30;
const DEFAULT_GRACE_PERIOD     = DAYS_7;
const DEFAULT_CLAIM_DELAY      = DAYS_3;

// Basis points
const BP = 10_000n;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Deploy a fresh vault directly (not via factory) for isolated unit tests. */
async function deployVault(
  owner: SignerWithAddress,
  checkInInterval = DEFAULT_CHECKIN_INTERVAL,
  gracePeriod     = DEFAULT_GRACE_PERIOD,
  claimDelay      = DEFAULT_CLAIM_DELAY,
) {
  const Factory = await ethers.getContractFactory("InheritanceVault", owner);
  const vault   = await Factory.deploy(
    owner.address,
    checkInInterval,
    gracePeriod,
    claimDelay,
  );
  await vault.waitForDeployment();
  return vault as unknown as InheritanceVault;
}

/** Deploy a mock ERC-20 and mint `amount` to `to`. */
async function deployToken(
  deployer: SignerWithAddress,
  to: string,
  amount: bigint = ethers.parseEther("10000"),
) {
  const Factory = await ethers.getContractFactory("ERC20Mock", deployer);
  const token   = await Factory.deploy("Mock Token", "MKT", to, amount);
  await token.waitForDeployment();
  return token as unknown as ERC20Mock;
}

/**
 * Fast-forward time past the full inactivity window
 * (checkInInterval + gracePeriod + 1 second).
 */
async function skipToClaimable(
  checkInInterval = DEFAULT_CHECKIN_INTERVAL,
  gracePeriod     = DEFAULT_GRACE_PERIOD,
) {
  await time.increase(checkInInterval + gracePeriod + 1);
}

/** Fast-forward past the claim delay. */
async function skipClaimDelay(claimDelay = DEFAULT_CLAIM_DELAY) {
  await time.increase(claimDelay + 1);
}

// ─────────────────────────────────────────────────────────────────────────────

describe("InheritanceVault", () => {
  let owner      : SignerWithAddress;
  let benA       : SignerWithAddress; // 60 %
  let benB       : SignerWithAddress; // 40 %
  let guardian   : SignerWithAddress;
  let stranger   : SignerWithAddress;
  let vault      : InheritanceVault;
  let token      : ERC20Mock;

  beforeEach(async () => {
    [owner, benA, benB, guardian, stranger] = await ethers.getSigners();
    vault = await deployVault(owner);
    token = await deployToken(owner, owner.address);
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Deployment", () => {
    it("sets owner correctly", async () => {
      expect(await vault.owner()).to.equal(owner.address);
    });

    it("sets factory to deployer address", async () => {
      expect(await vault.factory()).to.equal(owner.address);
    });

    it("sets timings correctly", async () => {
      expect(await vault.checkInInterval()).to.equal(DEFAULT_CHECKIN_INTERVAL);
      expect(await vault.gracePeriod()).to.equal(DEFAULT_GRACE_PERIOD);
      expect(await vault.claimDelay()).to.equal(DEFAULT_CLAIM_DELAY);
    });

    it("starts in Active status (0)", async () => {
      expect(await vault.status()).to.equal(0);
    });

    it("sets lastCheckIn to deployment timestamp", async () => {
      const lastCheckIn = await vault.lastCheckIn();
      const latest      = BigInt(await time.latest());
      expect(lastCheckIn).to.be.closeTo(latest, 2n);
    });

    it("reverts if owner is zero address", async () => {
      const Factory = await ethers.getContractFactory("InheritanceVault", owner);
      await expect(
        Factory.deploy(
          ethers.ZeroAddress,
          DEFAULT_CHECKIN_INTERVAL,
          DEFAULT_GRACE_PERIOD,
          DEFAULT_CLAIM_DELAY,
        ),
      ).to.be.revertedWithCustomError(vault, "InvalidAddress");
    });

    it("reverts if checkInInterval is below minimum", async () => {
      const Factory = await ethers.getContractFactory("InheritanceVault", owner);
      await expect(
        Factory.deploy(owner.address, DAYS_3, DEFAULT_GRACE_PERIOD, DEFAULT_CLAIM_DELAY),
      ).to.be.revertedWithCustomError(vault, "InvalidTimings");
    });

    it("reverts if gracePeriod is below minimum", async () => {
      const Factory = await ethers.getContractFactory("InheritanceVault", owner);
      await expect(
        Factory.deploy(owner.address, DEFAULT_CHECKIN_INTERVAL, DAYS_3 - 1, DEFAULT_CLAIM_DELAY),
      ).to.be.revertedWithCustomError(vault, "InvalidTimings");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECK-IN
  // ═══════════════════════════════════════════════════════════════════════════
  describe("checkIn()", () => {
    it("updates lastCheckIn timestamp", async () => {
      await time.increase(DAYS_7);
      await vault.connect(owner).checkIn();
      const latest = BigInt(await time.latest());
      expect(await vault.lastCheckIn()).to.be.closeTo(latest, 2n);
    });

    it("emits CheckedIn event", async () => {
      await expect(vault.connect(owner).checkIn())
        .to.emit(vault, "CheckedIn");
    });

    it("reverts when called by non-owner", async () => {
      await expect(
        vault.connect(stranger).checkIn(),
      ).to.be.revertedWithCustomError(vault, "OnlyOwner");
    });

    it("reverts when vault is Claimed", async () => {
      // Set up and execute a full claim cycle
      await vault.connect(owner).setBeneficiaries(
        [benA.address, benB.address],
        [6000, 4000],
      );
      await token.connect(owner).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(owner).registerToken(await token.getAddress());
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();
      await skipClaimDelay();
      await vault.connect(benA).executeClaim();

      await expect(
        vault.connect(owner).checkIn(),
      ).to.be.revertedWithCustomError(vault, "AlreadyClaimed");
    });

    it("cancels an active Claiming state and reactivates vault", async () => {
      await vault.connect(owner).setBeneficiaries([benA.address], [10000]);
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();
      expect(await vault.status()).to.equal(2); // Claiming

      await vault.connect(owner).checkIn();

      expect(await vault.status()).to.equal(0); // Active
      expect(await vault.claimInitiatedAt()).to.equal(0n);
      expect(await vault.claimInitiator()).to.equal(ethers.ZeroAddress);
    });

    it("cancels an Inactive state and reactivates vault", async () => {
      await time.increase(DEFAULT_CHECKIN_INTERVAL + 1);
      // Vault is overdue but no claim initiated yet
      await vault.connect(owner).checkIn();
      expect(await vault.status()).to.equal(0); // Active
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE TIMINGS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("updateTimings()", () => {
    it("updates all three timing values", async () => {
      const newInterval = 60 * DAY;
      const newGrace    = 14 * DAY;
      const newDelay    = 5  * DAY;

      await vault.connect(owner).updateTimings(newInterval, newGrace, newDelay);

      expect(await vault.checkInInterval()).to.equal(newInterval);
      expect(await vault.gracePeriod()).to.equal(newGrace);
      expect(await vault.claimDelay()).to.equal(newDelay);
    });

    it("emits TimingsUpdated event", async () => {
      await expect(
        vault.connect(owner).updateTimings(60 * DAY, 14 * DAY, 5 * DAY),
      ).to.emit(vault, "TimingsUpdated");
    });

    it("reverts for non-owner", async () => {
      await expect(
        vault.connect(stranger).updateTimings(60 * DAY, 14 * DAY, 5 * DAY),
      ).to.be.revertedWithCustomError(vault, "OnlyOwner");
    });

    it("reverts when vault is Claimed", async () => {
      await vault.connect(owner).setBeneficiaries([benA.address], [10000]);
      await token.connect(owner).approve(await vault.getAddress(), ethers.MaxUint256);
      await vault.connect(owner).registerToken(await token.getAddress());
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();
      await skipClaimDelay();
      await vault.connect(benA).executeClaim();

      await expect(
        vault.connect(owner).updateTimings(60 * DAY, 14 * DAY, 5 * DAY),
      ).to.be.revertedWithCustomError(vault, "AlreadyClaimed");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SET BENEFICIARIES
  // ═══════════════════════════════════════════════════════════════════════════
  describe("setBeneficiaries()", () => {
    it("sets beneficiaries with correct shares", async () => {
      await vault.connect(owner).setBeneficiaries(
        [benA.address, benB.address],
        [6000, 4000],
      );

      const bens = await vault.getBeneficiaries();
      expect(bens).to.have.length(2);
      expect(bens[0].wallet).to.equal(benA.address);
      expect(bens[0].basisPoints).to.equal(6000n);
      expect(bens[1].wallet).to.equal(benB.address);
      expect(bens[1].basisPoints).to.equal(4000n);
    });

    it("marks addresses as beneficiaries in mapping", async () => {
      await vault.connect(owner).setBeneficiaries([benA.address], [10000]);
      expect(await vault.isBeneficiary(benA.address)).to.be.true;
      expect(await vault.isBeneficiary(benB.address)).to.be.false;
    });

    it("replaces previous beneficiary list atomically", async () => {
      await vault.connect(owner).setBeneficiaries([benA.address], [10000]);
      await vault.connect(owner).setBeneficiaries([benB.address], [10000]);

      expect(await vault.isBeneficiary(benA.address)).to.be.false;
      expect(await vault.isBeneficiary(benB.address)).to.be.true;

      const bens = await vault.getBeneficiaries();
      expect(bens).to.have.length(1);
    });

    it("emits BeneficiariesSet event", async () => {
      await expect(
        vault.connect(owner).setBeneficiaries([benA.address], [10000]),
      ).to.emit(vault, "BeneficiariesSet");
    });

    it("reverts if shares do not sum to 10_000", async () => {
      await expect(
        vault.connect(owner).setBeneficiaries(
          [benA.address, benB.address],
          [6000, 3000], // 9000 — wrong
        ),
      ).to.be.revertedWithCustomError(vault, "InvalidShares");
    });

    it("reverts if wallet and shares arrays have different lengths", async () => {
      await expect(
        vault.connect(owner).setBeneficiaries(
          [benA.address, benB.address],
          [10000],
        ),
      ).to.be.revertedWithCustomError(vault, "InvalidShares");
    });

    it("reverts if a wallet is zero address", async () => {
      await expect(
        vault.connect(owner).setBeneficiaries(
          [ethers.ZeroAddress],
          [10000],
        ),
      ).to.be.revertedWithCustomError(vault, "InvalidAddress");
    });

    it("reverts if owner sets themselves as beneficiary", async () => {
      await expect(
        vault.connect(owner).setBeneficiaries([owner.address], [10000]),
      ).to.be.revertedWithCustomError(vault, "InvalidAddress");
    });

    it("reverts if wallets array is empty", async () => {
      await expect(
        vault.connect(owner).setBeneficiaries([], []),
      ).to.be.revertedWithCustomError(vault, "NoBeneficiariesConfigured");
    });

    it("reverts if called by non-owner", async () => {
      await expect(
        vault.connect(stranger).setBeneficiaries([benA.address], [10000]),
      ).to.be.revertedWithCustomError(vault, "OnlyOwner");
    });

    it("reverts if more than MAX_BENEFICIARIES supplied", async () => {
      const signers = await ethers.getSigners();
      const wallets = signers.slice(0, 11).map((s) => s.address);
      const shares  = Array(11).fill(0);
      shares[0]     = 10000; // just to pass share check — length check fires first

      await expect(
        vault.connect(owner).setBeneficiaries(wallets, shares),
      ).to.be.revertedWithCustomError(vault, "TooManyBeneficiaries");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TOKEN REGISTRATION
  // ═══════════════════════════════════════════════════════════════════════════
  describe("registerToken() / unregisterToken()", () => {
    it("registers a token successfully", async () => {
      await vault.connect(owner).registerToken(await token.getAddress());
      expect(await vault.isRegisteredToken(await token.getAddress())).to.be.true;
    });

    it("emits TokenRegistered event", async () => {
      await expect(
        vault.connect(owner).registerToken(await token.getAddress()),
      ).to.emit(vault, "TokenRegistered").withArgs(await token.getAddress());
    });

    it("reverts on duplicate registration", async () => {
      await vault.connect(owner).registerToken(await token.getAddress());
      await expect(
        vault.connect(owner).registerToken(await token.getAddress()),
      ).to.be.revertedWithCustomError(vault, "TokenAlreadyRegistered");
    });

    it("reverts for zero address token", async () => {
      await expect(
        vault.connect(owner).registerToken(ethers.ZeroAddress),
      ).to.be.revertedWithCustomError(vault, "InvalidAddress");
    });

    it("reverts when called by non-owner", async () => {
      await expect(
        vault.connect(stranger).registerToken(await token.getAddress()),
      ).to.be.revertedWithCustomError(vault, "OnlyOwner");
    });

    it("unregisters a token and removes from list", async () => {
      await vault.connect(owner).registerToken(await token.getAddress());
      await vault.connect(owner).unregisterToken(await token.getAddress());

      expect(await vault.isRegisteredToken(await token.getAddress())).to.be.false;
      const tokens = await vault.getRegisteredTokens();
      expect(tokens).to.have.length(0);
    });

    it("reverts unregister if token not registered", async () => {
      await expect(
        vault.connect(owner).unregisterToken(await token.getAddress()),
      ).to.be.revertedWithCustomError(vault, "TokenNotRegistered");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GUARDIAN MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Guardian management", () => {
    it("adds a guardian", async () => {
      await vault.connect(owner).addGuardian(guardian.address);
      expect(await vault.isGuardian(guardian.address)).to.be.true;
    });

    it("emits GuardianAdded event", async () => {
      await expect(
        vault.connect(owner).addGuardian(guardian.address),
      ).to.emit(vault, "GuardianAdded").withArgs(guardian.address);
    });

    it("reverts adding duplicate guardian", async () => {
      await vault.connect(owner).addGuardian(guardian.address);
      await expect(
        vault.connect(owner).addGuardian(guardian.address),
      ).to.be.revertedWithCustomError(vault, "GuardianAlreadyExists");
    });

    it("reverts adding owner as guardian", async () => {
      await expect(
        vault.connect(owner).addGuardian(owner.address),
      ).to.be.revertedWithCustomError(vault, "InvalidAddress");
    });

    it("removes a guardian", async () => {
      await vault.connect(owner).addGuardian(guardian.address);
      await vault.connect(owner).removeGuardian(guardian.address);
      expect(await vault.isGuardian(guardian.address)).to.be.false;
    });

    it("reverts removing non-existent guardian", async () => {
      await expect(
        vault.connect(owner).removeGuardian(guardian.address),
      ).to.be.revertedWithCustomError(vault, "GuardianNotFound");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIATE CLAIM
  // ═══════════════════════════════════════════════════════════════════════════
  describe("initiateClaim()", () => {
    beforeEach(async () => {
      await vault.connect(owner).setBeneficiaries(
        [benA.address, benB.address],
        [6000, 4000],
      );
    });

    it("initiates claim after full inactivity window", async () => {
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();
      expect(await vault.status()).to.equal(2); // Claiming
    });

    it("sets claimInitiator correctly", async () => {
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();
      expect(await vault.claimInitiator()).to.equal(benA.address);
    });

    it("sets claimInitiatedAt to current timestamp", async () => {
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();
      const latest = BigInt(await time.latest());
      expect(await vault.claimInitiatedAt()).to.be.closeTo(latest, 2n);
    });

    it("emits ClaimInitiated event", async () => {
      await skipToClaimable();
      await expect(
        vault.connect(benA).initiateClaim(),
      ).to.emit(vault, "ClaimInitiated");
    });

    it("reverts if check-in window is still open", async () => {
      await time.increase(DAYS_7); // less than checkInInterval
      await expect(
        vault.connect(benA).initiateClaim(),
      ).to.be.revertedWithCustomError(vault, "CheckInWindowStillOpen");
    });

    it("reverts if grace period is still running", async () => {
      // past checkInInterval but within gracePeriod
      await time.increase(DEFAULT_CHECKIN_INTERVAL + 1);
      await expect(
        vault.connect(benA).initiateClaim(),
      ).to.be.revertedWithCustomError(vault, "GracePeriodStillRunning");
    });

    it("reverts if called by non-beneficiary", async () => {
      await skipToClaimable();
      await expect(
        vault.connect(stranger).initiateClaim(),
      ).to.be.revertedWithCustomError(vault, "OnlyBeneficiary");
    });

    it("reverts if claim already active", async () => {
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();
      await expect(
        vault.connect(benB).initiateClaim(),
      ).to.be.revertedWithCustomError(vault, "ClaimAlreadyActive");
    });

    it("reverts if no beneficiaries configured", async () => {
      const freshVault = await deployVault(owner);
      await skipToClaimable();
      // benA is not a beneficiary on freshVault
      await expect(
        freshVault.connect(benA).initiateClaim(),
      ).to.be.revertedWithCustomError(freshVault, "OnlyBeneficiary");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXECUTE CLAIM
  // ═══════════════════════════════════════════════════════════════════════════
  describe("executeClaim()", () => {
    let tokenAddress: string;
    const MINT_AMOUNT = ethers.parseEther("10000");

    beforeEach(async () => {
      tokenAddress = await token.getAddress();
      const vaultAddress = await vault.getAddress();

      // Configure vault
      await vault.connect(owner).setBeneficiaries(
        [benA.address, benB.address],
        [6000, 4000],
      );
      await vault.connect(owner).registerToken(tokenAddress);

      // Owner approves vault to move their tokens
      await token.connect(owner).approve(vaultAddress, ethers.MaxUint256);

      // Advance to claimable state
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();
    });

    it("distributes tokens correctly (60 / 40 split)", async () => {
      await skipClaimDelay();

      const benABefore = await token.balanceOf(benA.address);
      const benBBefore = await token.balanceOf(benB.address);

      await vault.connect(benA).executeClaim();

      const benAAfter = await token.balanceOf(benA.address);
      const benBAfter = await token.balanceOf(benB.address);

      const received = benAAfter - benABefore + (benBAfter - benBBefore);
      expect(received).to.equal(MINT_AMOUNT);

      // benA gets 60 %
      expect(benAAfter - benABefore).to.equal((MINT_AMOUNT * 6000n) / BP);
      // benB gets the remainder (40 % + any dust)
      const remainder = MINT_AMOUNT - (MINT_AMOUNT * 6000n) / BP;
      expect(benBAfter - benBBefore).to.equal(remainder);
    });

    it("sets vault status to Claimed (3)", async () => {
      await skipClaimDelay();
      await vault.connect(benA).executeClaim();
      expect(await vault.status()).to.equal(3);
    });

    it("emits ClaimExecuted event", async () => {
      await skipClaimDelay();
      await expect(
        vault.connect(benA).executeClaim(),
      ).to.emit(vault, "ClaimExecuted");
    });

    it("owner's token balance goes to zero after claim", async () => {
      await skipClaimDelay();
      await vault.connect(benA).executeClaim();
      expect(await token.balanceOf(owner.address)).to.equal(0n);
    });

    it("reverts if claim delay has not elapsed", async () => {
      // Only 1 second after initiateClaim — not enough
      await time.increase(1);
      await expect(
        vault.connect(benA).executeClaim(),
      ).to.be.revertedWithCustomError(vault, "ClaimDelayStillRunning");
    });

    it("reverts if vault is not in Claiming state", async () => {
      const freshVault = await deployVault(owner);
      await freshVault.connect(owner).setBeneficiaries([benA.address], [10000]);
      await expect(
        freshVault.connect(benA).executeClaim(),
      ).to.be.revertedWithCustomError(freshVault, "NotClaiming");
    });

    it("reverts if called by non-beneficiary", async () => {
      await skipClaimDelay();
      await expect(
        vault.connect(stranger).executeClaim(),
      ).to.be.revertedWithCustomError(vault, "OnlyBeneficiary");
    });

    it("skips tokens with zero allowance gracefully", async () => {
      // Revoke approval
      await token.connect(owner).approve(await vault.getAddress(), 0n);
      await skipClaimDelay();

      // Should not revert — just skips the token
      await expect(vault.connect(benA).executeClaim()).to.not.be.reverted;

      // Beneficiaries received nothing for this token
      expect(await token.balanceOf(benA.address)).to.equal(0n);
      expect(await token.balanceOf(benB.address)).to.equal(0n);
    });

    it("skips tokens with zero owner balance gracefully", async () => {
      // Owner spends all their tokens before claim executes
      await token.connect(owner).transfer(stranger.address, MINT_AMOUNT);
      await skipClaimDelay();

      await expect(vault.connect(benA).executeClaim()).to.not.be.reverted;
    });

    it("distributes only available balance if owner spent some tokens", async () => {
      const spent = ethers.parseEther("4000");
      await token.connect(owner).transfer(stranger.address, spent);

      const remaining = MINT_AMOUNT - spent;
      await skipClaimDelay();

      const benABefore = await token.balanceOf(benA.address);
      await vault.connect(benA).executeClaim();
      const benAAfter = await token.balanceOf(benA.address);

      // benA should receive 60 % of what remained
      const expectedA = (remaining * 6000n) / BP;
      expect(benAAfter - benABefore).to.equal(expectedA);
    });

    it("handles single beneficiary — full balance transferred", async () => {
      const singleVault = await deployVault(owner);
      const singleToken = await deployToken(owner, owner.address, ethers.parseEther("5000"));

      await singleVault.connect(owner).setBeneficiaries([benA.address], [10000]);
      await singleVault.connect(owner).registerToken(await singleToken.getAddress());
      await singleToken.connect(owner).approve(
        await singleVault.getAddress(),
        ethers.MaxUint256,
      );

      await skipToClaimable();
      await singleVault.connect(benA).initiateClaim();
      await skipClaimDelay();
      await singleVault.connect(benA).executeClaim();

      expect(await singleToken.balanceOf(benA.address))
        .to.equal(ethers.parseEther("500"));
    });

    it("handles multiple tokens in one claim", async () => {
      const token2 = await deployToken(owner, owner.address, ethers.parseEther("500"));
      const vault2 = await deployVault(owner);

      await vault2.connect(owner).setBeneficiaries([benA.address], [10000]);
      await vault2.connect(owner).registerToken(await token.getAddress());
      await vault2.connect(owner).registerToken(await token2.getAddress());
      await token.connect(owner).approve(await vault2.getAddress(), ethers.MaxUint256);
      await token2.connect(owner).approve(await vault2.getAddress(), ethers.MaxUint256);

      await skipToClaimable();
      await vault2.connect(benA).initiateClaim();
      await skipClaimDelay();
      await vault2.connect(benA).executeClaim();

      expect(await token.balanceOf(benA.address)).to.equal(MINT_AMOUNT);
      expect(await token2.balanceOf(benA.address)).to.equal(ethers.parseEther("500"));
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PAUSE CLAIM (GUARDIAN)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("pauseClaim()", () => {
    beforeEach(async () => {
      await vault.connect(owner).setBeneficiaries([benA.address], [10000]);
      await vault.connect(owner).addGuardian(guardian.address);
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();
    });

    it("resets vault to Inactive", async () => {
      await vault.connect(guardian).pauseClaim();
      expect(await vault.status()).to.equal(1); // Inactive
    });

    it("clears claimInitiatedAt and claimInitiator", async () => {
      await vault.connect(guardian).pauseClaim();
      expect(await vault.claimInitiatedAt()).to.equal(0n);
      expect(await vault.claimInitiator()).to.equal(ethers.ZeroAddress);
    });

    it("emits ClaimPaused event", async () => {
      await expect(
        vault.connect(guardian).pauseClaim(),
      ).to.emit(vault, "ClaimPaused").withArgs(guardian.address);
    });

    it("reverts if not in Claiming state", async () => {
      await vault.connect(owner).checkIn(); // cancels claim → Active
      await expect(
        vault.connect(guardian).pauseClaim(),
      ).to.be.revertedWithCustomError(vault, "NotClaiming");
    });

    it("reverts if called by non-guardian", async () => {
      await expect(
        vault.connect(stranger).pauseClaim(),
      ).to.be.revertedWithCustomError(vault, "OnlyGuardian");
    });

    it("after pause, beneficiary can re-initiate claim", async () => {
      await vault.connect(guardian).pauseClaim();
      // Grace period already elapsed — can initiate again immediately
      await vault.connect(benA).initiateClaim();
      expect(await vault.status()).to.equal(2); // Claiming again
    });

    it("after pause, owner checkIn fully reactivates to Active", async () => {
      await vault.connect(guardian).pauseClaim();
      await vault.connect(owner).checkIn();
      expect(await vault.status()).to.equal(0); // Active
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // VIEWS
  // ═══════════════════════════════════════════════════════════════════════════
  describe("View functions", () => {
    it("secondsUntilOverdue returns correct remaining time", async () => {
      const advance = DAYS_7;
      await time.increase(advance);
      const remaining = await vault.secondsUntilOverdue();
      const expected  = BigInt(DEFAULT_CHECKIN_INTERVAL - advance);
      expect(remaining).to.be.closeTo(expected, 2n);
    });

    it("secondsUntilOverdue returns 0 when already overdue", async () => {
      await time.increase(DEFAULT_CHECKIN_INTERVAL + 1);
      expect(await vault.secondsUntilOverdue()).to.equal(0n);
    });

    it("isOverdue returns false before window closes", async () => {
      expect(await vault.isOverdue()).to.be.false;
    });

    it("isOverdue returns true after window closes", async () => {
      await time.increase(DEFAULT_CHECKIN_INTERVAL + 1);
      expect(await vault.isOverdue()).to.be.true;
    });

    it("claimInitiableAt returns correct timestamp", async () => {
      const lastCheckIn = await vault.lastCheckIn();
      const expected    = lastCheckIn
        + BigInt(DEFAULT_CHECKIN_INTERVAL)
        + BigInt(DEFAULT_GRACE_PERIOD);
      expect(await vault.claimInitiableAt()).to.equal(expected);
    });

    it("claimExecutableAt returns 0 when not claiming", async () => {
      expect(await vault.claimExecutableAt()).to.equal(0n);
    });

    it("claimExecutableAt returns correct timestamp when claiming", async () => {
      await vault.connect(owner).setBeneficiaries([benA.address], [10000]);
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();

      const initiated = await vault.claimInitiatedAt();
      const expected  = initiated + BigInt(DEFAULT_CLAIM_DELAY);
      expect(await vault.claimExecutableAt()).to.equal(expected);
    });

    it("distributableBalance returns min(allowance, balance)", async () => {
      const vaultAddr = await vault.getAddress();
      const tokenAddr = await token.getAddress();

      // Approve less than balance
      const approvedAmount = ethers.parseEther("500");
      await token.connect(owner).approve(vaultAddr, approvedAmount);

      expect(await vault.distributableBalance(tokenAddr))
        .to.equal(approvedAmount);
    });

    it("distributableBalance returns balance when allowance > balance", async () => {
      const vaultAddr = await vault.getAddress();
      const tokenAddr = await token.getAddress();

      await token.connect(owner).approve(vaultAddr, ethers.MaxUint256);

      const ownerBalance = await token.balanceOf(owner.address);
      expect(await vault.distributableBalance(tokenAddr))
        .to.equal(ownerBalance);
    });

    it("previewDistribution returns correct per-beneficiary amounts", async () => {
      const vaultAddr = await vault.getAddress();
      const tokenAddr = await token.getAddress();
      const mintAmount = ethers.parseEther("1000");

      await vault.connect(owner).setBeneficiaries(
        [benA.address, benB.address],
        [6000, 4000],
      );
      await token.connect(owner).approve(vaultAddr, ethers.MaxUint256);

      const [wallets, amounts] = await vault.previewDistribution(tokenAddr);

      expect(wallets[0]).to.equal(benA.address);
      expect(wallets[1]).to.equal(benB.address);
      expect(amounts[0]).to.equal((mintAmount * 6000n) / BP);
      expect(amounts[0] + amounts[1]).to.equal(mintAmount);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL LIFECYCLE
  // ═══════════════════════════════════════════════════════════════════════════
  describe("Full lifecycle", () => {
    it("happy path — owner checks in multiple times then dies", async () => {
      const tokenAddr = await token.getAddress();
      const vaultAddr = await vault.getAddress();

      // Setup
      await vault.connect(owner).setBeneficiaries(
        [benA.address, benB.address],
        [6000, 4000],
      );
      await vault.connect(owner).registerToken(tokenAddr);
      await token.connect(owner).approve(vaultAddr, ethers.MaxUint256);

      // Owner checks in twice — should be fine
      await time.increase(DAYS_7);
      await vault.connect(owner).checkIn();
      await time.increase(DAYS_7);
      await vault.connect(owner).checkIn();

      // Owner misses final check-in
      await skipToClaimable();

      // Beneficiary initiates
      await vault.connect(benA).initiateClaim();
      expect(await vault.status()).to.equal(2);

      // Claim delay passes
      await skipClaimDelay();

      const benABefore = await token.balanceOf(benA.address);
      const benBBefore = await token.balanceOf(benB.address);

      await vault.connect(benA).executeClaim();

      expect(await vault.status()).to.equal(3); // Claimed
      expect(await token.balanceOf(benA.address)).to.be.gt(benABefore);
      expect(await token.balanceOf(benB.address)).to.be.gt(benBBefore);
    });

    it("guardian pauses → owner reactivates → normal operation resumes", async () => {
      await vault.connect(owner).setBeneficiaries([benA.address], [10000]);
      await vault.connect(owner).addGuardian(guardian.address);

      await skipToClaimable();
      await vault.connect(benA).initiateClaim();

      // Guardian pauses
      await vault.connect(guardian).pauseClaim();
      expect(await vault.status()).to.equal(1);

      // Owner comes back
      await vault.connect(owner).checkIn();
      expect(await vault.status()).to.equal(0);

      // Normal operation — owner checks in again later
      await time.increase(DAYS_7);
      await vault.connect(owner).checkIn();
      expect(await vault.status()).to.equal(0);
    });

    it("owner cancels claim during delay window", async () => {
      await vault.connect(owner).setBeneficiaries([benA.address], [10000]);
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();

      // Owner sees the claim notification and cancels within delay window
      await time.increase(DAYS_3 - 100); // still within delay
      await vault.connect(owner).checkIn();

      expect(await vault.status()).to.equal(0); // Active again
    });

    it("cannot execute after owner cancels", async () => {
      await vault.connect(owner).setBeneficiaries([benA.address], [10000]);
      await skipToClaimable();
      await vault.connect(benA).initiateClaim();

      await vault.connect(owner).checkIn(); // cancels

      await skipClaimDelay(); // time passes but claim was cancelled
      await expect(
        vault.connect(benA).executeClaim(),
      ).to.be.revertedWithCustomError(vault, "NotClaiming");
    });
  });
});