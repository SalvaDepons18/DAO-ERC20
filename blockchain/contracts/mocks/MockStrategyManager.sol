// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockStrategyManager {
    address public current;

    function setActiveStrategy(address _new) external {
        current = _new;
    }

    function getStrategy() external view returns (address) {
        return current;
    }
}
