// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Interface de Parameters
 * @dev Debe proveer minStakeLock() en segundos.
 */
interface IParameters {
    function minStakeLock() external view returns (uint256);
}

/**
 * @title Staking para la DAO
 * @dev Maneja staking separado para votar y para proponer.
 * Compatible con ShaCoin (ERC20 estándar).
 */
contract Staking is ReentrancyGuard, Ownable {

    IERC20 public immutable token;
    IParameters public parameters;

    // stakes separados
    mapping(address => uint256) private votingStake;
    mapping(address => uint256) private proposalStake;

    // único lock por usuario
    mapping(address => uint256) public lockedUntil;

    // Totales
    uint256 public totalVotingStaked;
    uint256 public totalProposalStaked;

    // Eventos
    event StakedForVoting(address indexed user, uint256 amount, uint256 lockedUntil);
    event StakedForProposing(address indexed user, uint256 amount, uint256 lockedUntil);
    event UnstakedVoting(address indexed user, uint256 amount);
    event UnstakedProposing(address indexed user, uint256 amount);
    event ParametersUpdated(address oldAddress, address newAddress);

    constructor(address _token, address _parameters)
        Ownable(msg.sender)
    {
        require(_token != address(0), "token zero");
        require(_parameters != address(0), "parameters zero");

        token = IERC20(_token);
        parameters = IParameters(_parameters);
    }

    // -------------------------------------------------------------------------
    // Staking
    // -------------------------------------------------------------------------

    function stakeForVoting(uint256 amount) external nonReentrant {
        require(amount > 0, "amount 0");

        token.transferFrom(msg.sender, address(this), amount);
        votingStake[msg.sender] += amount;
        totalVotingStaked += amount;

        uint256 newLock = block.timestamp + parameters.minStakeLock();

        if (lockedUntil[msg.sender] < newLock) {
            lockedUntil[msg.sender] = newLock;
        }

        emit StakedForVoting(msg.sender, amount, lockedUntil[msg.sender]);
    }

    function stakeForProposing(uint256 amount) external nonReentrant {
        require(amount > 0, "amount 0");

        token.transferFrom(msg.sender, address(this), amount);
        proposalStake[msg.sender] += amount;
        totalProposalStaked += amount;

        uint256 newLock = block.timestamp + parameters.minStakeLock();

        if (lockedUntil[msg.sender] < newLock) {
            lockedUntil[msg.sender] = newLock;
        }

        emit StakedForProposing(msg.sender, amount, lockedUntil[msg.sender]);
    }

    // -------------------------------------------------------------------------
    // Unstaking (solo después del lock)
    // -------------------------------------------------------------------------

    function unstakeVoting(uint256 amount) external nonReentrant {
        require(block.timestamp >= lockedUntil[msg.sender], "locked");
        require(votingStake[msg.sender] >= amount, "insufficient");

        votingStake[msg.sender] -= amount;
        totalVotingStaked -= amount;

        token.transfer(msg.sender, amount);

        emit UnstakedVoting(msg.sender, amount);
    }

    function unstakeProposing(uint256 amount) external nonReentrant {
        require(block.timestamp >= lockedUntil[msg.sender], "locked");
        require(proposalStake[msg.sender] >= amount, "insufficient");

        proposalStake[msg.sender] -= amount;
        totalProposalStaked -= amount;

        token.transfer(msg.sender, amount);

        emit UnstakedProposing(msg.sender, amount);
    }

    // -------------------------------------------------------------------------
    // Getters
    // -------------------------------------------------------------------------

    function getVotingStake(address user) external view returns (uint256) {
        return votingStake[user];
    }

    function getProposingStake(address user) external view returns (uint256) {
        return proposalStake[user];
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setParameters(address newParameters) external onlyOwner {
        require(newParameters != address(0), "zero");
        emit ParametersUpdated(address(parameters), newParameters);
        parameters = IParameters(newParameters);
    }
}
