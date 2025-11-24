// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;



interface IParameters {
    function tokensPerVotingPower() external view returns (uint256);
    function minStakeForVoting() external view returns (uint256);
    function minStakeForProposing() external view returns (uint256);
    function stakingLockTime() external view returns (uint256);
    function proposalDuration() external view returns (uint256);
    function tokenPrice() external view returns (uint256);
    function setTokensPerVotingPower(uint256 value) external;
    function setMinStakeForVoting(uint256 value) external;
    function setMinStakeForProposing(uint256 value) external;
    function setStakingLockTime(uint256 value) external;
    function setProposalDuration(uint256 value) external;
    function setTokenPrice(uint256 value) external;
}
