// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IVotingStrategy.sol";
import "./Parameters.sol";
import "./interfaces/IStaking.sol";


/**
 * @title SimpleMajorityStrategy
 * @dev Estrategia de votación por mayoría simple.
 * Implementa la estrategia más básica: gana quien tenga más votos a favor que en contra.
 *
 */
contract SimpleMajorityStrategy is IVotingStrategy {
    
    // Errores
    error InvalidAddress();

    IStaking public staking;
    
    Parameters public parameters;


    /**
     * @dev Constructor que inicializa las referencias a Staking y Parameters
     */
    constructor(address _staking, address _parameters) {
        if (_staking == address(0)) revert InvalidAddress();
        if (_parameters == address(0)) revert InvalidAddress();
        
        staking = IStaking(_staking);
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
        
        if (userStake == 0) {
            return 0;
        }
        
        uint256 tokensPerVP = parameters.tokensPerVotingPower();
        
        if (tokensPerVP == 0) {
            return 0;
        }
        
        votingPower = userStake / tokensPerVP;
        
        return votingPower;
    }

    /**
     * @notice Determina si una propuesta es aceptada
     * @dev La propuesta es aceptada si votesFor > votesAgainst
     * @param votesFor Votos a favor
     * @param votesAgainst Votos en contra
     * @return bool true si la propuesta es aceptada
     */
    function isProposalAccepted(
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 /*totalVotingPower*/
    ) external pure override returns (bool) {
        return votesFor > votesAgainst;
    }

    /**
     * @notice Retorna el poder de voto total del sistema basado en el stake total
     */
    function getTotalVotingPower() external view override returns (uint256) {
        uint256 totalStake = staking.totalVotingStaked();
        uint256 tokensPerVP = parameters.tokensPerVotingPower();
        if (tokensPerVP == 0) {
            return 0;
        }
        return totalStake / tokensPerVP;
    }
}