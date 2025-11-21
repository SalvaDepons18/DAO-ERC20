// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ShaCoin
 * @dev ERC20 para gobernanza, con mint restringido al owner (DAO).
 */
contract ShaCoin is ERC20, Ownable {

    // Errores
    error InvalidAddress();
    error InvalidAmount();

    /**
     * @param daoOwner Dirección del owner (contrato DAO).
     */
    constructor(address daoOwner)
        ERC20("ShaCoin", "SHACO")
        Ownable(daoOwner)
    {
        if (daoOwner == address(0)) revert InvalidAddress();
    }

    /**
     * @notice Mint de tokens. Solo la DAO (owner) puede mintear.
     */
    function mint(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 18;
    }
}
