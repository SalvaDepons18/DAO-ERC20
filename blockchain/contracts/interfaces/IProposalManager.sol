// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;



interface IProposalManager {
    enum VoteType { NONE, FOR, AGAINST }
    enum ProposalState { ACTIVE, ACCEPTED, REJECTED, EXPIRED }
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

    function createProposal(string calldata _title, string calldata _description, uint256 _votingPower) external returns (uint256);
    function vote(uint256 _proposalId, VoteType _voteType, uint256 _votingWeight) external;
    function changeVote(uint256 _proposalId, VoteType _newVoteType, uint256 _votingWeight) external;
    function finalizeProposal(uint256 _proposalId, uint256 _totalVotingPower) external;
    function expireProposal(uint256 _proposalId) external;
    function getProposal(uint256 _proposalId) external view returns (Proposal memory);
    function getUserVote(uint256 _proposalId, address _voter) external view returns (VoteType);
    function isProposalActive(uint256 _proposalId) external view returns (bool);
    function hasUserVoted(uint256 _proposalId, address _voter) external view returns (bool);
    function getProposalResults(uint256 _proposalId) external view returns (uint256 votesFor, uint256 votesAgainst);
    function getProposalState(uint256 _proposalId) external view returns (ProposalState);
    function hasProposalDeadlinePassed(uint256 _proposalId) external view returns (bool);
    function setVotingStrategy(address _newVotingStrategy) external;
    function linkStrategyManager(address _strategyManager) external;
    function getActiveVotingStrategyAddress() external view returns (address);
    function setMinVotingPowerToPropose(uint256 _newMinVotingPower) external;
    function setDefaultProposalDuration(uint256 _newDuration) external;
}
