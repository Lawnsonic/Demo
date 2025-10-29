// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {EnumerableSet} from "@openzeppelin/contracts/utils/structs/EnumerableSet.sol";

error TokensClaimed();
error AllTokensClaimed();
error NoTokensHeld();
error QuorumTooHigh(uint256 quorum);
error AlreadyVoted();
error VotingClosed();

contract WeightedVoting is ERC20 {
    using EnumerableSet for EnumerableSet.AddressSet;

    uint256 public constant MAX_SUPPLY = 1_000_000;

    mapping(address => bool) public hasClaimed;

    enum Vote {
        AGAINST,
        FOR,
        ABSTAIN
    }

    struct Issue {
        EnumerableSet.AddressSet voters;
        string issueDesc;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        uint256 totalVotes;
        uint256 quorum;
        bool passed;
        bool closed;
    }

    Issue[] internal issues;

    struct IssueInfo {
        address[] voters;
        string issueDesc;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 votesAbstain;
        uint256 totalVotes;
        uint256 quorum;
        bool passed;
        bool closed;
    }

    constructor() ERC20("Weighted Voting Token", "WVT") {
        // Burn the zeroeth element by pushing a closed dummy issue
        issues.push();
        issues[0].closed = true;
    }

    function claim() public {
        if (totalSupply() >= MAX_SUPPLY) {
            revert AllTokensClaimed();
        }
        if (hasClaimed[msg.sender]) {
            revert TokensClaimed();
        }
        hasClaimed[msg.sender] = true;
        _mint(msg.sender, 100);
    }

    function createIssue(string calldata _issueDesc, uint256 _quorum) external returns (uint256) {
        if (balanceOf(msg.sender) == 0) {
            revert NoTokensHeld();
        }
        if (_quorum > totalSupply()) {
            revert QuorumTooHigh(_quorum);
        }
        uint256 issueId = issues.length;
        issues.push();
        Issue storage newIssue = issues[issueId];
        newIssue.issueDesc = _issueDesc;
        newIssue.quorum = _quorum;
        return issueId;
    }

    function getIssue(uint256 _id) external view returns (IssueInfo memory) {
        Issue storage issue = issues[_id];
        address[] memory voterList = new address[](issue.voters.length());
        for (uint256 i = 0; i < issue.voters.length(); i++) {
            voterList[i] = issue.voters.at(i);
        }
        return IssueInfo(
            voterList,
            issue.issueDesc,
            issue.votesFor,
            issue.votesAgainst,
            issue.votesAbstain,
            issue.totalVotes,
            issue.quorum,
            issue.passed,
            issue.closed
        );
    }

    function vote(uint256 _issueId, Vote _vote) public {
        if (balanceOf(msg.sender) == 0) {
            revert NoTokensHeld();
        }
        Issue storage issue = issues[_issueId];
        if (issue.closed) {
            revert VotingClosed();
        }
        EnumerableSet.AddressSet storage voters = issue.voters;
        if (voters.contains(msg.sender)) {
            revert AlreadyVoted();
        }
        uint256 amount = balanceOf(msg.sender);
        voters.add(msg.sender);
        if (_vote == Vote.FOR) {
            issue.votesFor += amount;
        } else if (_vote == Vote.AGAINST) {
            issue.votesAgainst += amount;
        } else {
            issue.votesAbstain += amount;
        }
        issue.totalVotes += amount;
        if (issue.totalVotes >= issue.quorum) {
            issue.closed = true;
            if (issue.votesFor > issue.votesAgainst) {
                issue.passed = true;
            }
        }
    }
}