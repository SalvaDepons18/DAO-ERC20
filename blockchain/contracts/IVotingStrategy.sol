// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IVotingStrategy
 * @dev Interfaz base para todas las estrategias de votación.
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
     * @param votesFor Votos a favor
     * @param votesAgainst Votos en contra
     * @param totalVotingPower Poder de voto total del sistema
     * @return accepted true si la propuesta pasa la estrategia, false si no
     */
    function isProposalAccepted(
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 totalVotingPower
    ) external view returns (bool);
}