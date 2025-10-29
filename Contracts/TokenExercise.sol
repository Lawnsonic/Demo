// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

error TokensClaimed();
error AllTokensClaimed();
error UnsafeTransfer(address to);

contract UnburnableToken {
    mapping(address => uint256) public balances;
    mapping(address => bool) public hasClaimed;

    uint256 public totalSupply = 100000000;
    uint256 public totalClaimed;

    constructor() {}

    function claim() public {
        if (totalClaimed >= totalSupply) {
            revert AllTokensClaimed();
        }
        if (hasClaimed[msg.sender]) {
            revert TokensClaimed();
        }
        hasClaimed[msg.sender] = true;
        uint256 claimAmount = 1000;
        balances[msg.sender] += claimAmount;
        totalClaimed += claimAmount;
    }

    function safeTransfer(address _to, uint256 _amount) public {
        if (_to == address(0)) {
            revert UnsafeTransfer(_to);
        }
        if (_to.balance == 0) {
            revert UnsafeTransfer(_to);
        }
        if (balances[msg.sender] < _amount) {
            revert("Insufficient balance");
        }
        balances[msg.sender] -= _amount;
        balances[_to] += _amount;
    }
}