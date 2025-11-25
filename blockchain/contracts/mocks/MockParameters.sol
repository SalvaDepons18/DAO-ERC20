// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockParameters {
    uint256 public tokenPriceValue = 1 ether;

    function setTokenPriceValue(uint256 p) external {
        tokenPriceValue = p;
    }

    // Alias para compatibilidad con tests
    function setPrice(uint256 p) external {
        tokenPriceValue = p;
    }

    function tokenPrice() external view returns (uint256) {
        return tokenPriceValue;
    }
}
