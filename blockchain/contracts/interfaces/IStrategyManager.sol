// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;



import "./IVotingStrategy.sol";

interface IStrategyManager {
    function setActiveStrategy(address _newStrategy) external;
    function getActiveStrategy() external view returns (IVotingStrategy);
    function getActiveStrategyAddress() external view returns (address);
}
