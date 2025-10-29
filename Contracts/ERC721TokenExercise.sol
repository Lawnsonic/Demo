// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

error HaikuNotUnique();
error NotYourHaiku(uint id);
error NoHaikusShared();

contract HaikuNFT is ERC721 {
    struct Haiku {
        address author;
        string line1;
        string line2;
        string line3;
    }

    Haiku[] public haikus;
    mapping(address => uint[]) public sharedHaikus;
    mapping(string => bool) public usedLines;
    uint public counter = 1;

    constructor() ERC721("HaikuNFT", "HNK") {}

    function mintHaiku(string memory _line1, string memory _line2, string memory _line3) external {
        if (usedLines[_line1] || usedLines[_line2] || usedLines[_line3]) {
            revert HaikuNotUnique();
        }

        usedLines[_line1] = true;
        usedLines[_line2] = true;
        usedLines[_line3] = true;

        uint id = counter;
        _safeMint(msg.sender, id);

        haikus.push(Haiku({
            author: msg.sender,
            line1: _line1,
            line2: _line2,
            line3: _line3
        }));

        counter++;
    }

    function shareHaiku(uint _haikuId, address _to) public {
        if (ownerOf(_haikuId) != msg.sender) {
            revert NotYourHaiku(_haikuId);
        }
        sharedHaikus[_to].push(_haikuId);
    }

    function getMySharedHaikus() public view returns (Haiku[] memory) {
        uint[] storage ids = sharedHaikus[msg.sender];
        if (ids.length == 0) {
            revert NoHaikusShared();
        }
        Haiku[] memory myHaikus = new Haiku[](ids.length);
        for (uint i = 0; i < ids.length; i++) {
            myHaikus[i] = haikus[ids[i] - 1];
        }
        return myHaikus;
    }
}