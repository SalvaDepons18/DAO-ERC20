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
  let dummyToken, dummyParams;

  const PROPOSAL_DURATION = 86400; // 1 día
  const MIN_VOTING_POWER = 100;
  const TOTAL_VOTING_POWER = 10000;

  beforeEach(async () => {
    [owner, proposer, voter1, voter2, voter3] = await ethers.getSigners();

    // Deploy contratos dummy para los argumentos requeridos
    const DummyToken = await ethers.getContractFactory("ShaCoin");
    dummyToken = await DummyToken.deploy(owner.address);
    await dummyToken.waitForDeployment();

    const DummyParams = await ethers.getContractFactory("Parameters");
    dummyParams = await DummyParams.deploy(owner.address);
    await dummyParams.waitForDeployment();

    // Deploy estrategia de votación simple para testing
    const SimpleMajority = await ethers.getContractFactory("SimpleMajorityStrategy");
    votingStrategy = await SimpleMajority.deploy(dummyToken.target, dummyParams.target);
    await votingStrategy.waitForDeployment();

    // Deploy ProposalManager
    ProposalManager = await ethers.getContractFactory("ProposalManager");
    proposalManager = await ProposalManager.deploy(
      votingStrategy.target,
      MIN_VOTING_POWER,
      PROPOSAL_DURATION
    );
    await proposalManager.waitForDeployment();
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
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER - 1
      )
    ).to.be.revertedWith("Insufficient voting power");
  });

  it("Debe rechazar propuesta con título vacío", async () => {
    await expect(
      proposalManager.connect(proposer).createProposal("", "Description", MIN_VOTING_POWER)
    ).to.be.revertedWith("Title cannot be empty");
  });

  it("Debe rechazar propuesta sin descripción", async () => {
    await expect(
      proposalManager.connect(proposer).createProposal("Title", "", MIN_VOTING_POWER)
    ).to.be.revertedWith("Description cannot be empty");
  });

  it("Emite evento ProposalCreated", async () => {
    await expect(
      proposalManager.connect(proposer).createProposal(
        "Test Proposal",
        "Description",
        MIN_VOTING_POWER
      )
    )
      .to.emit(proposalManager, "ProposalCreated");
  });

  // -------------------------------------------------------------------------
  // Votación
  // -------------------------------------------------------------------------

  it("Un usuario puede votar en una propuesta activa", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    const votingWeight = 1000;
    await proposalManager
      .connect(voter1)
      .vote(0, VoteType.FOR, votingWeight);

    const [votesFor, votesAgainst] = await proposalManager.getProposalResults(0);
    expect(votesFor).to.equal(votingWeight);
    expect(votesAgainst).to.equal(0);
  });

  it("Emite evento VoteCasted", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    const votingWeight = 1000;
    await expect(
      proposalManager
        .connect(voter1)
        .vote(0, VoteType.FOR, votingWeight)
    )
      .to.emit(proposalManager, "VoteCasted")
      .withArgs(0, voter1.address, VoteType.FOR, votingWeight);
  });

  it("Debe rechazar voto con peso 0", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await expect(
      proposalManager.connect(voter1).vote(0, VoteType.FOR, 0)
    ).to.be.revertedWith("Voting weight must be > 0");
  });

  it("Debe rechazar voto de tipo NONE", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await expect(
      proposalManager.connect(voter1).vote(0, VoteType.NONE, 1000)
    ).to.be.revertedWithCustomError(proposalManager, "InvalidVoteType");
  });

  it("Debe evitar que una persona vote dos veces", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await proposalManager
      .connect(voter1)
      .vote(0, VoteType.FOR, 1000);

    await expect(
      proposalManager
        .connect(voter1)
        .vote(0, VoteType.AGAINST, 500)
    ).to.be.revertedWithCustomError(proposalManager, "AlreadyVoted");
  });

  it("Debe permitir cambiar el voto antes del deadline", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    const votingWeight = 1000;

    // Primer voto: FOR
    await proposalManager
      .connect(voter1)
      .vote(0, VoteType.FOR, votingWeight);

    // Cambiar a AGAINST
    await proposalManager
      .connect(voter1)
      .changeVote(0, VoteType.AGAINST, votingWeight);

    const [votesFor, votesAgainst] = await proposalManager.getProposalResults(0);
    expect(votesFor).to.equal(0);
    expect(votesAgainst).to.equal(votingWeight);
  });

  it("Debe rechazar voto después del deadline", async () => {
    await proposalManager.connect(proposer).createProposal(
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
        .vote(0, VoteType.FOR, 1000)
    ).to.be.revertedWithCustomError(proposalManager, "ProposalDeadlinePassed");
  });

  it("Debe rechazar voto en propuesta no activa", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    // Finalizar la propuesta
    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    await expect(
      proposalManager
        .connect(voter1)
        .vote(0, VoteType.FOR, 1000)
    ).to.be.revertedWithCustomError(proposalManager, "ProposalNotActive");
  });

  // -------------------------------------------------------------------------
  // Finalización de Propuestas
  // -------------------------------------------------------------------------

  it("Debe finalizar propuesta como ACCEPTED con mayoría de votos FOR", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    // Votos a favor
    await proposalManager
      .connect(voter1)
      .vote(0, VoteType.FOR, 6000);
    await proposalManager
      .connect(voter2)
      .vote(0, VoteType.FOR, 2000);

    // Votos en contra
    await proposalManager
      .connect(voter3)
      .vote(0, VoteType.AGAINST, 1000);

    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    const proposal = await proposalManager.getProposal(0);
    expect(proposal.state).to.equal(ProposalState.ACCEPTED);
  });

  it("Debe finalizar propuesta como REJECTED sin mayoría de votos FOR", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    // Votos a favor
    await proposalManager
      .connect(voter1)
      .vote(0, VoteType.FOR, 4000);

    // Votos en contra
    await proposalManager
      .connect(voter2)
      .vote(0, VoteType.AGAINST, 5000);
    await proposalManager
      .connect(voter3)
      .vote(0, VoteType.AGAINST, 1000);

    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    const proposal = await proposalManager.getProposal(0);
    expect(proposal.state).to.equal(ProposalState.REJECTED);
  });

  it("Debe expirar propuesta automáticamente si está vencida", async () => {
    await proposalManager.connect(proposer).createProposal(
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
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await proposalManager
      .connect(voter1)
      .vote(0, VoteType.FOR, 6000);

    await expect(proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER))
      .to.emit(proposalManager, "ProposalStateChanged")
      .withArgs(0, ProposalState.ACTIVE, ProposalState.ACCEPTED);
  });

  // -------------------------------------------------------------------------
  // Consultas
  // -------------------------------------------------------------------------

  it("hasUserVoted debe retornar true si el usuario votó", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await proposalManager
      .connect(voter1)
      .vote(0, VoteType.FOR, 1000);

    expect(await proposalManager.hasUserVoted(0, voter1.address)).to.be.true;
    expect(await proposalManager.hasUserVoted(0, voter2.address)).to.be.false;
  });

  it("getUserVote debe retornar el voto del usuario", async () => {
    await proposalManager.connect(proposer).createProposal(
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    await proposalManager
      .connect(voter1)
      .vote(0, VoteType.FOR, 1000);

    expect(await proposalManager.getUserVote(0, voter1.address)).to.equal(
      VoteType.FOR
    );
  });

  it("isProposalActive debe retornar true para propuestas activas", async () => {
    await proposalManager.connect(proposer).createProposal(
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
      "Test Proposal",
      "Description",
      MIN_VOTING_POWER
    );

    expect(await proposalManager.getProposalState(0)).to.equal(
      ProposalState.ACTIVE
    );

    await proposalManager
      .connect(voter1)
      .vote(0, VoteType.FOR, 6000);

    await proposalManager.finalizeProposal(0, TOTAL_VOTING_POWER);

    expect(await proposalManager.getProposalState(0)).to.equal(
      ProposalState.ACCEPTED
    );
  });

  it("hasProposalDeadlinePassed debe retornar true después del deadline", async () => {
    await proposalManager.connect(proposer).createProposal(
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
    ).to.be.revertedWith("Duration must be > 0");
  });
});
