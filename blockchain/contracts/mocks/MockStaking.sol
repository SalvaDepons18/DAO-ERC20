// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockStaking {
    address public lastUser;
    uint256 public lastAmount;
    
    // Variable para almacenar el usuario actual (establecida por el DAO)
    address public currentUser;

    function stakeForVoting(uint256 _amount) external {
        lastUser = currentUser != address(0) ? currentUser : msg.sender;
        lastAmount = _amount;
    }

    function stakeForProposing(uint256 _amount) external {
        lastUser = currentUser != address(0) ? currentUser : msg.sender;
        lastAmount = _amount;
    }

    function unstakeFromVoting(uint256 _amount) external {
        lastUser = currentUser != address(0) ? currentUser : msg.sender;
    }

    function unstakeFromProposing(uint256 _amount) external {
        lastUser = currentUser != address(0) ? currentUser : msg.sender;
    }

    function getVotingStake(address _user) external pure returns (uint256) {
        return 0;
    }

    function getProposingStake(address _user) external pure returns (uint256) {
        return 0;
    }
    
    // Función que el DAO llama para establecer el usuario actual
    function setCurrentUser(address _user) external {
        currentUser = _user;
    }
}
