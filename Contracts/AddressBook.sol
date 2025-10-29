// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from ".git/Contracts/Ownable.sol";  // Adjust path if needed

error ContactNotFound(uint256 id);

contract AddressBook is Ownable {
    struct Contact {
        uint256 id;
        string firstName;
        string lastName;
        uint256[] phoneNumbers;
    }

    mapping(uint256 => Contact) public contacts;
    uint256 private _contactCount;
    uint256[] private _contactIds;  // To enable iteration for getAllContacts

    event ContactAdded(uint256 indexed id);
    event ContactDeleted(uint256 indexed id);

    constructor(address initialOwner) Ownable(initialOwner) {}  // Ownable sets owner

    function addContact(
        string memory _firstName,
        string memory _lastName,
        uint256[] memory _phoneNumbers
    ) public onlyOwner {
        _contactCount++;
        Contact memory newContact = Contact({
            id: _contactCount,
            firstName: _firstName,
            lastName: _lastName,
            phoneNumbers: _phoneNumbers
        });
        contacts[_contactCount] = newContact;
        _contactIds.push(_contactCount);
        emit ContactAdded(_contactCount);
    }

    function deleteContact(uint256 _id) public onlyOwner {
        if (contacts[_id].id == 0) {
            revert ContactNotFound(_id);
        }
        delete contacts[_id];  // Clears the mapping entry
        // Optional: Remove from _contactIds (swap-and-pop for gas efficiency)
        for (uint i = 0; i < _contactIds.length; i++) {
            if (_contactIds[i] == _id) {
                _contactIds[i] = _contactIds[_contactIds.length - 1];
                _contactIds.pop();
                break;
            }
        }
        emit ContactDeleted(_id);
    }

    function getContact(uint256 _id) public view returns (Contact memory) {
        Contact memory contact = contacts[_id];
        if (contact.id == 0) {
            revert ContactNotFound(_id);
        }
        return contact;
    }

    function getAllContacts() public view returns (Contact[] memory) {
        Contact[] memory allContacts = new Contact[](_contactIds.length);
        uint256 count = 0;
        for (uint i = 0; i < _contactIds.length; i++) {
            uint256 id = _contactIds[i];
            if (contacts[id].id != 0) {  // Skip deleted
                allContacts[count] = contacts[id];
                count++;
            }
        }
        // Resize array if needed (Solidity doesn't auto-resize, so create new if deletions occurred)
        Contact[] memory trimmed = new Contact[](count);
        for (uint j = 0; j < count; j++) {
            trimmed[j] = allContacts[j];
        }
        return trimmed;
    }
}