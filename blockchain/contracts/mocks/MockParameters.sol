// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockParameters {
    uint256 public tokenPriceValue = 1 ether;

    function setPrice(uint256 _price) external {
        tokenPriceValue = _price;
    }

    function tokenPrice() external view returns (uint256) {
        return tokenPriceValue;
    }
}
