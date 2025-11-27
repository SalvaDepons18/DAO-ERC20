// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;



interface IPanicManager {
    function panicOperator() external view returns (address);
    function isPanicked() external view returns (bool);
    function setPanicOperator(address _newOperator) external;
    function panic() external;
    function calm() external;
    function checkNotPanicked() external view;
}
