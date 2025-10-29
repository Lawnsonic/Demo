// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./SillyStringUtils.sol";  // Pulls your library copy—haiku struct and shruggie spark.

contract ImportsExercise {
    using SillyStringUtils for string;  // Library boost—strings shrug easy now.

    SillyStringUtils.Haiku public haiku;  // Public for line peeks, full via our getter.

    function saveHaiku(string memory _line1, string memory _line2, string memory _line3) public {
        haiku = SillyStringUtils.Haiku(_line1, _line2, _line3);
    }

    function getHaiku() public view returns (SillyStringUtils.Haiku memory) {
        return haiku;
    }

    function shruggieHaiku() public view returns (SillyStringUtils.Haiku memory) {
        // Temp copy—keeps original pure, shrugs line3 only.
        return SillyStringUtils.Haiku(haiku.line1, haiku.line2, haiku.line3.shruggie());
    }
}