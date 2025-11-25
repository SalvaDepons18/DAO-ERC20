// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockStaking {
    address public lastUser;
    uint256 public lastAmount;

    address public currentUser;

    function stakeForVotingFrom(address user, uint256 amount) external {
        lastUser = currentUser != address(0) ? currentUser : user;
        lastAmount = amount;
    }

    function stakeForProposingFrom(address user, uint256 amount) external {
        lastUser = currentUser != address(0) ? currentUser : user;
        lastAmount = amount;
    }

    function unstakeFromVoting(uint256) external {
        lastUser = currentUser;
    }

    function unstakeFromProposing(uint256) external {
        lastUser = currentUser;
    }

    function getVotingStake(address) external pure returns (uint256) {
        return 0;
    }

    function getProposingStake(address) external pure returns (uint256) {
        return 0;
    }

    function totalVotingStaked() external pure returns (uint256) {
        return 10000 ether;
    }

    function setCurrentUser(address user) external {
        currentUser = user;
    }
}
