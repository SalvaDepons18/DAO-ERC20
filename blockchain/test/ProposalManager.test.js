const { expect } = require("chai");
const { ethers } = require("hardhat");

// Enums
const VoteType = {
  NONE: 0,
  FOR: 1,
  AGAINST: 2,
};

const ProposalState = {
  ACTIVE: 0,
  ACCEPTED: 1,
  REJECTED: 2,
  EXPIRED: 3,
};

describe("ProposalManager", function () {
  let ProposalManager, proposalManager;
  let votingStrategy;
  let owner, proposer, voter1, voter2, voter3;
  let dummyToken, dummyParams, staking;

  const PROPOSAL_DURATION = 86400; // 1 día
  const MIN_VOTING_POWER = 100;
  const TOTAL_VOTING_POWER = 10000;

  beforeEach(async () => {
    [owner, proposer, voter1, voter2, voter3] = await ethers.getSigners();

    // Deploy ShaCoin (token real ERC20)
    const DummyToken = await ethers.getContractFactory("ShaCoin");
    dummyToken = await DummyToken.deploy(owner.address);
    await dummyToken.waitForDeployment();

    const DummyParams = await ethers.getContractFactory("Parameters");
    dummyParams = await DummyParams.deploy(owner.address);
    await dummyParams.waitForDeployment();

    // Configurar tokensPerVotingPower = 1 token = 1 voto
    await dummyParams.setTokensPerVotingPower(ethers.parseEther("1"));

    // Deploy Staking
    const Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(dummyToken.target, dummyParams.target);
    await staking.waitForDeployment();

    // Deploy estrategia de votación simple para testing
    const SimpleMajority = await ethers.getContractFactory("SimpleMajorityStrategy");
    votingStrategy = await SimpleMajority.deploy(staking.target, dummyParams.target);
    await votingStrategy.waitForDeployment();

    // Deploy ProposalManager
    ProposalManager = await ethers.getContractFactory("ProposalManager");
    proposalManager = await ProposalManager.deploy(
      votingStrategy.target,
      MIN_VOTING_POWER,
      PROPOSAL_DURATION
    );
    await proposalManager.waitForDeployment();

    // Mint y stake tokens para los votantes
    // voter1 = 6000 tokens
    await dummyToken.mint(voter1.address, ethers.parseEther("6000"));
    await dummyToken.connect(voter1).approve(staking.target, ethers.parseEther("6000"));
    await staking.connect(voter1).stakeForVoting(ethers.parseEther("6000"));

    // voter2 = 3000 tokens
    await dummyToken.mint(voter2.address, ethers.parseEther("3000"));
    await dummyToken.connect(voter2).approve(staking.target, ethers.parseEther("3000"));
    await staking.connect(voter2).stakeForVoting(ethers.parseEther("3000"));

    // voter3 = 1000 tokens
    await dummyToken.mint(voter3.address, ethers.parseEther("1000"));
    await dummyToken.connect(voter3).approve(staking.target, ethers.parseEther("1000"));
    await staking.connect(voter3).stakeForVoting(ethers.parseEther("1000"));

    // proposer = MIN_VOTING_POWER tokens
    await dummyToken.mint(proposer.address, ethers.parseEther("100"));
  });

  // -------------------------------------------------------------------------
  // Constructor
  // -------------------------------------------------------------------------

  it("Debe setear correctamente los parámetros del constructor", async () => {
    expect(await proposalManager.votingStrategy()).to.equal(
      votingStrategy.target
    );
    expect(await proposalManager.minVotingPowerToPropose()).to.equal(
      MIN_VOTING_POWER
    );
    expect(await proposalManager.defaultProposalDuration()).to.equal(
      PROPOSAL_DURATION
    );
  });

  // -------------------------------------------------------------------------
  // Creación de Propuestas
  // -------------------------------------------------------------------------

  it("Debe crear una propuesta correctamente", async () => {
    const tx = await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description of test proposal",
      MIN_VOTING_POWER
    );

    const receipt = await tx.wait();
    expect(await proposalManager.proposalCount()).to.equal(1);

    const proposal = await proposalManager.getProposal(0);
    expect(proposal.title).to.equal("Test Proposal");
    expect(proposal.description).to.equal("Description of test proposal");
    expect(proposal.proposer).to.equal(proposer.address);
    expect(proposal.state).to.equal(ProposalState.ACTIVE);
    expect(proposal.votesFor).to.equal(0);
    expect(proposal.votesAgainst).to.equal(0);
  });

  it("Debe rechazar propuesta sin poder de voto suficiente", async () => {
    await expect(
      proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER - 1
      )
    ).to.be.revertedWithCustomError(proposalManager, "InsufficientVotingPower");
  });

  it("Debe rechazar propuesta con título vacío", async () => {
    await expect(
      proposalManager.connect(proposer).createProposal(proposer.address, "", "Description", MIN_VOTING_POWER)
    ).to.be.revertedWithCustomError(proposalManager, "EmptyTitle");
  });

  it("Debe rechazar propuesta sin descripción", async () => {
    await expect(
      proposalManager.connect(proposer).createProposal(proposer.address, "Title", "", MIN_VOTING_POWER)
    ).to.be.revertedWithCustomError(proposalManager, "EmptyDescription");
  });

  it("Emite evento ProposalCreated", async () => {
    await expect(
      proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      )
    )
      .to.emit(proposalManager, "ProposalCreated");
  });

  it("Debe usar proposalDuration de Parameters si está seteado", async () => {
    // Linkear Parameters al ProposalManager y setear duración corta
    await proposalManager.setParameters(dummyParams.target);
    await dummyParams.setProposalDuration(123);

    const tx = await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Deadline Param Test",
      "Desc",
      MIN_VOTING_POWER
    );
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    const proposal = await proposalManager.getProposal(0);
    expect(proposal.deadline).to.equal(block.timestamp + 123);
  });

  // -------------------------------------------------------------------------
  // Votación
  // -------------------------------------------------------------------------

  it("Un usuario puede votar en una propuesta activa", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await proposalManager
      .connect(voter1)
      .vote(voter1.address, 0, VoteType.FOR);

    const [votesFor, votesAgainst] = await proposalManager.getProposalResults(0);
    expect(votesFor).to.equal(6000);
    expect(votesAgainst).to.equal(0);
  });

  it("Emite evento VoteCasted", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await expect(
      proposalManager
        .connect(voter1)
        .vote(voter1.address, 0, VoteType.FOR)
    )
      .to.emit(proposalManager, "VoteCasted")
      .withArgs(0, voter1.address, VoteType.FOR, 6000);
  });

  // Test eliminado: El peso ahora se calcula internamente, no se puede pasar 0

  it("Debe rechazar voto de tipo NONE", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await expect(
      proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.NONE)
    ).to.be.revertedWithCustomError(proposalManager, "InvalidVoteType");
  });

  it("Debe evitar que una persona vote dos veces", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await proposalManager
      .connect(voter1)
      .vote(voter1.address, 0, VoteType.FOR);

    await expect(
      proposalManager
        .connect(voter1)
        .vote(voter1.address, 0, VoteType.AGAINST)
    ).to.be.revertedWithCustomError(proposalManager, "AlreadyVoted");
  });

  it("Debe permitir cambiar el voto antes del deadline (FOR → AGAINST)", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    // Primer voto: FOR
    await proposalManager
      .connect(voter1)
      .vote(voter1.address, 0, VoteType.FOR);

    // Cambiar a AGAINST
    await proposalManager
      .connect(voter1)
      .changeVote(voter1.address, 0, VoteType.AGAINST);

    const [votesFor, votesAgainst] = await proposalManager.getProposalResults(0);
    expect(votesFor).to.equal(0);
    expect(votesAgainst).to.equal(6000);
  });

  it("Debe permitir cambiar el voto antes del deadline (AGAINST → FOR)", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal 2",
      "Description 2",
      MIN_VOTING_POWER
    );

    // Primer voto: AGAINST
    await proposalManager
      .connect(voter1)
      .vote(voter1.address, 0, VoteType.AGAINST);

    const [votesBefore1, votesBefore2] = await proposalManager.getProposalResults(0);
    expect(votesBefore1).to.equal(0);
    expect(votesBefore2).to.equal(6000);

    // Cambiar a FOR
    await proposalManager
      .connect(voter1)
      .changeVote(voter1.address, 0, VoteType.FOR);

    const [votesFor, votesAgainst] = await proposalManager.getProposalResults(0);
    expect(votesFor).to.equal(6000);
    expect(votesAgainst).to.equal(0);
  });

  it("Snapshot: aumentar stake tras votar y changeVote no altera peso", async () => {
    // Crear propuesta
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Snapshot Test",
      "Desc",
      MIN_VOTING_POWER
    );

    // voter3 (1000 stake) vota FOR
    await proposalManager.connect(voter3).vote(voter3.address, 0, VoteType.FOR);
    let results = await proposalManager.getProposalResults(0);
    expect(results[0]).to.equal(1000);
    expect(results[1]).to.equal(0);

    // Aumentar stake de voter3 a 5000
    await dummyToken.mint(voter3.address, ethers.parseEther("4000"));
    await dummyToken.connect(voter3).approve(staking.target, ethers.parseEther("4000"));
    await staking.connect(voter3).stakeForVoting(ethers.parseEther("4000"));

    // Cambiar voto a AGAINST
    await proposalManager.connect(voter3).changeVote(voter3.address, 0, VoteType.AGAINST);
    results = await proposalManager.getProposalResults(0);
    // Debe haber restado 1000 y sumado 1000 (no 5000)
    expect(results[0]).to.equal(0);
    expect(results[1]).to.equal(1000);
  });

  it("Debe rechazar voto después del deadline", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    // Avanzar tiempo más allá del deadline
    await ethers.provider.send("evm_increaseTime", [PROPOSAL_DURATION + 1]);
    await ethers.provider.send("evm_mine");

    await expect(
      proposalManager
        .connect(voter1)
        .vote(voter1.address, 0, VoteType.FOR)
    ).to.be.revertedWithCustomError(proposalManager, "ProposalDeadlinePassed");
  });

  it("Debe rechazar voto en propuesta no activa", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    // Finalizar la propuesta
    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    await expect(
      proposalManager
        .connect(voter1)
        .vote(voter1.address, 0, VoteType.FOR)
    ).to.be.revertedWithCustomError(proposalManager, "ProposalNotActive");
  });

  // -------------------------------------------------------------------------
  // Finalización de Propuestas
  // -------------------------------------------------------------------------

  it("Debe finalizar propuesta como ACCEPTED con mayoría de votos FOR", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    // Votos a favor
    await proposalManager
      .connect(voter1)
      .vote(voter1.address, 0, VoteType.FOR);
    await proposalManager
      .connect(voter2)
      .vote(voter2.address, 0, VoteType.FOR);

    // Votos en contra
    await proposalManager
      .connect(voter3)
      .vote(voter3.address, 0, VoteType.AGAINST);

    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    const proposal = await proposalManager.getProposal(0);
    expect(proposal.state).to.equal(ProposalState.ACCEPTED);
  });

  it("Debe finalizar propuesta como REJECTED sin mayoría de votos FOR", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    // voter2 vota a favor (3000)
    await proposalManager
      .connect(voter2)
      .vote(voter2.address, 0, VoteType.FOR);

    // voter1 y voter3 votan en contra (6000 + 1000 = 7000)
    await proposalManager
      .connect(voter1)
      .vote(voter1.address, 0, VoteType.AGAINST);
    await proposalManager
      .connect(voter3)
      .vote(voter3.address, 0, VoteType.AGAINST);

    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    const proposal = await proposalManager.getProposal(0);
    expect(proposal.state).to.equal(ProposalState.REJECTED);
  });

  it("Debe expirar propuesta automáticamente si está vencida", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    // Avanzar tiempo más allá del deadline
    await ethers.provider.send("evm_increaseTime", [PROPOSAL_DURATION + 1]);
    await ethers.provider.send("evm_mine");

    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    const proposal = await proposalManager.getProposal(0);
    expect(proposal.state).to.equal(ProposalState.EXPIRED);
  });

  it("Debe permitir expirar manualmente una propuesta vencida", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    // Avanzar tiempo más allá del deadline
    await ethers.provider.send("evm_increaseTime", [PROPOSAL_DURATION + 1]);
    await ethers.provider.send("evm_mine");

    await proposalManager.expireProposal(0);

    const proposal = await proposalManager.getProposal(0);
    expect(proposal.state).to.equal(ProposalState.EXPIRED);
  });

  it("Emite evento ProposalStateChanged", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await proposalManager
      .connect(voter1)
      .vote(voter1.address, 0, VoteType.FOR);

    await expect(proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER))
      .to.emit(proposalManager, "ProposalStateChanged")
      .withArgs(0, ProposalState.ACTIVE, ProposalState.ACCEPTED);
  });

  // -------------------------------------------------------------------------
  // Consultas
  // -------------------------------------------------------------------------

  it("hasUserVoted debe retornar true si el usuario votó", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await proposalManager
      .connect(voter1)
      .vote(voter1.address, 0, VoteType.FOR);

    expect(await proposalManager.hasUserVoted(0, voter1.address)).to.be.true;
    expect(await proposalManager.hasUserVoted(0, voter2.address)).to.be.false;
  });

  it("getUserVote debe retornar el voto del usuario", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await proposalManager
      .connect(voter1)
      .vote(voter1.address, 0, VoteType.FOR);

    expect(await proposalManager.getUserVote(0, voter1.address)).to.equal(
      VoteType.FOR
    );
  });

  it("isProposalActive debe retornar true para propuestas activas", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    expect(await proposalManager.isProposalActive(0)).to.be.true;

    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    expect(await proposalManager.isProposalActive(0)).to.be.false;
  });

  it("getProposalState debe retornar el estado actual", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    expect(await proposalManager.getProposalState(0)).to.equal(
      ProposalState.ACTIVE
    );

    await proposalManager
      .connect(voter1)
      .vote(voter1.address, 0, VoteType.FOR);

    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    expect(await proposalManager.getProposalState(0)).to.equal(
      ProposalState.ACCEPTED
    );
  });

  it("hasProposalDeadlinePassed debe retornar true después del deadline", async () => {
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    expect(await proposalManager.hasProposalDeadlinePassed(0)).to.be.false;

    await ethers.provider.send("evm_increaseTime", [PROPOSAL_DURATION + 1]);
    await ethers.provider.send("evm_mine");

    expect(await proposalManager.hasProposalDeadlinePassed(0)).to.be.true;
  });

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  it("Debe actualizar la estrategia de votación", async () => {
    // Deploy una nueva estrategia
    const NewStrategy = await ethers.getContractFactory("SimpleMajorityStrategy");
    const newStrategy = await NewStrategy.deploy(dummyToken.target, dummyParams.target);
    await newStrategy.waitForDeployment();

    await proposalManager.setVotingStrategy(newStrategy.target);

    expect(await proposalManager.votingStrategy()).to.equal(
      newStrategy.target
    );
  });

  it("Solo owner puede actualizar la estrategia", async () => {
    const NewStrategy = await ethers.getContractFactory("SimpleMajorityStrategy");
    const newStrategy = await NewStrategy.deploy(dummyToken.target, dummyParams.target);
    await newStrategy.waitForDeployment();

    await expect(
      proposalManager
        .connect(voter1)
        .setVotingStrategy(newStrategy.target)
    ).to.be.reverted;
  });

  it("Debe actualizar minVotingPowerToPropose", async () => {
    const newMinPower = 500;

    await proposalManager.setMinVotingPowerToPropose(newMinPower);

    expect(await proposalManager.minVotingPowerToPropose()).to.equal(
      newMinPower
    );
  });

  it("Debe actualizar defaultProposalDuration", async () => {
    const newDuration = 172800; // 2 días

    await proposalManager.setDefaultProposalDuration(newDuration);

    expect(await proposalManager.defaultProposalDuration()).to.equal(
      newDuration
    );
  });

  it("Debe rechazar duración de propuesta con valor 0", async () => {
    await expect(
      proposalManager.setDefaultProposalDuration(0)
    ).to.be.revertedWithCustomError(proposalManager, "InvalidDuration");
  });

  // -------------------------------------------------------------------------
  // StrategyManager Integration (Nueva funcionalidad)
  // -------------------------------------------------------------------------

  it("Debe permitir enlazar un StrategyManager", async () => {
    // Deploy un StrategyManager real
    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    const strategyManager = await StrategyManager.deploy(votingStrategy.target);
    await strategyManager.waitForDeployment();

    await expect(proposalManager.linkStrategyManager(strategyManager.target))
      .to.emit(proposalManager, "StrategyManagerLinked")
      .withArgs(ethers.ZeroAddress, strategyManager.target);
  });

  it("Debe rechazar enlazar StrategyManager con dirección cero", async () => {
    await expect(
      proposalManager.linkStrategyManager(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(proposalManager, "InvalidVotingStrategy");
  });

  it("Solo owner puede enlazar StrategyManager", async () => {
    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    const strategyManager = await StrategyManager.deploy(votingStrategy.target);
    await strategyManager.waitForDeployment();

    await expect(
      proposalManager.connect(voter1).linkStrategyManager(strategyManager.target)
    ).to.be.reverted;
  });

  it("getActiveVotingStrategyAddress debe retornar votingStrategy si no hay manager", async () => {
    const activeAddress = await proposalManager.getActiveVotingStrategyAddress();
    expect(activeAddress).to.equal(votingStrategy.target);
  });

  it("getActiveVotingStrategyAddress debe retornar estrategia de StrategyManager si está enlazado", async () => {
    // Deploy estrategia alternativa
    const AltStrategy = await ethers.getContractFactory("SimpleMajorityStrategy");
    const altStrategy = await AltStrategy.deploy(dummyToken.target, dummyParams.target);
    await altStrategy.waitForDeployment();

    // Deploy StrategyManager con estrategia alternativa
    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    const strategyManager = await StrategyManager.deploy(altStrategy.target);
    await strategyManager.waitForDeployment();

    // Enlazar
    await proposalManager.linkStrategyManager(strategyManager.target);

    const activeAddress = await proposalManager.getActiveVotingStrategyAddress();
    expect(activeAddress).to.equal(altStrategy.target);
  });

  it("Debe usar estrategia dinámica del StrategyManager al finalizar propuesta", async () => {
    // Deploy estrategia alternativa que rechaza todo (votesFor debe ser > votesAgainst * 10)
    const RejectingStrategy = await ethers.getContractFactory("SimpleMajorityStrategy");
    const rejectingStrategy = await RejectingStrategy.deploy(dummyToken.target, dummyParams.target);
    await rejectingStrategy.waitForDeployment();

    // Deploy StrategyManager con estrategia original (acepta si votesFor > votesAgainst)
    const StrategyManager = await ethers.getContractFactory("StrategyManager");
    const strategyManager = await StrategyManager.deploy(votingStrategy.target);
    await strategyManager.waitForDeployment();

    // Enlazar StrategyManager
    await proposalManager.linkStrategyManager(strategyManager.target);

    // Crear propuesta
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Dynamic Strategy Test",
      "Testing strategy change",
      MIN_VOTING_POWER
    );

    // Votar con mayoría a favor
    await proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.FOR);
    await proposalManager.connect(voter2).vote(voter2.address, 0, VoteType.AGAINST);

    // Cambiar estrategia a una más restrictiva (aunque con SimpleMajority no cambia lógica real,
    // pero verificamos que usa la del manager)
    await strategyManager.setActiveStrategy(rejectingStrategy.target);

    // Finalizar - debe usar la estrategia del manager
    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    const proposal = await proposalManager.getProposal(0);
    // Con SimpleMajorityStrategy, 6000 > 3000 => ACCEPTED
    expect(proposal.state).to.equal(ProposalState.ACCEPTED);
    // Verificar que usó la estrategia del manager (rejectingStrategy)
    expect(proposal.strategyUsed).to.equal(rejectingStrategy.target);
  });

  it("Debe seguir usando votingStrategy si no hay StrategyManager enlazado", async () => {
    // Crear propuesta sin enlazar StrategyManager
    await proposalManager.connect(proposer).createProposal(
      proposer.address,
      "Fallback Strategy Test",
      "Testing fallback to votingStrategy",
      MIN_VOTING_POWER
    );

    await proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.FOR);

    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    const proposal = await proposalManager.getProposal(0);
    expect(proposal.state).to.equal(ProposalState.ACCEPTED);
    // Debe haber usado la estrategia original (votingStrategy)
    expect(proposal.strategyUsed).to.equal(votingStrategy.target);
  });

  // -------------------------------------------------------------------------
  // Branch Coverage - Additional Tests
  // -------------------------------------------------------------------------
  describe("Branch Coverage - Additional Tests", () => {
    it("Debe revertir createProposal si título está vacío", async () => {
      await expect(
        proposalManager.connect(proposer).createProposal(
          proposer.address,
          "",
          "Description",
          MIN_VOTING_POWER
        )
      ).to.be.revertedWithCustomError(proposalManager, "EmptyTitle");
    });

    it("Debe revertir createProposal si descripción está vacía", async () => {
      await expect(
        proposalManager.connect(proposer).createProposal(
          proposer.address,
          "Title",
          "",
          MIN_VOTING_POWER
        )
      ).to.be.revertedWithCustomError(proposalManager, "EmptyDescription");
    });

    it("Debe revertir createProposal si votingPower insuficiente", async () => {
      await expect(
        proposalManager.connect(proposer).createProposal(
          proposer.address,
          "Title",
          "Description",
          MIN_VOTING_POWER - 1
        )
      ).to.be.revertedWithCustomError(proposalManager, "InsufficientVotingPower");
    });

    it("Debe revertir si propuesta duplicada", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Duplicate Test",
        "Same description",
        MIN_VOTING_POWER
      );

      await expect(
        proposalManager.connect(proposer).createProposal(
          proposer.address,
          "Duplicate Test",
          "Same description",
          MIN_VOTING_POWER
        )
      ).to.be.revertedWithCustomError(proposalManager, "DuplicateProposal");
    });

    it("Debe usar proposalDuration de parametersContract cuando != 0", async () => {
      const customDuration = 7200; // 2 horas
      await dummyParams.setProposalDuration(customDuration);

      // Conectar parametersContract
      await proposalManager.setParameters(dummyParams.target);

      const tx = await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Custom Duration Test",
        "Testing custom duration",
        MIN_VOTING_POWER
      );
      const block = await ethers.provider.getBlock(tx.blockNumber);

      const proposal = await proposalManager.getProposal(0);
      expect(proposal.deadline).to.equal(block.timestamp + customDuration);
    });

    it("Debe usar defaultProposalDuration cuando parametersContract.proposalDuration == 0", async () => {
      await dummyParams.setProposalDuration(0); // Asegurar que sea 0

      // Conectar parametersContract
      await proposalManager.setParameters(dummyParams.target);

      const tx = await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Default Duration Test",
        "Testing default duration",
        MIN_VOTING_POWER
      );
      const block = await ethers.provider.getBlock(tx.blockNumber);

      const proposal = await proposalManager.getProposal(0);
      expect(proposal.deadline).to.equal(block.timestamp + PROPOSAL_DURATION);
    });

    it("Debe revertir vote si propuesta no existe", async () => {
      await expect(
        proposalManager.connect(voter1).vote(voter1.address, 999, VoteType.FOR)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotFound");
    });

    it("Debe revertir vote si propuesta no está activa", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      // Finalizar propuesta
      await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

      await expect(
        proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.FOR)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotActive");
    });

    it("Debe revertir vote si deadline pasó", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await ethers.provider.send("evm_increaseTime", [PROPOSAL_DURATION + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.FOR)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalDeadlinePassed");
    });

    it("Debe revertir vote si voteType es NONE", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await expect(
        proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.NONE)
      ).to.be.revertedWithCustomError(proposalManager, "InvalidVoteType");
    });

    it("Debe revertir vote si ya votó", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.FOR);

      await expect(
        proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.AGAINST)
      ).to.be.revertedWithCustomError(proposalManager, "AlreadyVoted");
    });

    it("Debe revertir changeVote si propuesta no existe", async () => {
      await expect(
        proposalManager.connect(voter1).changeVote(voter1.address, 999, VoteType.FOR)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotFound");
    });

    it("Debe revertir changeVote si propuesta no está activa", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.FOR);
      await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

      await expect(
        proposalManager.connect(voter1).changeVote(voter1.address, 0, VoteType.AGAINST)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotActive");
    });

    it("Debe revertir changeVote si deadline pasó", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.FOR);

      await ethers.provider.send("evm_increaseTime", [PROPOSAL_DURATION + 1]);
      await ethers.provider.send("evm_mine");

      await expect(
        proposalManager.connect(voter1).changeVote(voter1.address, 0, VoteType.AGAINST)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalDeadlinePassed");
    });

    it("Debe revertir changeVote si newVoteType es NONE", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.FOR);

      await expect(
        proposalManager.connect(voter1).changeVote(voter1.address, 0, VoteType.NONE)
      ).to.be.revertedWithCustomError(proposalManager, "InvalidVoteType");
    });

    it("Debe revertir changeVote si no ha votado aún", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await expect(
        proposalManager.connect(voter1).changeVote(voter1.address, 0, VoteType.FOR)
      ).to.be.revertedWithCustomError(proposalManager, "NotVotedYet");
    });

    it("changeVote de FOR a AGAINST debe actualizar correctamente", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.FOR);

      let proposal = await proposalManager.getProposal(0);
      expect(proposal.votesFor).to.equal(6000);
      expect(proposal.votesAgainst).to.equal(0);

      await proposalManager.connect(voter1).changeVote(voter1.address, 0, VoteType.AGAINST);

      proposal = await proposalManager.getProposal(0);
      expect(proposal.votesFor).to.equal(0);
      expect(proposal.votesAgainst).to.equal(6000);
    });

    it("changeVote de AGAINST a FOR debe actualizar correctamente", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.AGAINST);

      let proposal = await proposalManager.getProposal(0);
      expect(proposal.votesFor).to.equal(0);
      expect(proposal.votesAgainst).to.equal(6000);

      await proposalManager.connect(voter1).changeVote(voter1.address, 0, VoteType.FOR);

      proposal = await proposalManager.getProposal(0);
      expect(proposal.votesFor).to.equal(6000);
      expect(proposal.votesAgainst).to.equal(0);
    });

    it("Debe revertir finalizeProposal si propuesta no existe", async () => {
      await expect(
        proposalManager.finalizeProposal(999, TOTAL_VOTING_POWER)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotFound");
    });

    it("Debe revertir finalizeProposal si propuesta no está activa", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

      await expect(
        proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotActive");
    });

    it("Debe revertir expireProposal si propuesta no existe", async () => {
      await expect(
        proposalManager.expireProposal(999)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotFound");
    });

    it("Debe revertir expireProposal si propuesta no está activa", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

      await expect(
        proposalManager.expireProposal(0)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotActive");
    });

    it("Debe revertir expireProposal si deadline no ha pasado", async () => {
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      );

      await expect(
        proposalManager.expireProposal(0)
      ).to.be.revertedWithCustomError(proposalManager, "DeadlineNotPassed");
    });

    it("Debe revertir getProposal si propuesta no existe", async () => {
      await expect(
        proposalManager.getProposal(999)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotFound");
    });

    it("Debe revertir getProposalResults si propuesta no existe", async () => {
      await expect(
        proposalManager.getProposalResults(999)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotFound");
    });

    it("Debe revertir getProposalState si propuesta no existe", async () => {
      await expect(
        proposalManager.getProposalState(999)
      ).to.be.revertedWithCustomError(proposalManager, "ProposalNotFound");
    });

    it("Debe revertir setVotingStrategy con address(0)", async () => {
      await expect(
        proposalManager.setVotingStrategy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(proposalManager, "InvalidVotingStrategy");
    });

    it("Debe revertir setMinVotingPowerToPropose si no es owner", async () => {
      await expect(
        proposalManager.connect(voter1).setMinVotingPowerToPropose(500)
      ).to.be.reverted;
    });

    it("Debe revertir setDefaultProposalDuration si no es owner", async () => {
      await expect(
        proposalManager.connect(voter1).setDefaultProposalDuration(3600)
      ).to.be.reverted;
    });

    it("Constructor debe revertir si votingStrategy es address(0)", async () => {
      const ProposalManager = await ethers.getContractFactory("ProposalManager");
      await expect(
        ProposalManager.deploy(ethers.ZeroAddress, 100, 3600)
      ).to.be.revertedWithCustomError(ProposalManager, "InvalidVotingStrategy");
    });

    it("Constructor debe revertir si defaultProposalDuration es 0", async () => {
      const ProposalManager = await ethers.getContractFactory("ProposalManager");
      await expect(
        ProposalManager.deploy(votingStrategy.target, 100, 0)
      ).to.be.revertedWithCustomError(ProposalManager, "InvalidDuration");
    });

    it("Debe usar estrategia del StrategyManager en vote si está enlazado", async () => {
      // Deploy StrategyManager
      const StrategyManager = await ethers.getContractFactory("StrategyManager");
      const strategyManager = await StrategyManager.deploy(votingStrategy.target);
      await strategyManager.waitForDeployment();

      // Enlazar
      await proposalManager.linkStrategyManager(strategyManager.target);

      // Crear propuesta
      await proposalManager.connect(proposer).createProposal(
        proposer.address,
        "StrategyManager Vote Test",
        "Description",
        MIN_VOTING_POWER
      );

      // Votar - debe usar la estrategia del strategyManager
      await proposalManager.connect(voter1).vote(voter1.address, 0, VoteType.FOR);

      expect(await proposalManager.hasUserVoted(0, voter1.address)).to.be.true;
    });
  });
});
