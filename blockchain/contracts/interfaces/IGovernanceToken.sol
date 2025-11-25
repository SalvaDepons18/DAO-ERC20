// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGovernanceToken {
    function mint(address _to, uint256 _amount) external;
    function burn(address _from, uint256 _amount) external;
    function transferFrom(address _from, address _to, uint256 _amount) external returns (bool);
    function approve(address _spender, uint256 _amount) external returns (bool);
    function balanceOf(address _account) external view returns (uint256);
    function allowance(address _owner, address _spender) external view returns (uint256);
}
