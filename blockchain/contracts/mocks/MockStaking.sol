// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockStaking {
    address public lastUser;
    uint256 public lastAmount;

    function stakeForVoting(address _user, uint256 _amount) external {
        lastUser = _user;
        lastAmount = _amount;
    }

    function stakeForProposing(address _user, uint256 _amount) external {
        lastUser = _user;
        lastAmount = _amount;
    }

    function unstakeVoting(address _user) external {
        lastUser = _user;
    }

    function unstakeProposing(address _user) external {
        lastUser = _user;
    }
}
