// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Interface de Parameters
 * @dev Debe proveer stakingLockTime() en segundos.
 */
interface IParameters {
    function stakingLockTime() external view returns (uint256);
}

/**
 * @title Staking para la DAO
 * @dev Maneja staking separado para votar y para proponer.
 * Compatible con ShaCoin (ERC20 estándar).
 */
import "./interfaces/IStaking.sol";

contract Staking is ReentrancyGuard, Ownable, IStaking {

    // Errores
    error InvalidAddress();
    error InvalidAmount();
    error StakeLocked();
    error InsufficientStake();

    IERC20 public immutable token;
    IParameters public parameters;

    // Locks separados por tipo
    uint256 public votingLock;
    uint256 public proposingLock;

    // stakes separados
    mapping(address => uint256) public votingStake;
    mapping(address => uint256) public proposalStake;

    // locks separados por usuario y tipo
    mapping(address => uint256) public lockedUntilVoting;
    mapping(address => uint256) public lockedUntilProposing;

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
        if (_token == address(0)) revert InvalidAddress();
        if (_parameters == address(0)) revert InvalidAddress();

        token = IERC20(_token);
        parameters = IParameters(_parameters);
    }

    // -------------------------------------------------------------------------
    // Staking
    // -------------------------------------------------------------------------

    function stakeForVoting(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        token.transferFrom(msg.sender, address(this), amount);
        votingStake[msg.sender] += amount;
        totalVotingStaked += amount;

        uint256 newLock = block.timestamp + votingLock;
        lockedUntilVoting[msg.sender] = newLock;

        emit StakedForVoting(msg.sender, amount, newLock);
    }

    function stakeForVotingFrom(address user, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        token.transferFrom(msg.sender, address(this), amount);
        votingStake[user] += amount;
        totalVotingStaked += amount;

        uint256 newLock = block.timestamp + votingLock;
        lockedUntilVoting[user] = newLock;

        emit StakedForVoting(user, amount, newLock);
    }

    function stakeForProposing(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        token.transferFrom(msg.sender, address(this), amount);
        proposalStake[msg.sender] += amount;
        totalProposalStaked += amount;

        uint256 newLock = block.timestamp + proposingLock;
        lockedUntilProposing[msg.sender] = newLock;

        emit StakedForProposing(msg.sender, amount, newLock);
    }

    function stakeForProposingFrom(address user, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        token.transferFrom(msg.sender, address(this), amount);
        proposalStake[user] += amount;
        totalProposalStaked += amount;

        uint256 newLock = block.timestamp + proposingLock;
        lockedUntilProposing[user] = newLock;

        emit StakedForProposing(user, amount, newLock);
    }

    // -------------------------------------------------------------------------
    // Unstaking (solo después del lock)
    // -------------------------------------------------------------------------

    function unstakeFromVoting(uint256 amount) external nonReentrant {
        if (block.timestamp < lockedUntilVoting[msg.sender]) revert StakeLocked();
        if (votingStake[msg.sender] < amount) revert InsufficientStake();

        votingStake[msg.sender] -= amount;
        totalVotingStaked -= amount;

        token.transfer(msg.sender, amount);

        emit UnstakedVoting(msg.sender, amount);
    }

    function unstakeFromProposing(uint256 amount) external nonReentrant {
        if (block.timestamp < lockedUntilProposing[msg.sender]) revert StakeLocked();
        if (proposalStake[msg.sender] < amount) revert InsufficientStake();

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

    function setVotingLock(uint256 newLock) external onlyOwner {
        votingLock = newLock;
    }

    function setProposingLock(uint256 newLock) external onlyOwner {
        proposingLock = newLock;
    }

    function setParameters(address newParameters) external onlyOwner {
        if (newParameters == address(0)) revert InvalidAddress();
        emit ParametersUpdated(address(parameters), newParameters);
        parameters = IParameters(newParameters);
    }
}
