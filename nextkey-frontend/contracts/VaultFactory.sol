// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "./InheritanceVault.sol";

/**
 * @title  VaultFactory
 * @author Top G
 *
 * @notice Deploys and registers one InheritanceVault per user.
 *         Acts as the on-chain directory — frontend and integrations
 *         call getVault(owner) to find any user's vault address.
 *
 * @dev    One address = one vault. Attempting to create a second vault
 *         reverts. The factory never holds funds and has no admin key.
 */

contract VaultFactory{
   //STORAGE
   mapping (address => address) private _vaultOf;

   // List of deployed vault
   address[] private _allVaults; 

   // Events
    event VaultCreated(
        address indexed owner,
        address indexed vault,
        uint256 checkInInterval,
        uint256 gracePeriod,
        uint256 claimDelay,
        uint256 timestamp
    );


   // Errors
   error VaultAlreadyExists(address vault);
   error VaultNotFound(address owner);

   /**
     * @notice Deploy a personal InheritanceVault for msg.sender.
     *         Reverts if the caller already has a vault.
     *
     * @param checkInInterval  How often the owner must check in (seconds).
     *                         Min 30 days. Max 730 days.
     * @param gracePeriod      Buffer after missed check-in before beneficiaries
     *                         can initiate a claim (seconds).
     *                         Min 7 days. Max 180 days.
     * @param claimDelay       Window between initiateClaim and executeClaim
     *                         during which the owner can cancel (seconds).
     *                         Min 3 days. Max 30 days.
     *
     * @return vault  Address of the newly deployed InheritanceVault.
     */
    
    function createVault(uint256 checkInInterval, uint256 gracePeriod, uint256 claimDelay)
      external returns(address vault){
        if (_vaultOf[msg.sender] != address(0)) {
            revert VaultAlreadyExists(_vaultOf[msg.sender]);
        }

        InheritanceVault v = new InheritanceVault(
             msg.sender,
            checkInInterval,
            gracePeriod,
            claimDelay
        );

        vault = address(v);
        _vaultOf[msg.sender] = vault;
        _allVaults.push(vault);

        emit VaultCreated(
            msg.sender,
            vault,
            checkInInterval,
            gracePeriod,
            claimDelay,
            block.timestamp
        );
      }

      // =========================================================================
    // VIEWS
    // =========================================================================

    /**
     * @notice Returns the vault address for a given owner.
     *         Reverts if no vault exists.
     */
    function getVault(address owner) external view returns (address) {
        address vault = _vaultOf[owner];
        if (vault == address(0)) revert VaultNotFound(owner);
        return vault;
    }

    /**
     * @notice Returns the vault address for a given owner.
     *         Returns address(0) instead of reverting if none exists.
     *         Useful for frontend "does this user have a vault?" checks.
     */
    function vaultOf(address owner) external view returns (address) {
        return _vaultOf[owner];
    }

    /// @notice Returns true if the given address has deployed a vault.
    function hasVault(address owner) external view returns (bool) {
        return _vaultOf[owner] != address(0);
    }

    /// @notice Total number of vaults deployed through this factory.
    function totalVaults() external view returns (uint256) {
        return _allVaults.length;
    }

    /**
     * @notice Paginated vault list. Use offset + limit to avoid
     *         gas issues with large arrays.
     *
     * @param offset  Start index (0-based).
     * @param limit   Maximum number of results to return.
     */
    function getVaults(uint256 offset, uint256 limit)
        external
        view
        returns (address[] memory vaults)
    {
        uint256 total = _allVaults.length;
        if (offset >= total) return new address[](0);

        uint256 end = offset + limit;
        if (end > total) end = total;

        vaults = new address[](end - offset);
        for (uint256 i; i < vaults.length; ++i) {
            vaults[i] = _allVaults[offset + i];
        }
    }
}