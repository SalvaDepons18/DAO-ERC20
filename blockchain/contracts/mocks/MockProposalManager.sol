// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProposalManager {
    enum VoteType { NONE, FOR, AGAINST }
}

contract MockProposalManager {
    uint256 public nextId = 1;

    address public lastCreator;
    string public lastTitle;
    string public lastDescription;

    uint256 public lastVoteProposal;
    address public lastVoteUser;
    bool public lastSupport;
    
    // Variable para almacenar el votante desde fuera (el DAO lo establece)
    address public currentVoter;
    address public currentCreator;

    function createProposal(string calldata _title, string calldata _description, uint256 _votingPower)
        external
        returns (uint256)
    {
        lastCreator = currentCreator;
        lastTitle = _title;
        lastDescription = _description;
        return nextId++;
    }

    function vote(uint256 _proposalId, IProposalManager.VoteType _voteType, uint256 _votingWeight) external {
        lastVoteProposal = _proposalId;
        lastVoteUser = currentVoter;
        lastSupport = _voteType == IProposalManager.VoteType.FOR;
    }
    
    // Función que el DAO llama para establecer quién va a votar
    function setCurrentVoter(address _voter) external {
        currentVoter = _voter;
    }
    
    // Función que el DAO llama para establecer quién va a crear la propuesta
    function setCurrentCreator(address _creator) external {
        currentCreator = _creator;
    }
}




