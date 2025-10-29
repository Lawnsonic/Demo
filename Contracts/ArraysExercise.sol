// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract ArraysExercise {
    uint[] public numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    address[] public senders;
    uint[] public timestamps;
    uint256 constant Y2K = 946702800;  // Fixed: Constant up front, semicolon seals the deal.

    // 1. Grab the whole array—no sweat.
    function getNumbers() public view returns (uint[] memory) {
        return numbers;
    }

    // 2. Reset to 1-10, no pushes needed (gas ninja move: just reassign).
    function resetNumbers() public {
        numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    }

    // 3. Append another array to ours—loop it in, calldata keeps it cheap.
    function appendToNumbers(uint[] calldata _toAppend) public {
        for (uint i = 0; i < _toAppend.length; i++) {
            numbers.push(_toAppend[i]);
        }
    }

    // 4. Save the caller's address and timestamp—msg.sender's your secret weapon.
    function saveTimestamp(uint _unixTimestamp) public {
        senders.push(msg.sender);      // Address type, no funny business.
        timestamps.push(_unixTimestamp); // Stick to the input, not block.timestamp.
    }

    // 5. Filter post-Y2K: Loop twice (once to count, once to fill)—efficient and exact.
    function afterY2K() public view returns (uint[] memory, address[] memory) {
        uint count = 0;
        // Quick scan: How many qualify?
        for (uint i = 0; i < timestamps.length; i++) {
            if (timestamps[i] > Y2K) {
                count++;
            }
        }
        // Build the filtered lists.
        uint[] memory filteredTimestamps = new uint[](count);
        address[] memory filteredSenders = new address[](count);
        uint idx = 0;
        for (uint i = 0; i < timestamps.length; i++) {
            if (timestamps[i] > Y2K) {
                filteredTimestamps[idx] = timestamps[i];
                filteredSenders[idx] = senders[i];
                idx++;
            }
        }
        return (filteredTimestamps, filteredSenders);
    }

    // 6. Quick resets—delete nukes 'em to empty (zero gas for the win).
    function resetSenders() public {
        delete senders;
    }

    function resetTimestamps() public {
        delete timestamps;
    }
}
