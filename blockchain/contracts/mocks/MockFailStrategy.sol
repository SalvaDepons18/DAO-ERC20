// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IVotingStrategy.sol";

// Estratégia que siempre revierte en getTotalVotingPower para probar StrategyError
contract MockFailStrategy is IVotingStrategy {
    function calculateVotingPower(address /*user*/) external pure returns (uint256) {
        return 0; // No usado en test de finalizeProposal
    }
    function isProposalAccepted(uint256, uint256, uint256) external pure returns (bool) {
        return false;
    }
    function getTotalVotingPower() external pure returns (uint256) {
        revert("Failure");
    }
}