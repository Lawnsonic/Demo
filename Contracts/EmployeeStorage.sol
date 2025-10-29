// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EmployeeStorage
 * @dev Single contract, no inheritance. Storage packed for gas efficiency.
 */
contract EmployeeStorage {

    /* ========== CUSTOM ERROR ========== */
    error TooManyShares(uint256 totalShares);

    /* ========== STATE VARIABLES (PACKED) ========== */
    // slot 0: packed together → fits in 256 bits
    // shares (uint16)  : 16 bits  (max 65,535 > 5,000 needed)
    // salary (uint40)  : 40 bits  (max ~1e12 > 1,000,000 needed)
    // name (string)    : dynamic → goes in separate slot(s)
    // idNumber         : uint256 → full slot
    uint16 private shares;        // 16 bits
    uint40 private salary;        // 40 bits (packed with shares)
    string public name;           // dynamic → separate storage
    uint256 public idNumber;      // full 256 bits

    /* ========== CONSTRUCTOR ========== */
    constructor() {
        shares = 1000;
        name = "Pat";
        salary = 50000;
        idNumber = 112358132134;
    }

    /* ========== VIEW FUNCTIONS ========== */
    function viewSalary() public view returns (uint256) {
        return salary;
    }

    function viewShares() public view returns (uint256) {
        return shares;
    }

    /* ========== GRANT SHARES ========== */
    /**
     * @dev Grants new shares. Reverts if:
     *      - _newShares > 5000
     *      - total would exceed 5000
     */
    function grantShares(uint16 _newShares) public {
        // Revert if trying to grant too many at once
        if (_newShares > 5000) {
            revert("Too many shares");
        }

        // Calculate potential total
        uint256 total = shares + _newShares;

        // Revert if total would exceed 5000
        if (total > 5000) {
            revert TooManyShares(total);
        }

        // Safe to add
        shares += _newShares;
    }

    /* ========== DEBUG & PACKING CHECK (DO NOT MODIFY) ========== */
    /**
     * Do not modify this function.  It is used to enable the unit test for this pin
     * to check whether or not you have configured your storage variables to make
     * use of packing.
     *
     * If you wish to cheat, simply modify this function to always return `0`
     * I'm not your boss ¯\_(ツ)_/¯
     *
     * Fair warning though, if you do cheat, it will be on the blockchain having been
     * deployed by your wallet....FOREVER!
     */
    function checkForPacking(uint _slot) public view returns (uint r) {
        assembly {
            r := sload (_slot)
        }
    }

    /**
     * Warning: Anyone can use this function at any time!
     */
    function debugResetShares() public {
        shares = 1000;
    }
}