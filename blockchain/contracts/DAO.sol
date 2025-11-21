// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IGovernanceToken {
    function mint(address _to, uint256 _amount) external;
    function burn(address _from, uint256 _amount) external;
}

interface IStaking {
    function stakeForVoting(address _user, uint256 _amount) external;
    function stakeForProposing(address _user, uint256 _amount) external;
    function unstakeVoting(address _user) external;
    function unstakeProposing(address _user) external;
}

interface IProposalManager {
    function createProposal(address _creator, string calldata _title, string calldata _description) external returns (uint256);
    function vote(uint256 _proposalId, address _voter, bool _support) external;
}

interface IStrategyManager {
    function setStrategy(address _newStrategy) external;
    function getStrategy() external view returns (address);
}

interface IParameters {
    function tokenPrice() external view returns (uint256);
}

interface IPanicManager {
    function checkNotPanicked() external view;
}

contract DAO {
    error NotOwner();
    error InvalidAddress();
    error InsufficientETH();
    error ZeroPrice();
    error ZeroAmount();
    error EmptyString();

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

        uint256 _amount = msg.value / _price;
        if (_amount == 0) revert ZeroAmount();

        token.mint(msg.sender, _amount);
    }

    function createProposal(string calldata _title, string calldata _description)
        external
        notInPanic
        returns (uint256)
    {
        if (bytes(_title).length == 0 || bytes(_description).length == 0) revert EmptyString();

        return proposalManager.createProposal(msg.sender, _title, _description);
    }

    function vote(uint256 _proposalId, bool _support)
        external
        notInPanic
    {
        proposalManager.vote(_proposalId, msg.sender, _support);
    }

    function stakeForVoting(uint256 _amount) external notInPanic {
        if (_amount == 0) revert ZeroAmount();
        token.burn(msg.sender, _amount);
        staking.stakeForVoting(msg.sender, _amount);
    }

    function stakeForProposing(uint256 _amount) external notInPanic {
        if (_amount == 0) revert ZeroAmount();
        token.burn(msg.sender, _amount);
        staking.stakeForProposing(msg.sender, _amount);
    }

    function unstakeVoting() external notInPanic {
        staking.unstakeVoting(msg.sender);
    }

    function unstakeProposing() external notInPanic {
        staking.unstakeProposing(msg.sender);
    }

    function mintTokens(address _to, uint256 _amount) external onlyOwner notInPanic{
        if (_to == address(0)) revert InvalidAddress();
        if (_amount == 0) revert ZeroAmount();
        token.mint(_to, _amount);
    }

    function changeStrategy(address _newStrategy) external onlyOwner notInPanic{
        if (_newStrategy == address(0)) revert InvalidAddress();
        strategyManager.setStrategy(_newStrategy);
    }
}
