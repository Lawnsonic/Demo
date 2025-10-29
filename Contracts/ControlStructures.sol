// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract FizzBuzzDND {

    // Custom error — MUST include the time
    error AfterHours(uint256 time);

    // FizzBuzz — unchanged, perfect
    function fizzBuzz(uint256 _number) external pure returns (string memory) {
        if (_number % 3 == 0 && _number % 5 == 0) return "FizzBuzz";
        if (_number % 3 == 0) return "Fizz";
        if (_number % 5 == 0) return "Buzz";
        return "Splat";
    }

    // DoNotDisturb — EXACTLY as spec demands
    function doNotDisturb(uint256 _time) external pure returns (string memory) {
        // 1. >= 2400 → panic (use assert-style: invalid input)
        if (_time >= 2400) {
            assert(false); // This triggers panic (like the spec wants)
        }

        // 2. After hours → CUSTOM ERROR with time included
        if (_time > 2200 || _time < 800) {
            revert AfterHours(_time);
        }

        // 3. Lunch time → string revert
        if (_time >= 1200 && _time <= 1259) {
            revert("At lunch!");
        }

        // 4. Normal working hours
        if (_time >= 800 && _time < 1200) return "Morning!";
        if (_time >= 1300 && _time < 1800) return "Afternoon!";
        return "Evening!";
    }
}