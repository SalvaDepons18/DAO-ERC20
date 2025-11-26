// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;



interface IStaking {
    function stakeForVoting(uint256 amount) external;
    function stakeForProposing(uint256 amount) external;
    function stakeForVotingFrom(address user, uint256 amount) external;
    function stakeForProposingFrom(address user, uint256 amount) external;
    function unstakeFromVoting(uint256 amount) external;
    function unstakeFromProposing(uint256 amount) external;
    function getVotingStake(address user) external view returns (uint256);
    function getProposingStake(address user) external view returns (uint256);
    function totalVotingStaked() external view returns (uint256);
    function setVotingLock(uint256 newLock) external;
    function setProposingLock(uint256 newLock) external;
    function setParameters(address newParameters) external;
    // Newly added for lock extension on vote
    function extendVotingLock(address user, uint256 newUnlockTime) external;
    function getVotingLockExpiry(address user) external view returns (uint256);
}
