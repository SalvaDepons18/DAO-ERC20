// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
* @title PanicManager
* @dev Controla el estado de panico del DAO
* La funcion del contrato es activar o desactivar el modo panico
* Solo podra hacerlo la multisig asignada como "panicOperator"
*
* Cuando la DAO este en panico:
* - Ningun otro contrato debe permitir operaciones
* - Solo se puede ejecutar panic() y calm()
*
* Uso el patron: "Guard Pattern"
* - otros contratos llaman a checkNotPanicked() para bloquear operaciones
 */

import "./interfaces/IPanicManager.sol";

contract PanicManager is IPanicManager {
    error NotPanicOperator();
    error InvalidAddress();
    error PanicActive();
    error PanicNotActive();
    error NotDao();

    event PanicActivated(address indexed triggeredBy);
    event PanicDeactivated(address indexed triggeredBy);
    event PanicOperatorChanged(address indexed oldOperator, address indexed newOperator);

    address public panicOperator;
    bool public isPanicked;
    address public immutable dao;

    modifier onlyDao() {
        if (msg.sender != dao) revert NotDao();
        _;
    }

    modifier onlyPanicOperator() {
        if (msg.sender != panicOperator) revert NotPanicOperator();
        _;
    }

    modifier whenNotPanicked() {
        if (isPanicked) revert PanicActive();
        _;
    }

    /**
    * @param _dao direccion del contrato DAO (dueno)
    * @param _panicOperator direccion de la multisig que maneja el panicbutton
    *
    */
    constructor(address _dao, address _panicOperator) {
        if (_dao == address(0) || _panicOperator == address(0)) revert InvalidAddress();

        dao = _dao;
        panicOperator = _panicOperator;
    }

    /**
    * @notice el DAO puede cambiar la multisig de panico para actualizar la seguridad sin redeployar
    *
     */
     function setPanicOperator(address _newOperator) external onlyDao {
        if (_newOperator == address(0)) revert InvalidAddress();
        emit PanicOperatorChanged(panicOperator, _newOperator);
        panicOperator = _newOperator;
     }

     function panic() external onlyPanicOperator() {
        if(isPanicked) revert PanicActive();
        emit PanicActivated(msg.sender);
        isPanicked = true;

     }

     function calm() external onlyPanicOperator() {
        if (!isPanicked) revert PanicNotActive();
        emit PanicDeactivated(msg.sender);
        isPanicked = false;
     }

     function checkNotPanicked() external view whenNotPanicked {}

 }