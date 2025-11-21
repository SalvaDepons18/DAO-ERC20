// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockProposalManager {
    uint256 public nextId = 1;

    address public lastCreator;
    string public lastTitle;
    string public lastDescription;

    uint256 public lastVoteProposal;
    address public lastVoteUser;
    bool public lastSupport;

    function createProposal(address _creator, string calldata _title, string calldata _description)
        external
        returns (uint256)
    {
        lastCreator = _creator;
        lastTitle = _title;
        lastDescription = _description;
        return nextId++;
    }

    function vote(uint256 _proposalId, address _voter, bool _support) external {
        lastVoteProposal = _proposalId;
        lastVoteUser = _voter;
        lastSupport = _support;
    }
}
