//SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  InheritanceVault
 * @author Emmanuel Sharon
 *
 * @notice Non-custodial inheritance vault. The owner's assets NEVER leave
 *         their wallet during their lifetime. The owner grants this contract
 *         ERC-20 approval on chosen tokens. On a successful claim, this
 *         contract pulls tokens directly from the owner's wallet to each
 *         beneficiary in the configured proportions.
 *
 * @dev    Deployed by VaultFactory — one vault per user.
 *  ── Trust model ────────────────────────────────────────────────────────────
 *
 *   • Owner keeps full custody of assets at all times while alive.
 *   • Owner can revoke ERC-20 approvals at any time via the token contract.
 *   • No admin key. No upgradability. No protocol fee. Code is law.
 *   • If this frontend disappears the vault is still accessible on Etherscan.
 */

contract InheritanceVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MIN_CHECKIN_INTERVAL = 30 days;
    uint256 public constant MAX_CHECKIN_INTERVAL = 730 days;
    uint256 public constant MIN_GRACE_PERIOD = 7 days;
    uint256 public constant MAX_GRACE_PERIOD = 180 days;
    uint256 public constant MIN_CLAIM_DELAY = 3 days;
    uint256 public constant MAX_CLAIM_DELAY = 30 days;
    uint256 public constant MAX_BENEFICIARIES = 10;
    uint256 public constant MAX_TOKENS = 20;
    uint256 public constant MAX_GUARDIANS = 5;
    uint256 public constant BASIS_POINTS = 10_000;

    // Types
    enum VaultStatus {
        Active,
        Inactive,
        Claiming,
        Claimed
    }

    struct Beneficiary {
        address wallet;
        uint16 basisPoints;
    }

    // Immutables
    address public immutable owner;
    address public immutable factory;

    // Storage
    VaultStatus public status;

    uint256 public checkInInterval;
    uint256 public gracePeriod;
    uint256 public claimDelay;

    uint256 public lastCheckIn;
    uint256 public claimInitiatedAt;
    address public claimInitiator;

    Beneficiary[] private _beneficiaries;
    address[] private _tokens;
    address[] private _guardians;

    mapping(address => bool) public isBeneficiary;
    mapping(address => bool) public isGuardian;
    mapping(address => bool) public isRegisteredToken;

    // Events
    event ClaimCancelled(address indexed cancelledBy);
    event VaultReactivated(uint256 timestamp);
    event TimingsUpdated(uint256 indexed checkInInterval, uint256 gracePeriod, uint256 claimDelay);
    event BeneficiariesSet(address[] indexed wallets, uint16[] indexed shares);
    event TokenRegistered(address indexed token);
    event TokenUnregistered(address indexed token);
    event GuardianAdded(address indexed guardian);
    event CheckedIn(uint256 timestamp);
    event GuardianRemoved(address indexed guardian);
    event ClaimInitiated(address indexed initiator, uint256 claimAvailableAt);
    event ClaimExecuted(uint256 indexed timestamp);
    event ClaimPaused(address indexed pausedBy);

    // Errors
    error InvalidAddress();
    error InvalidTimings();
    error OnlyBeneficiary();
    error OnlyGuardian();
    error AlreadyClaimed();
    error NoBeneficiariesConfigured();
    error TooManyBeneficiaries();
    error InvalidShares();
    error TokenAlreadyRegistered();
    error TooManyTokens();
    error TokenNotRegistered();
    error GuardianAlreadyExists();
    error TooManyGuardians();
    error OnlyOwner();
    error GuardianNotFound();
    error ClaimAlreadyActive();
    error CheckInWindowStillOpen(uint256 windowClosesAt);
    error GracePeriodStillRunning(uint256 gracePeriodEndsAt);
    error NotClaiming();
    error ClaimDelayStillRunning(uint256 executableAt);

    // Contructor
    constructor(address _owner, uint256 _checkInInterval, uint256 _gracePeriod, uint256 _claimDelay) {
        if (_owner == address(0)) revert InvalidAddress();
        _assertValidTimings(_checkInInterval, _gracePeriod, _claimDelay);

        owner = _owner;
        factory = msg.sender;
        checkInInterval = _checkInInterval;
        gracePeriod = _gracePeriod;
        claimDelay = _claimDelay;
        lastCheckIn = block.timestamp;
        status = VaultStatus.Active;
    }

    // Modifiers
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }

    modifier onlyBeneficiary() {
        if (!isBeneficiary[msg.sender]) revert OnlyBeneficiary();
        _;
    }

    modifier onlyGaurdian() {
        if (!isGuardian[msg.sender]) revert OnlyGaurdian();
        _;
    }

    modifier notClaimed() {
        if (status == VaultStatus.Claimed) revert AlreadyClaimed();
        _;
    }

    /**
     * @notice Prove liveness. Resets the dead man's switch.
     *         Also cancels any active Inactive / Claiming state —
     *         the owner coming back always wins.
     */

    //Functions
    function checkIn() external onlyOwner notClaimed {
        lastCheckIn = block.timestamp;

        if (status == VaultStatus.Inactive || status == VaultStatus.Claiming) {
            claimInitiatedAt = 0;
            claimInitiator = address(0);
            status = VaultStatus.Active;
            emit ClaimCancelled(owner);
            emit VaultReactivated(block.timestamp);
        }

        emit CheckedIn(block.timestamp);
    }

    /**
     * @notice Update timing parameters. Callable at any non-Claimed status.
     */
    function updateTimings(uint256 _checkInInterval, uint256 _gracePeriod, uint256 _claimDelay)
        external
        onlyOwner
        notClaimed
    {
        _assertValidTimings(_checkInInterval, _gracePeriod, _claimDelay);
        checkInInterval = _checkInInterval;
        gracePeriod = _gracePeriod;
        claimDelay = _claimDelay;
        emit TimingsUpdated(_checkInInterval, _gracePeriod, _claimDelay);
    }

    /**
     * @notice Replace the entire beneficiary list atomically.
     *         All previous beneficiaries are removed and the new list is set.
     *
     * @dev    Shares must sum to exactly BASIS_POINTS (10_000).
     *         Owner cannot be a beneficiary.
     *         Maximum MAX_BENEFICIARIES entries.
     *
     * @param wallets  Ordered list of beneficiary addresses.
     * @param shares   Basis-point share for each wallet (must sum to 10_000).
     */
    function setBeneficiaries(address[] calldata wallets, uint16[] calldata shares) external onlyOwner notClaimed {
        if (wallets.length == 0) revert NoBeneficiariesConfigured();
        if (wallets.length > MAX_BENEFICIARIES) revert TooManyBeneficiaries();
        if (wallets.length != shares.length) revert InvalidShares();

        // Validate shares
        uint256 total;
        for (uint256 i = 0; i < shares.length; ++i) {
            if (wallets[i] == address(0)) revert InvalidAddress();
            if (wallets[i] == owner) revert InvalidAddress();
            total += uint256(shares[i]);
        }
        if (total != BASIS_POINTS) revert InvalidShares();

        // clear old list
        for (uint256 i = 0; i < _beneficiaries.length; ++i) {
            isBeneficiary[_beneficiaries[i].wallet] = false;
        }
        delete _beneficiaries;

        // write new list
        for (uint256 i = 0; i < wallets.length; ++i) {
            _beneficiaries.push(Beneficiary(wallets[i], shares[i]));
            isBeneficiary[wallets[i]] = true;
        }

        emit BeneficiariesSet(wallets, shares);
    }

    /**
     * @notice Register an ERC-20 token to be distributed on claim.
     *
     * @dev    The owner must separately call approve() on the token contract
     *         itself. This function only tells the vault which tokens to
     *         attempt to distribute. Tokens with zero allowance or zero
     *         balance at claim time are skipped gracefully.
     */
    function registerToken(address token) external onlyOwner notClaimed {
        if (token == address(0)) revert InvalidAddress();
        if (isRegisteredToken[token]) revert TokenAlreadyRegistered();
        if (_tokens.length >= MAX_TOKENS) revert TooManyTokens();

        _tokens.push(token);
        isRegisteredToken[token] = true;

        emit TokenRegistered(token);
    }

    /**
     * @notice Unregister a token. Does not revoke ERC-20 approval —
     *         the owner must do that separately on the token contract.
     */
    function unregisterToken(address token) external onlyOwner {
        if (!isRegisteredToken[token]) revert TokenNotRegistered();

        isRegisteredToken[token] = false;
        _removeAddress(_tokens, token);

        emit TokenUnregistered(token);
    }

    /**
     * @notice Add a guardian — a trusted person who can pause an active
     *         claim to give the owner more time to respond.
     */
    function addGuardian(address guardian) external onlyOwner notClaimed {
        if (guardian == address(0)) revert InvalidAddress();
        if (guardian == owner) revert InvalidAddress();
        if (isGuardian[guardian]) revert GuardianAlreadyExists();
        if (_guardians.length >= MAX_GUARDIANS) revert TooManyGuardians();

        _guardians.push(guardian);
        isGuardian[guardian] = true;

        emit GuardianAdded(guardian);
    }

    /**
     * @notice Remove a guardian.
     */
    function removeGuardian(address guardian) external onlyOwner {
        if (!isGuardian[guardian]) revert GuardianNotFound();

        isGuardian[guardian] = false;
        _removeAddress(_guardians, guardian);

        emit GuardianRemoved(guardian);
    }

    // =========================================================================
    // BENEFICIARY — CLAIM FLOW
    // =========================================================================
    /**
     * @notice Step 1. Beneficiary signals the owner is inactive.
     *         Callable only after checkInInterval + gracePeriod have elapsed
     *         since the last check-in.
     *
     *         This starts the claimDelay countdown. The owner can still
     *         cancel by calling checkIn() during this window.
     */
    function initiateClaim() external onlyBeneficiary notClaimed {
        if (status == VaultStatus.Claiming) revert ClaimAlreadyActive();
        if (_beneficiaries.length == 0) revert NoBeneficiariesConfigured();

        // Check-in window must have elapsed
        uint256 windowClosesAt = lastCheckIn + checkInInterval;
        if (block.timestamp < windowClosesAt) {
            revert CheckInWindowStillOpen(windowClosesAt);
        }

        // Grace period must have elasped
        uint256 gracePeriodEndsAt = windowClosesAt + gracePeriod;
        if (block.timestamp <= gracePeriodEndsAt) {
            revert GracePeriodStillRunning(gracePeriodEndsAt);
        }

        status = VaultStatus.Claiming;
        claimInitiatedAt = block.timestamp;
        claimInitiator = msg.sender;

        emit ClaimInitiated(msg.sender, block.timestamp + claimDelay);
    }

    /**
     * @notice Step 2. Any beneficiary executes the claim after claimDelay.
     *
     * @dev    For each registered token:
     *           distributable = min(owner.balanceOf(token), vault.allowance)
     *         Tokens are pulled directly from the owner's wallet to each
     *         beneficiary. The vault holds nothing at any point.
     *
     *         Tokens with zero distributable balance are skipped — they do
     *         not revert the entire claim.
     *
     *         The last beneficiary receives any dust from integer division.
     */
    function executeClaim() external onlyBeneficiary nonReentrant {
        if (status != VaultStatus.Claiming) revert NotClaiming();

        uint256 executableAt = claimInitiatedAt + claimDelay;
        if (block.timestamp < executableAt) {
            revert ClaimDelayStillRunning(executableAt);
        }

        // Mark claimed before any external calls
        status = VaultStatus.Claimed;

        emit ClaimExecuted(block.timestamp);

        uint256 tokenCount = _tokens.length;
        uint256 benCount = _beneficiaries.length;

        for (uint256 t; t < tokenCount; ++t) {
            IERC20 token = IERC20(_tokens[t]);

            // How much can this vault move?
            uint256 allowance = token.allowance(owner, address(this));
            if (allowance == 0) continue;

            // How much does the owner have?
            uint256 balance = token.balanceOf(owner);
            if (balance == 0) continue;

            uint256 distributable = allowance < balance ? allowance : balance;

            uint256 totalSent;

            // All bebeficiaries except the last get their exact share
            for (uint256 i; i < benCount - 1; ++i) {
                uint256 share = (distributable * _beneficiaries[i].basisPoints) / BASIS_POINTS;

                if (share == 0) continue;

                totalSent += share;

                // transferFrom owners wallet to beneiciary wallet
                token.safeTransferFrom(owner, _beneficiaries[i].wallet, share);
            }

            // Last beneficiaries gets remainder - handles integer dust
            uint256 remainder = distributable - totalSent;
            if (remainder > 0) {
                token.safeTransferFrom(owner, _beneficiaries[benCount - 1].wallet, remainder);
            }
        }
    }

    // =========================================================================
    // GUARDIAN — EMERGENCY PAUSE
    // =========================================================================

    /**
     * @notice Reset an active Claiming state back to Inactive.
     *         Gives the owner more time to respond without fully reactivating.
     *         Only the owner's checkIn() restores Active status.
     */
    function pauseClaim() external onlyGaurdian {
        if (status != VaultStatus.Claiming) revert NotClaiming();

        status = VaultStatus.Inactive;
        claimInitiatedAt = 0;
        claimInitiator = address(0);

        emit ClaimPaused(msg.sender);
    }

    // =========================================================================
    // VIEWS
    // =========================================================================
    function secondsUntilOverdue() external view returns (uint256) {
        uint256 deadline = lastCheckIn + checkInInterval;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    /// @notice Timestamp after which a beneficiary can call initiateClaim().
    function claimInitiableAt() external view returns (uint256) {
        return lastCheckIn + checkInInterval + gracePeriod;
    }

    /// @notice Timestamp after which executeClaim() can be called.
    ///         Returns 0 if no claim is in progress.
    function claimExecutableAt() external view returns (uint256) {
        if (status != VaultStatus.Claiming) return 0;
        return claimInitiatedAt + claimDelay;
    }

    /// @notice True if the owner has missed their check-in window.
    function isOverdue() external view returns (bool) {
        return block.timestamp > lastCheckIn + checkInInterval;
    }

    /**
     * @notice Returns the live distributable balance for a token —
     *         what beneficiaries would actually receive right now.
     *         min(owner balance, vault allowance)
     */
    function distributableBalance(address token) external view returns (uint256) {
        uint256 allowance = IERC20(token).allowance(owner, address(this));
        uint256 balance = IERC20(token).balanceOf(owner);

        return allowance < balance ? allowance : balance;
    }

    /**
     * @notice Returns each beneficiary's expected share of a given token
     *         based on current distributable balance.
     */
    function previewDistribution(address token)
        external
        view
        returns (uint256[] memory amounts, address[] memory wallets)
    {
        uint256 allowance = IERC20(token).allowance(owner, address(this));
        uint256 balance = IERC20(token).balanceOf(owner);
        uint256 distributable = allowance < balance ? allowance : balance;

        uint256 benCount = _beneficiaries.length;

        wallets = new address[](benCount);
        amounts = new uint256[](benCount);

        uint256 totalSent;
        for (uint256 i; i < benCount - 1; ++i) {
            wallets[i] = _beneficiaries[i].wallet;
            amounts[i] = (distributable * _beneficiaries[i].basisPoints) / BASIS_POINTS;
            totalSent += amounts[i];
        }
        // Last beneficiary gets remainder
        wallets[benCount - 1] = _beneficiaries[benCount - 1].wallet;
        amounts[benCount - 1] = distributable - totalSent;
    }

    function getBeneficiaries() external view returns (Beneficiary[] memory) {
        return _beneficiaries;
    }

    function getRegisteredTokens() external view returns (address[] memory) {
        return _tokens;
    }

    function getGuardians() external view returns (address[] memory) {
        return _guardians;
    }

    // Internal functions
    function _assertValidTimings(uint256 _checkInInterval, uint256 _gracePeriod, uint256 _claimDelay) internal pure {
        if (
            _checkInInterval < MIN_CHECKIN_INTERVAL || _checkInInterval > MAX_CHECKIN_INTERVAL
                || _gracePeriod < MIN_GRACE_PERIOD || _gracePeriod > MAX_GRACE_PERIOD || _claimDelay < MIN_CLAIM_DELAY
                || _claimDelay > MAX_CLAIM_DELAY
        ) revert InvalidTimings();
    }

    function _removeAddress(address[] storage arr, address target) internal {
        uint256 len = arr.length;
        for (uint256 i; i < len; ++i) {
            if (arr[i] == target) {
                arr[i] = arr[len - 1];
                arr.pop();
                return;
            }
        }
    }
}
