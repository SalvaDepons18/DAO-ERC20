// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVotingStrategy
 * @dev Interfaz base para todas las estrategias de votación.
 *.
 */
interface IVotingStrategy {

    /**
     * @notice Calcula el poder de voto de un usuario según la estrategia activa.
     * @param user El address del votante
     * @return votingPower Poder de voto calculado
     */
    function calculateVotingPower(address user)
        external
        view
        returns (uint256 votingPower);

    /**
     * @notice Determina si una propuesta es aceptada o rechazada.
     * @param p Struct con datos de la propuesta (debe ser definido externamente)
     * @return accepted true si la propuesta pasa la estrategia, false si no
     */
    function isProposalAccepted(Proposal memory p)
        external
        view
        returns (bool accepted);
}

/**
 * @dev Struct esperado por la estrategia. 
 *
 */
struct Proposal {
    uint256 votesFor;
    uint256 votesAgainst;
    uint256 totalVotingPower;
    uint256 createdAt;
    address issuer;
    bool active;
}