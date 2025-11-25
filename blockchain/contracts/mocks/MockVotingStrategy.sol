// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IVotingStrategy {
    function calculateVotingPower(address user) external view returns (uint256);
}

contract MockVotingStrategy {
    uint256 public base;
    constructor(uint256 _base){ base = _base; }
    function calculateVotingPower(address user) external view returns (uint256){
        if(user == address(0)) return 0;
        return base;
    }
}
