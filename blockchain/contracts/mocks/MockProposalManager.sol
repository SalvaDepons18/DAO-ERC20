// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProposalManager {
    enum VoteType { NONE, FOR, AGAINST }
}

enum ProposalState {
    ACTIVE,
    ACCEPTED,
    REJECTED,
    EXPIRED
}

struct Proposal {
    string title;
    string description;
    address proposer;
    uint256 createdAt;
    uint256 deadline;
    uint256 votesFor;
    uint256 votesAgainst;
    ProposalState state;
    address strategyUsed;
}

contract MockProposalManager {
    uint256 public nextId = 1;
    uint256 public proposalCount; // track number of created proposals

    address public lastCreator;
    string public lastTitle;
    string public lastDescription;

    uint256 public lastVoteProposal;
    address public lastVoteUser;
    bool public lastSupport;

    uint256 public lastChangeProposal;
    address public lastChangeUser;
    bool public lastChangeSupport;
    
    // Variable para almacenar el votante desde fuera (el DAO lo establece)
    address public currentVoter;
    address public currentCreator;

    function createProposal(address _proposer, string calldata _title, string calldata _description, uint256 /* _votingPower */)
        external
        returns (uint256)
    {
        lastCreator = _proposer;
        lastTitle = _title;
        lastDescription = _description;
        proposalCount += 1;
        return nextId++;
    }

    function vote(address _voter, uint256 _proposalId, IProposalManager.VoteType _voteType) external {
        lastVoteProposal = _proposalId;
        lastVoteUser = _voter;
        lastSupport = _voteType == IProposalManager.VoteType.FOR;
    }

    function changeVote(address _voter, uint256 _proposalId, IProposalManager.VoteType _newVoteType) external {
        lastChangeProposal = _proposalId;
        lastChangeUser = _voter;
        lastChangeSupport = _newVoteType == IProposalManager.VoteType.FOR;
    }
    
    // Función que el DAO llama para establecer quién va a votar
    function setCurrentVoter(address _voter) external {
        currentVoter = _voter;
    }
    
    // Función que el DAO llama para establecer quién va a crear la propuesta
    function setCurrentCreator(address _creator) external {
        currentCreator = _creator;
    }

    function getProposal(uint256) external view returns (Proposal memory) {
        return Proposal({
            title: "Test Proposal",
            description: "Test Description",
            proposer: address(0x123),
            createdAt: block.timestamp - 1 days,
            deadline: block.timestamp + 7 days,
            votesFor: 100,
            votesAgainst: 50,
            state: ProposalState.ACTIVE,
            strategyUsed: address(0x456)
        });
    }

    function getProposalState(uint256) external pure returns (ProposalState) {
        return ProposalState.ACTIVE;
    }

    function getProposalResults(uint256) external pure returns (uint256 votesFor, uint256 votesAgainst) {
        return (100, 50);
    }

    function getUserVote(uint256, address) external pure returns (IProposalManager.VoteType) {
        return IProposalManager.VoteType.FOR;
    }

    function isProposalActive(uint256) external pure returns (bool) {
        return true;
    }

    function hasUserVoted(uint256, address) external pure returns (bool) {
        return true;
    }

    function hasProposalDeadlinePassed(uint256) external pure returns (bool) {
        return false;
    }

    function finalizeProposal(uint256, uint256) external {}

    function expireProposal(uint256) external {}
}




