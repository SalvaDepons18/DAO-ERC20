// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockGovernanceToken {
    uint256 public lastMintAmount;
    address public lastMintTo;

    uint256 public lastBurnAmount;
    address public lastBurnFrom;

    function mint(address _to, uint256 _amount) external {
        lastMintTo = _to;
        lastMintAmount = _amount;
    }

    function burn(address _from, uint256 _amount) external {
        lastBurnFrom = _from;
        lastBurnAmount = _amount;
    }

    function transferFrom(address from, address, uint256 amount) external returns (bool) {
        lastBurnFrom = from;
        lastBurnAmount = amount;
        return true;
    }

    function approve(address, uint256) external pure returns (bool) {
        return true;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }
}
