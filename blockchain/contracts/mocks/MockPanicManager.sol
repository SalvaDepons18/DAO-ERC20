// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPanicManager {
    bool public isPanicked = false;
    address public panicOperator;

    constructor() {
        panicOperator = msg.sender;
    }

    function setPanic(bool _p) external {
        isPanicked = _p;
    }

    function checkNotPanicked() external view {
        if (isPanicked) revert();
    }

    function setPanicOperator(address _operator) external {
        panicOperator = _operator;
    }
}
