// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IVotingStrategy.sol";

/**
 * @title StrategyManager
 * @dev Administrador centralizado de estrategias de votación.
 * Permite cambiar la estrategia activa de manera segura.
 * Solo el owner (multisig) puede actualizar la estrategia.
**/

contract StrategyManager is Ownable {
    IVotingStrategy public activeStrategy;

    event StrategyChanged(
        address indexed oldStrategy,
        address indexed newStrategy,
        uint256 timestamp
    );

    error InvalidStrategy();
    error SameStrategy();

    constructor(address _initialStrategy) Ownable(msg.sender) {
        if (_initialStrategy == address(0)) revert InvalidStrategy();

        activeStrategy = IVotingStrategy(_initialStrategy);
    }
 
    /**
     * @dev Cambia la estrategia activa de votación
     * @param _newStrategy Dirección de la nueva estrategia
     * 
     */
    function setActiveStrategy(address _newStrategy) external onlyOwner {
        if (_newStrategy == address(0)) revert InvalidStrategy();
        if (_newStrategy == address(activeStrategy)) revert SameStrategy();

        address oldStrategy = address(activeStrategy);
        activeStrategy = IVotingStrategy(_newStrategy);

        emit StrategyChanged(oldStrategy, _newStrategy, block.timestamp);
    }

    /**
     * @dev Obtiene la estrategia activa
     * @return La interfaz de la estrategia activa
     */
    function getActiveStrategy() external view returns (IVotingStrategy) {
        return activeStrategy;
    }
    
    /**
     * @dev Obtiene la dirección de la estrategia activa
     */
    function getActiveStrategyAddress() external view returns (address) {
        return address(activeStrategy);
    }
}
