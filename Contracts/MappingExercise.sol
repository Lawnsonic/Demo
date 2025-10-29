// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FavoriteRecords {
    mapping(string => bool) public approvedRecords;
    mapping(address => mapping(string => bool)) userFavorites;
    string[] public approvedAlbums;

    error NotApproved(string album);

    constructor() {
        approvedAlbums = [
            "Thriller",
            "Back in Black",
            "The Bodyguard",
            "The Dark Side of the Moon",
            "Their Greatest Hits (1971-1975)",
            "Hotel California",
            "Come On Over",
            "Rumours",
            "Saturday Night Fever"
        ];
        for (uint i = 0; i < approvedAlbums.length; i++) {
            approvedRecords[approvedAlbums[i]] = true;
        }
    }

    function getApprovedRecords() public view returns (string[] memory) {
        return approvedAlbums;
    }

    function addRecord(string calldata album) public {
        if (!approvedRecords[album]) {
            revert NotApproved(album);
        }
        userFavorites[msg.sender][album] = true;
    }

    function getUserFavorites(address user) public view returns (string[] memory) {
        uint count = 0;
        for (uint i = 0; i < approvedAlbums.length; i++) {
            if (userFavorites[user][approvedAlbums[i]]) {
                count++;
            }
        }
        string[] memory favorites = new string[](count);
        uint j = 0;
        for (uint i = 0; i < approvedAlbums.length; i++) {
            if (userFavorites[user][approvedAlbums[i]]) {
                favorites[j] = approvedAlbums[i];
                j++;
            }
        }
        return favorites;
    }

    function resetUserFavorites() public {
        for (uint i = 0; i < approvedAlbums.length; i++) {
            userFavorites[msg.sender][approvedAlbums[i]] = false;
        }
    }
}