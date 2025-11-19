// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SimpleMajorityStrategy
 * @dev Estrategia simple de votación: requiere mayoría simple de votos a favor
 * NOTA: Este es un contrato temporal para testing. Será reemplazado por la implementación final.
 */
interface IVotingStrategy {
    function isProposalAccepted(
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 totalVotingPower
    ) external view returns (bool);
}

contract SimpleMajorityStrategy is IVotingStrategy {
    /**
     * @dev Una propuesta se acepta si tiene más votos a favor que en contra
     */
    function isProposalAccepted(
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 totalVotingPower
    ) external pure override returns (bool) {
        return votesFor > votesAgainst;
    }
}
