// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IParameters.sol";

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

    // DAO controller authorized to extend locks
    address public daoController;

    error NotAuthorized();

    // Eventos
    event StakedForVoting(address indexed user, uint256 amount, uint256 lockedUntil);
    event StakedForProposing(address indexed user, uint256 amount, uint256 lockedUntil);
    event UnstakedVoting(address indexed user, uint256 amount);
    event UnstakedProposing(address indexed user, uint256 amount);
    event ParametersUpdated(address oldAddress, address newAddress);
    event VotingLockUpdated(uint256 oldValue, uint256 newValue);
    event ProposingLockUpdated(uint256 oldValue, uint256 newValue);

    constructor(address _token, address _parameters)
        Ownable(msg.sender)
    {
        if (_token == address(0)) revert InvalidAddress();
        if (_parameters == address(0)) revert InvalidAddress();

        token = IERC20(_token);
        parameters = IParameters(_parameters);
    }

    // Set DAO controller (can be DAO contract) to allow lock extension
    function setDaoController(address _dao) external onlyOwner {
        if (_dao == address(0)) revert InvalidAddress();
        daoController = _dao;
    }

    // -------------------------------------------------------------------------
    // Staking
    // -------------------------------------------------------------------------

    function stakeForVoting(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        token.transferFrom(msg.sender, address(this), amount);
        votingStake[msg.sender] += amount;
        totalVotingStaked += amount;

        uint256 newLock = block.timestamp + parameters.stakingLockTime();
        lockedUntilVoting[msg.sender] = newLock;

        emit StakedForVoting(msg.sender, amount, newLock);
    }

    function stakeForVotingFrom(address user, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        votingStake[user] += amount;
        totalVotingStaked += amount;

        uint256 newLock = block.timestamp + parameters.stakingLockTime();
        lockedUntilVoting[user] = newLock;

        emit StakedForVoting(user, amount, newLock);
    }

    function stakeForProposing(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();

        token.transferFrom(msg.sender, address(this), amount);
        proposalStake[msg.sender] += amount;
        totalProposalStaked += amount;

        uint256 newLock = block.timestamp + parameters.stakingLockTime();
        lockedUntilProposing[msg.sender] = newLock;

        emit StakedForProposing(msg.sender, amount, newLock);
    }

    function stakeForProposingFrom(address user, uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        proposalStake[user] += amount;
        totalProposalStaked += amount;

        uint256 newLock = block.timestamp + parameters.stakingLockTime();
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

    function getVotingLockExpiry(address user) external view returns (uint256) {
        return lockedUntilVoting[user];
    }

    function extendVotingLock(address user, uint256 newUnlockTime) external {
        if (msg.sender != daoController) revert NotAuthorized();
        if (newUnlockTime > lockedUntilVoting[user]) {
            lockedUntilVoting[user] = newUnlockTime;
        }
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    function setVotingLock(uint256 /* newLock */) external onlyOwner {
        uint256 old = votingLock;
        uint256 value = parameters.stakingLockTime();
        votingLock = value;
        emit VotingLockUpdated(old, value);
    }

    function setProposingLock(uint256 /* newLock */) external onlyOwner {
        uint256 old = proposingLock;
        uint256 value = parameters.stakingLockTime();
        proposingLock = value;
        emit ProposingLockUpdated(old, value);
    }

    function setParameters(address newParameters) external onlyOwner {
        if (newParameters == address(0)) revert InvalidAddress();
        emit ParametersUpdated(address(parameters), newParameters);
        parameters = IParameters(newParameters);
    }
}
