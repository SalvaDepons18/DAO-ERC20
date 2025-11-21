// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Interface de Estrategia de Votación
 * @dev Define la interfaz para evaluar si una propuesta fue aceptada
 */
interface IVotingStrategy {
    function isProposalAccepted(
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 totalVotingPower
    ) external view returns (bool);
}

/**
 * @title Tipos de Voto
 */
enum VoteType {
    NONE,
    FOR,
    AGAINST
}

/**
 * @title Estados de Propuesta
 */
enum ProposalState {
    ACTIVE,
    ACCEPTED,
    REJECTED,
    EXPIRED
}

/**
 * @title Estructura de Propuesta
 */
struct Proposal {
    string title;
    string description;
    address proposer;
    uint256 createdAt;
    uint256 deadline;
    uint256 votesFor;
    uint256 votesAgainst;
    ProposalState state;
    address strategyUsed;
}

/**
 * @title ProposalManager
 * @dev Gestiona la vida completa de las propuestas: creación, votación, conteo y cambio de estado
 * No contiene lógica de estrategia ni cálculo de poder de voto
 */
contract ProposalManager is ReentrancyGuard, Ownable {

    IVotingStrategy public votingStrategy;
    
    // Propuestas mapeadas por ID
    mapping(uint256 => Proposal) public proposals;
    
    // Votantes de cada propuesta: proposalId => voter => voteType
    mapping(uint256 => mapping(address => VoteType)) public votes;
    
    // Total de propuestas
    uint256 public proposalCount;

    // Mínimo de poder de voto para crear propuesta
    uint256 public minVotingPowerToPropose;

    // Duración por defecto de las propuestas (en segundos)
    uint256 public defaultProposalDuration;

    // Eventos
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        string title,
        uint256 deadline
    );

    event VoteCasted(
        uint256 indexed proposalId,
        address indexed voter,
        VoteType voteType,
        uint256 weight
    );

    event ProposalStateChanged(
        uint256 indexed proposalId,
        ProposalState oldState,
        ProposalState newState
    );

    event VotingStrategyUpdated(address oldAddress, address newAddress);

    // Errores
    error ProposalNotFound();
    error ProposalNotActive();
    error ProposalDeadlinePassed();
    error AlreadyVoted();
    error InvalidVoteType();
    error InvalidAddress();
    error InsufficientVotingPower();
    error InvalidVotingStrategy();
    error InvalidDuration();
    error EmptyTitle();
    error EmptyDescription();
    error NotVotedYet();
    error DeadlineNotPassed();

    constructor(
        address _votingStrategy,
        uint256 _minVotingPowerToPropose,
        uint256 _defaultProposalDuration
    ) Ownable(msg.sender) {
        if (_votingStrategy == address(0)) revert InvalidVotingStrategy();
        if (_defaultProposalDuration == 0) revert InvalidDuration();

        votingStrategy = IVotingStrategy(_votingStrategy);
        minVotingPowerToPropose = _minVotingPowerToPropose;
        defaultProposalDuration = _defaultProposalDuration;
    }

    // -------------------------------------------------------------------------
    // Creación de Propuestas
    // -------------------------------------------------------------------------

    /**
     * @dev Crea una nueva propuesta
     * @param _title Título de la propuesta
     * @param _description Descripción de la propuesta
     * @param _votingPower Poder de voto del proponente (validado externamente)
     * @return proposalId ID de la nueva propuesta
     */
    function createProposal(
        string calldata _title,
        string calldata _description,
        uint256 _votingPower
    ) external nonReentrant returns (uint256) {
        if (bytes(_title).length == 0) revert EmptyTitle();
        if (bytes(_description).length == 0) revert EmptyDescription();
        if (_votingPower < minVotingPowerToPropose) revert InsufficientVotingPower();

        uint256 proposalId = proposalCount++;
        uint256 deadline = block.timestamp + defaultProposalDuration;

        proposals[proposalId] = Proposal({
            title: _title,
            description: _description,
            proposer: msg.sender,
            createdAt: block.timestamp,
            deadline: deadline,
            votesFor: 0,
            votesAgainst: 0,
            state: ProposalState.ACTIVE,
            strategyUsed: address(0)
        });

        emit ProposalCreated(proposalId, msg.sender, _title, deadline);
        return proposalId;
    }

    // -------------------------------------------------------------------------
    // Votación
    // -------------------------------------------------------------------------

    /**
     * @dev Emite un voto en una propuesta
     * @param _proposalId ID de la propuesta
     * @param _voteType Tipo de voto (FOR o AGAINST)
     * @param _votingWeight Peso del voto (poder de voto del votante)
     */
    function vote(
        uint256 _proposalId,
        VoteType _voteType,
        uint256 _votingWeight
    ) external nonReentrant {
        if (_votingWeight == 0) revert InvalidVoteType();
        
        Proposal storage proposal = proposals[_proposalId];
        
        // Validaciones
        if (proposal.createdAt == 0) revert ProposalNotFound();
        if (proposal.state != ProposalState.ACTIVE) revert ProposalNotActive();
        if (block.timestamp > proposal.deadline) revert ProposalDeadlinePassed();
        if (_voteType == VoteType.NONE) revert InvalidVoteType();
        if (votes[_proposalId][msg.sender] != VoteType.NONE) revert AlreadyVoted();

        // Registrar voto
        votes[_proposalId][msg.sender] = _voteType;

        // Contar votos
        if (_voteType == VoteType.FOR) {
            proposal.votesFor += _votingWeight;
        } else if (_voteType == VoteType.AGAINST) {
            proposal.votesAgainst += _votingWeight;
        }

        emit VoteCasted(_proposalId, msg.sender, _voteType, _votingWeight);
    }

    /**
     * @dev Permite cambiar el voto de un usuario (si aún está en fase ACTIVE)
     * @param _proposalId ID de la propuesta
     * @param _newVoteType Nuevo tipo de voto
     * @param _votingWeight Peso del voto del votante
     */
    function changeVote(
        uint256 _proposalId,
        VoteType _newVoteType,
        uint256 _votingWeight
    ) external nonReentrant {
        if (_votingWeight == 0) revert InvalidVoteType();
        
        Proposal storage proposal = proposals[_proposalId];
        
        // Validaciones
        if (proposal.createdAt == 0) revert ProposalNotFound();
        if (proposal.state != ProposalState.ACTIVE) revert ProposalNotActive();
        if (block.timestamp > proposal.deadline) revert ProposalDeadlinePassed();
        if (_newVoteType == VoteType.NONE) revert InvalidVoteType();

        VoteType currentVote = votes[_proposalId][msg.sender];
        if (currentVote == VoteType.NONE) revert NotVotedYet();

        // Restar voto anterior
        if (currentVote == VoteType.FOR) {
            proposal.votesFor -= _votingWeight;
        } else if (currentVote == VoteType.AGAINST) {
            proposal.votesAgainst -= _votingWeight;
        }

        // Sumar nuevo voto
        votes[_proposalId][msg.sender] = _newVoteType;
        if (_newVoteType == VoteType.FOR) {
            proposal.votesFor += _votingWeight;
        } else if (_newVoteType == VoteType.AGAINST) {
            proposal.votesAgainst += _votingWeight;
        }

        emit VoteCasted(_proposalId, msg.sender, _newVoteType, _votingWeight);
    }

    // -------------------------------------------------------------------------
    // Finalización de Propuestas
    // -------------------------------------------------------------------------

    /**
     * @dev Finaliza una propuesta evaluando su resultado
     * Llama a la estrategia de votación activa para determinar si fue aceptada
     * @param _proposalId ID de la propuesta
     * @param _totalVotingPower Poder de voto total en el sistema
     */
    function finalizeProposal(
        uint256 _proposalId,
        uint256 _totalVotingPower
    ) external nonReentrant {
        Proposal storage proposal = proposals[_proposalId];

        // Validaciones
        if (proposal.createdAt == 0) revert ProposalNotFound();
        if (proposal.state != ProposalState.ACTIVE) revert ProposalNotActive();

        // Verificar si ha vencido
        if (block.timestamp > proposal.deadline) {
            proposal.state = ProposalState.EXPIRED;
            emit ProposalStateChanged(_proposalId, ProposalState.ACTIVE, ProposalState.EXPIRED);
            return;
        }

        // Evaluar resultado usando la estrategia
        bool accepted = votingStrategy.isProposalAccepted(
            proposal.votesFor,
            proposal.votesAgainst,
            _totalVotingPower
        );

        ProposalState newState = accepted ? ProposalState.ACCEPTED : ProposalState.REJECTED;
        proposal.state = newState;
        proposal.strategyUsed = address(votingStrategy);

        emit ProposalStateChanged(_proposalId, ProposalState.ACTIVE, newState);
    }

    /**
     * @dev Expira manualmente una propuesta que haya pasado su deadline
     * @param _proposalId ID de la propuesta
     */
    function expireProposal(uint256 _proposalId) external {
        Proposal storage proposal = proposals[_proposalId];

        if (proposal.createdAt == 0) revert ProposalNotFound();
        if (proposal.state != ProposalState.ACTIVE) revert ProposalNotActive();
        if (block.timestamp <= proposal.deadline) revert DeadlineNotPassed();

        proposal.state = ProposalState.EXPIRED;
        emit ProposalStateChanged(_proposalId, ProposalState.ACTIVE, ProposalState.EXPIRED);
    }

    // -------------------------------------------------------------------------
    // Consultas
    // -------------------------------------------------------------------------

    /**
     * @dev Obtiene los detalles de una propuesta
     * @param _proposalId ID de la propuesta
     * @return proposal Estructura con los datos de la propuesta
     */
    function getProposal(uint256 _proposalId) external view returns (Proposal memory) {
        if (proposals[_proposalId].createdAt == 0) revert ProposalNotFound();
        return proposals[_proposalId];
    }

    /**
     * @dev Obtiene el voto de un usuario en una propuesta
     * @param _proposalId ID de la propuesta
     * @param _voter Dirección del votante
     * @return voteType Tipo de voto (NONE, FOR, AGAINST)
     */
    function getUserVote(uint256 _proposalId, address _voter) external view returns (VoteType) {
        return votes[_proposalId][_voter];
    }

    /**
     * @dev Verifica si una propuesta está activa
     * @param _proposalId ID de la propuesta
     * @return isActive True si la propuesta está activa
     */
    function isProposalActive(uint256 _proposalId) external view returns (bool) {
        return proposals[_proposalId].state == ProposalState.ACTIVE;
    }

    /**
     * @dev Verifica si un usuario ya votó en una propuesta
     * @param _proposalId ID de la propuesta
     * @param _voter Dirección del votante
     * @return hasVoted True si ya votó
     */
    function hasUserVoted(uint256 _proposalId, address _voter) external view returns (bool) {
        return votes[_proposalId][_voter] != VoteType.NONE;
    }

    /**
     * @dev Obtiene el resultado actual de una propuesta
     * @param _proposalId ID de la propuesta
     * @return votesFor Votos a favor
     * @return votesAgainst Votos en contra
     */
    function getProposalResults(uint256 _proposalId)
        external
        view
        returns (uint256 votesFor, uint256 votesAgainst)
    {
        if (proposals[_proposalId].createdAt == 0) revert ProposalNotFound();
        Proposal storage proposal = proposals[_proposalId];
        return (proposal.votesFor, proposal.votesAgainst);
    }

    /**
     * @dev Obtiene el estado de una propuesta
     * @param _proposalId ID de la propuesta
     * @return state Estado actual de la propuesta
     */
    function getProposalState(uint256 _proposalId) external view returns (ProposalState) {
        if (proposals[_proposalId].createdAt == 0) revert ProposalNotFound();
        return proposals[_proposalId].state;
    }

    /**
     * @dev Verifica si el deadline de una propuesta ha pasado
     * @param _proposalId ID de la propuesta
     * @return hasExpired True si ha pasado el deadline
     */
    function hasProposalDeadlinePassed(uint256 _proposalId) external view returns (bool) {
        if (proposals[_proposalId].createdAt == 0) revert ProposalNotFound();
        return block.timestamp > proposals[_proposalId].deadline;
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    /**
     * @dev Actualiza la estrategia de votación
     * @param _newVotingStrategy Dirección de la nueva estrategia
     */
    function setVotingStrategy(address _newVotingStrategy) external onlyOwner {
        if (_newVotingStrategy == address(0)) revert InvalidVotingStrategy();
        emit VotingStrategyUpdated(address(votingStrategy), _newVotingStrategy);
        votingStrategy = IVotingStrategy(_newVotingStrategy);
    }

    /**
     * @dev Actualiza el poder de voto mínimo para crear propuestas
     * @param _newMinVotingPower Nuevo mínimo
     */
    function setMinVotingPowerToPropose(uint256 _newMinVotingPower) external onlyOwner {
        minVotingPowerToPropose = _newMinVotingPower;
    }

    /**
     * @dev Actualiza la duración por defecto de las propuestas
     * @param _newDuration Nueva duración en segundos
     */
    function setDefaultProposalDuration(uint256 _newDuration) external onlyOwner {
        if (_newDuration == 0) revert InvalidDuration();
        defaultProposalDuration = _newDuration;
    }
}
