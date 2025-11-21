// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./IVoteStrategy.sol";
import "./Parameteres.sol";
import "./Staking.sol";

/**
 * @title SimpleMajorityStrategy
 * @dev Estrategia de votación por mayoría simple.
 * Implementa la estrategia más básica: gana quien tenga más votos a favor que en contra.
 *
 */
contract SimpleMajorityStrategy is IVotingStrategy {
    
    // Errores
    error InvalidAddress();

    Staking public staking;
    
    Parameters public parameters;

    /**
     * @dev Constructor que inicializa las referencias a Staking y Parameters
     */
    constructor(address _staking, address _parameters) {
        if (_staking == address(0)) revert InvalidAddress();
        if (_parameters == address(0)) revert InvalidAddress();
        
        staking = Staking(_staking);
        parameters = Parameters(_parameters);
    }

    /**
     * @notice Calcula el poder de voto de un usuario según su stake.
     */
    function calculateVotingPower(address user) 
        external 
        view 
        override 
        returns (uint256 votingPower) 
    {
        if (user == address(0)) revert InvalidAddress();
        
        uint256 userStake = staking.getVotingStake(user);
        uint256 tokensPerVP = parameters.tokensPerVotingPower();
        
        if (tokensPerVP == 0) {
            return 0;
        }
        
        votingPower = userStake / tokensPerVP;
        
        return votingPower;
    }

    /**
     * @notice Determina si una propuesta es aceptada.
     * */
    function isProposalAccepted(Proposal memory p) 
        external 
        view 
        override 
        returns (bool accepted) 
    {
        return p.votesFor > p.votesAgainst;
    }

        /**
         * @notice Determina si una propuesta es aceptada (firma esperada por ProposalManager)
         * @dev La propuesta es aceptada si votesFor > votesAgainst
         */
        function isProposalAccepted(uint256 votesFor, uint256 votesAgainst, uint256 /*totalVotingPower*/) 
            external 
            pure 
            returns (bool)
        {
            return votesFor > votesAgainst;
        }
}