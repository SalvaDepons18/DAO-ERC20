// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockPanicManager {
    bool public isPanicked = false;

    function setPanic(bool _p) external {
        isPanicked = _p;
    }

    function checkNotPanicked() external view {
        if (isPanicked) revert();
    }
}
