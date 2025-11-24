// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IParameters.sol";

contract Parameters is Ownable, IParameters {

    uint256 public tokensPerVotingPower;
    uint256 public minStakeForVoting;
    uint256 public minStakeForProposing;
    uint256 public stakingLockTime;
    uint256 public proposalDuration;
    uint256 public tokenPrice;

    event TokensPerVotingPowerChanged(uint256 oldValue, uint256 newValue);
    event MinStakeForVotingChanged(uint256 oldValue, uint256 newValue);
    event MinStakeForProposingChanged(uint256 oldValue, uint256 newValue);
    event StakingLockTimeChanged(uint256 oldValue, uint256 newValue);
    event ProposalDurationChanged(uint256 oldValue, uint256 newValue);
    event TokenPriceChanged(uint256 oldValue, uint256 newValue);

    constructor(address daoOwner) Ownable(daoOwner) {
        require(daoOwner != address(0), "Owner cannot be zero");
    }

    function setTokensPerVotingPower(uint256 value) external onlyOwner {
        emit TokensPerVotingPowerChanged(tokensPerVotingPower, value);
        tokensPerVotingPower = value;
    }

    function setMinStakeForVoting(uint256 value) external onlyOwner {
        emit MinStakeForVotingChanged(minStakeForVoting, value);
        minStakeForVoting = value;
    }

    function setMinStakeForProposing(uint256 value) external onlyOwner {
        emit MinStakeForProposingChanged(minStakeForProposing, value);
        minStakeForProposing = value;
    }

    function setStakingLockTime(uint256 value) external onlyOwner {
        emit StakingLockTimeChanged(stakingLockTime, value);
        stakingLockTime = value;
    }

    function setProposalDuration(uint256 value) external onlyOwner {
        emit ProposalDurationChanged(proposalDuration, value);
        proposalDuration = value;
    }

    function setTokenPrice(uint256 value) external onlyOwner {
        emit TokenPriceChanged(tokenPrice, value);
        tokenPrice = value;
    }
}