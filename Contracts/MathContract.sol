// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract BasicMath {
    function adder(uint _a, uint _b) public pure returns (uint sum, bool error) {
        if (_b > type(uint).max - _a) {
            return (0, true); // Overflow? Flag it, no crash.
        }
        return (_a + _b, false);
    }

    function subtractor(uint _a, uint _b) public pure returns (uint difference, bool error) {
        if (_b > _a) {
            return (0, true); // Underflow? Flag it.
        }
        return (_a - _b, false);
    }
}