// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./interfaces/IGovernanceToken.sol";
import "./interfaces/IStaking.sol";
import "./interfaces/IProposalManager.sol";
import "./interfaces/IStrategyManager.sol";
import "./interfaces/IParameters.sol";
import "./interfaces/IPanicManager.sol";

// Interfaz extendida para MockProposalManager (solo para tests)
interface IMockProposalManager is IProposalManager {
    function setCurrentVoter(address _voter) external;
    function setCurrentCreator(address _creator) external;
}

// Interfaz extendida para MockStaking (solo para tests)
interface IMockStaking is IStaking {
    function setCurrentUser(address _user) external;
}

contract DAO {
    error NotOwner();
    error InvalidAddress();
    error InsufficientETH();
    error ZeroPrice();
    error ZeroAmount();
    error EmptyString();
    error MinStakeNotMet();
    

    address public immutable owner;

    IGovernanceToken public token;
    IStaking public staking;
    IProposalManager public proposalManager;
    IStrategyManager public strategyManager;
    IParameters public parameters;
    IPanicManager public panicManager;

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier notInPanic() {
        panicManager.checkNotPanicked();
        _;
    }

    constructor(
        address _owner,
        address _token,
        address _staking,
        address _proposalManager,
        address _strategyManager,
        address _parameters,
        address _panicManager
    ) {
        if (
            _owner == address(0) ||
            _token == address(0) ||
            _staking == address(0) ||
            _proposalManager == address(0) ||
            _strategyManager == address(0) ||
            _parameters == address(0) ||
            _panicManager == address(0)
        ) revert InvalidAddress();

        owner = _owner;
        token = IGovernanceToken(_token);
        staking = IStaking(_staking);
        proposalManager = IProposalManager(_proposalManager);
        strategyManager = IStrategyManager(_strategyManager);
        parameters = IParameters(_parameters);
        panicManager = IPanicManager(_panicManager);
    }

    function buyTokens() external payable notInPanic {
        uint256 _price = parameters.tokenPrice();
        if (_price == 0) revert ZeroPrice();
        if (msg.value < _price) revert InsufficientETH();

        // Calculate amount: (msg.value * 10^18) / price
        // This ensures we get tokens with 18 decimals
        uint256 _amount = (msg.value * 1e18) / _price;
        if (_amount == 0) revert ZeroAmount();

        token.mint(msg.sender, _amount);
    }


    function createProposal(string calldata _title, string calldata _description)
        external
        notInPanic
        returns (uint256)
    {
        if (bytes(_title).length == 0 || bytes(_description).length == 0) revert EmptyString();

        // Try to set the creator for the mock (if it has the function)
        try IMockProposalManager(address(proposalManager)).setCurrentCreator(msg.sender) {} catch {}

        // Use proposing stake as the power required to create proposals
        uint256 proposingStake = staking.getProposingStake(msg.sender);
        uint256 minPropose = parameters.minStakeForProposing();
        if (proposingStake < minPropose) revert MinStakeNotMet();
        return proposalManager.createProposal(_title, _description, proposingStake);
    }

    function vote(uint256 _proposalId, bool _support)
        external
        notInPanic
    {
        uint256 minStake = parameters.minStakeForVoting();
        if (staking.getVotingStake(msg.sender) < minStake) revert MinStakeNotMet();
        IProposalManager.VoteType voteType = _support 
            ? IProposalManager.VoteType.FOR 
            : IProposalManager.VoteType.AGAINST;
        
        // Try to set the voter for the mock (if it has the function)
        try IMockProposalManager(address(proposalManager)).setCurrentVoter(msg.sender) {} catch {}
        
        proposalManager.vote(_proposalId, voteType);
    }

    function changeVote(uint256 _proposalId, bool _support)
        external
        notInPanic
    {
        IProposalManager.VoteType newVoteType = _support
            ? IProposalManager.VoteType.FOR
            : IProposalManager.VoteType.AGAINST;

        // Try to set the voter for the mock (if it has the function)
        try IMockProposalManager(address(proposalManager)).setCurrentVoter(msg.sender) {} catch {}

        proposalManager.changeVote(_proposalId, newVoteType);
    }

    function stakeForVoting(uint256 _amount) external notInPanic {
        if (_amount == 0) revert ZeroAmount();
        uint256 minStake = parameters.minStakeForVoting();
        if (_amount < minStake) revert MinStakeNotMet();
        
        // User must approve DAO to spend tokens
        // DAO transfers tokens from user to itself, then approves Staking to take them
        token.transferFrom(msg.sender, address(this), _amount);
        token.approve(address(staking), _amount);
        
        // Try to set the user for the mock (if it has the function)
        try IMockStaking(address(staking)).setCurrentUser(msg.sender) {} catch {}
        
        staking.stakeForVotingFrom(msg.sender, _amount);
    }

    function stakeForProposing(uint256 _amount) external notInPanic {
        if (_amount == 0) revert ZeroAmount();
        uint256 minStake = parameters.minStakeForProposing();
        if (_amount < minStake) revert MinStakeNotMet();
        
        // User must approve DAO to spend tokens
        // DAO transfers tokens from user to itself, then approves Staking to take them
        token.transferFrom(msg.sender, address(this), _amount);
        token.approve(address(staking), _amount);
        
        // Try to set the user for the mock (if it has the function)
        try IMockStaking(address(staking)).setCurrentUser(msg.sender) {} catch {}
        
        staking.stakeForProposingFrom(msg.sender, _amount);
    }

    function unstakeVoting() external notInPanic {
        // Try to set the user for the mock (if it has the function)
        try IMockStaking(address(staking)).setCurrentUser(msg.sender) {} catch {}
        
        uint256 userStake = staking.getVotingStake(msg.sender);
        staking.unstakeFromVoting(userStake);
    }

    function unstakeProposing() external notInPanic {
        // Try to set the user for the mock (if it has the function)
        try IMockStaking(address(staking)).setCurrentUser(msg.sender) {} catch {}
        
        uint256 userStake = staking.getProposingStake(msg.sender);
        staking.unstakeFromProposing(userStake);
    }

    function mintTokens(address _to, uint256 _amount) external onlyOwner notInPanic{
        if (_to == address(0)) revert InvalidAddress();
        if (_amount == 0) revert ZeroAmount();
        token.mint(_to, _amount);
    }

    function changeStrategy(address _newStrategy) external onlyOwner notInPanic{
        if (_newStrategy == address(0)) revert InvalidAddress();
        strategyManager.setActiveStrategy(_newStrategy);
    }

    /**
     * @notice Retira ETH acumulado por el contrato
     * @param to Dirección receptora
     * @param amount Monto en wei a retirar
     */
    function withdrawETH(address to, uint256 amount) external onlyOwner notInPanic {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert ZeroAmount();
        if (address(this).balance < amount) revert InsufficientETH();

        (bool ok, ) = payable(to).call{value: amount}("");
        require(ok, "ETH transfer failed");
    }

    // ===== Staking View Functions =====

    function getVotingStake(address user) external view returns (uint256) {
        return staking.getVotingStake(user);
    }

    function getProposingStake(address user) external view returns (uint256) {
        return staking.getProposingStake(user);
    }

    function getTotalVotingStaked() external view returns (uint256) {
        return staking.totalVotingStaked();
    }

    // ===== ProposalManager View Functions =====

    function getProposal(uint256 _proposalId) external view returns (IProposalManager.Proposal memory) {
        return proposalManager.getProposal(_proposalId);
    }

    function getProposalState(uint256 _proposalId) external view returns (IProposalManager.ProposalState) {
        return proposalManager.getProposalState(_proposalId);
    }

    function getProposalResults(uint256 _proposalId) external view returns (uint256 votesFor, uint256 votesAgainst) {
        return proposalManager.getProposalResults(_proposalId);
    }

    function getUserVote(uint256 _proposalId, address _voter) external view returns (IProposalManager.VoteType) {
        return proposalManager.getUserVote(_proposalId, _voter);
    }

    function isProposalActive(uint256 _proposalId) external view returns (bool) {
        return proposalManager.isProposalActive(_proposalId);
    }

    function hasUserVoted(uint256 _proposalId, address _voter) external view returns (bool) {
        return proposalManager.hasUserVoted(_proposalId, _voter);
    }

    function hasProposalDeadlinePassed(uint256 _proposalId) external view returns (bool) {
        return proposalManager.hasProposalDeadlinePassed(_proposalId);
    }

    // ===== ProposalManager State-Changing Functions =====

    function finalizeProposal(uint256 _proposalId) external notInPanic {
        // Obtener dirección de estrategia activa (compatible con mocks)
        address strategyAddr = strategyManager.getActiveStrategyAddress();
        uint256 totalVP = 0;
        if (strategyAddr != address(0)) {
            IVotingStrategy active = IVotingStrategy(strategyAddr);
            // Intentar leer poder de voto total vía interfaz extendida
            try active.getTotalVotingPower() returns (uint256 vp) {
                totalVP = vp;
            } catch {
                totalVP = 0; // fallback seguro si la estrategia no implementa
            }
        }
        proposalManager.finalizeProposal(_proposalId, totalVP);
    }

    function expireProposal(uint256 _proposalId) external notInPanic {
        proposalManager.expireProposal(_proposalId);
    }

    // ===== Parameters View Functions =====

    function getTokenPrice() external view returns (uint256) {
        return parameters.tokenPrice();
    }

    function getStakingLockTime() external view returns (uint256) {
        return parameters.stakingLockTime();
    }

    function getTokensPerVotingPower() external view returns (uint256) {
        return parameters.tokensPerVotingPower();
    }

    function getMinStakeForVoting() external view returns (uint256) {
        return parameters.minStakeForVoting();
    }

    function getMinStakeForProposing() external view returns (uint256) {
        return parameters.minStakeForProposing();
    }

    function getProposalDuration() external view returns (uint256) {
        return parameters.proposalDuration();
    }

    // ===== Token View Functions =====

    function getTokenBalance(address account) external view returns (uint256) {
        return token.balanceOf(account);
    }

    function getTokenAllowance(address _owner, address spender) external view returns (uint256) {
        return token.allowance(_owner, spender);
    }

    // ===== StrategyManager View Functions =====

    function getActiveStrategyAddress() external view returns (address) {
        return strategyManager.getActiveStrategyAddress();
    }

    // ===== PanicManager View Functions =====

    function isPanicked() external view returns (bool) {
        try panicManager.checkNotPanicked() {
            return false;
        } catch {
            return true;
        }
    }
}

