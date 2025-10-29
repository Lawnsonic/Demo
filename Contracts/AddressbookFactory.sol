// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AddressBook.sol";

contract AddressBookFactory {
    function deploy() public returns (address) {
        AddressBook newBook = new AddressBook(msg.sender);  // Caller owns it—trust from the jump.
        return address(newBook);
    }
}