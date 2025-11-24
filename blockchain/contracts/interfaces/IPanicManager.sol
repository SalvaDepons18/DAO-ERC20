// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;



interface IPanicManager {
    function setPanicOperator(address _newOperator) external;
    function panic() external;
    function calm() external;
    function checkNotPanicked() external view;
}
