// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockParameters {
    uint256 public tokenPriceValue = 1 ether;
    // Governance params defaults (simple mock)
    uint256 public tokensPerVotingPower;
    uint256 public minStakeForVoting;
    uint256 public minStakeForProposing;
    uint256 public stakingLockTime;
    uint256 public proposalDuration;

    function setTokenPriceValue(uint256 p) external {
        tokenPriceValue = p;
    }

    // Alias para compatibilidad con tests
    function setPrice(uint256 p) external {
        tokenPriceValue = p;
    }

    function tokenPrice() external view returns (uint256) { return tokenPriceValue; }

    // Simple setters for tests
    function setMinStakeForVoting(uint256 v) external { minStakeForVoting = v; }
    function setMinStakeForProposing(uint256 v) external { minStakeForProposing = v; }
    function setStakingLockTime(uint256 v) external { stakingLockTime = v; }
    function setProposalDuration(uint256 v) external { proposalDuration = v; }
    function setTokensPerVotingPower(uint256 v) external { tokensPerVotingPower = v; }

    // Getters (legacy prefixed for backwards compatibility)
    function getMinStakeForVoting() external view returns (uint256) { return minStakeForVoting; }
    function getMinStakeForProposing() external view returns (uint256) { return minStakeForProposing; }
    function getStakingLockTime() external view returns (uint256) { return stakingLockTime; }
    function getProposalDuration() external view returns (uint256) { return proposalDuration; }
    function getTokensPerVotingPower() external view returns (uint256) { return tokensPerVotingPower; }

    // Public state variables already create interface-aligned getters.
}
