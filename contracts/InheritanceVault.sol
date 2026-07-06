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

contract InheritanceVault is ReentrancyGaurd {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MIN_CHECKIN_INTERVAL = 30 days;
    uint256 public constant MAX_CHECKIN_INTERVAL = 730 days;
    uint256 public constant MIN_GRACE_PERIOD     = 7 days;
    uint256 public constant MAX_GRACE_PERIOD     = 180 days;
    uint256 public constant MIN_CLAIM_DELAY      = 3 days;
    uint256 public constant MAX_CLAIM_DELAY      = 30 days;
    uint256 public constant MAX_BENEFICIARIES    = 10;
    uint256 public constant MAX_TOKENS           = 20;
    uint256 public constant MAX_GUARDIANS        = 5;
    uint256 public constant BASIS_POINTS         = 10_000;
    
    // Types
    enum VaultStatus {
        Active,
        Inactive.
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
    address[] private _gaurdians;

    mapping(address => bool) public isBeneficiary;
    mapping(address => bool) public isGuardian;
    mapping(address => bool) public isRegisteredToken;
    
    // Events
    event ClaimCancelled(address indexed cancelledBy);
    event VaultReactivated(uint256 timestamp);
    event TimingsUpdated(uint256 indexed checkInInterval, uint256 gracePeriod, uint256 claimDelay);
    event BeneficiariesSet(address[] indexed wallets, uint16[] indexed shares);
    event TokenRegistered(address indexed token);

    // Errors
    error InvalidAddress();
    error InvalidTimings();
    error OnlyBeneficiary();
    error OnlyGaurdian();
    error AlreadyClaimed();
    error NoBeneficiariesConfigured();
    error TooManyBeneficiaries();
    error InvalidShares();
    error InvalidAddress();
    error TokenAlreadyRegistered();
    error TooManyTokens();


    // Contructor
    constructor(address _owner, uint256 _checkInInterval, uint256 _gracePeriod,
    uint256 _claimDelay) {
        if(_owner == address(0)) revert InvalidAddress();
        _assertValidTimings(_checkInterval, _gracePeriod, _claimDelay);

        owner         = _owner;
        factory       = msg.sender;
        checkInterval = _checkInInterval;
        gracePeriod   = _gracePeriod;
        claimDelay    = _claimDelay;
        lastCheckIn   = block.timestamp;
        status        = VaultStatus.Active;
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
        if (!isGaurdian[msg.sender]) revert OnlyGaurdian();
    }

    modifier notClaimed() {
        if ( status == VaultStatus.Claimed) revert AlreadyClaimed();
    }

    /**
     * @notice Prove liveness. Resets the dead man's switch.
     *         Also cancels any active Inactive / Claiming state —
     *         the owner coming back always wins.
     */

    //Functions
    function checkIn() external onlyOwner notClaimed {
        lastCheckIn = block.tiimestamp;

        if (status ==  VaultStatus.Inactive || status == VaultStatus.Claiming) {
            claimInitiatedAt = 0;
            claimInitiator = address(0);
            status         = VaultStatus.Active;
            emit ClaimCancelled(owner);
            emit VaultReactivated(block.timestamp);
        }

        emit CheckedIn(block.timestamp)
    }

    // Internal fuunctions
    function _assertValidTimings(uint256 _checkInInterval, uint256 _gracePeriod,
    uint256 _claimDelay) internal pure {
           if (
            _checkInInterval < MIN_CHECKIN_INTERVAL ||
            _checkInInterval > MAX_CHECKIN_INTERVAL ||
            _gracePeriod     < MIN_GRACE_PERIOD     ||
            _gracePeriod     > MAX_GRACE_PERIOD     ||
            _claimDelay      < MIN_CLAIM_DELAY      ||
            _claimDelay      > MAX_CLAIM_DELAY
        ) revert InvalidTimings();
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
     function setBeneficiaries(address[] calldata wallets, uint16[] calldata shares)
      external onlyOwner notClaimed{
         if (wallets.length == 0) revert NoBeneficiariesConfigured();
         if (wallets.length > MAX_BENEFICIARIES) revert TooManyBeneficiaries();
         if (wallets.length != shares.length) revert InvalidShares();

         // Validate shares
         uint256 total;
         for (uint256 i; i < shares.length; ++i){
            if (wallets[i] == address(0)) revert InvalidAddress();
            if (wallets[i] == owner) revert InvalidAddress();
            total += shares[i];
         }
         if (total != BASIS_POINTS) revert InvalidShares();

         // clear old list
         for (uint256 i; i < wallets.length; ++i) {
            isBeneficiary[_beneficiaries[i].wallet] = false;
         }
         delete _beneficiaries;

         // write new list
         for (uint256 i; i < wallets.length; ++i) {
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
    function registerToken(address token) external onlyOwner notClaimes {
        if (token == address(0))   revert InvalidAddress();
        if (isRegisteredToken[token]) revert TokenAlreadyRegistered();
        if (_tokens.length >= MAX_TOKENS) revert TooManyTokens();

        _token.push(token);
        isRegisteredToken[token] = true;

        emit TokenRegistered(token);
    }

    /**
     * @notice Update timing parameters. Callable at any non-Claimed status.
     */
    function updateTimings(uint256 _checkInInterval, uint256 _gracePeriod,
    uint256 _claimDelay) external onlyOwner notClaimed {
        _assertValidTimings(_checkInInterval, _gracePeriod, _claimDelay);
        checkInInterval = _checkInInterval;
        gracePeriod     = _gracePeriod;
        claimDelay      = _claimDelay;
        emit TimingsUpdated(_checkInInterval, _gracePeriod, _claimDelay);      
    }
}