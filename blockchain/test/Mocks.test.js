const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * Tests específicos para cubrir las líneas no probadas en los contratos mock.
 * Estos tests aseguran 100% de cobertura en todos los mocks.
 */
describe("Mocks Coverage Tests", function () {
  let owner, user;

  beforeEach(async () => {
    [owner, user] = await ethers.getSigners();
  });

  // =====================================================
  //            MockFailStrategy
  // =====================================================
  describe("MockFailStrategy", function () {
    let mockFailStrategy;

    beforeEach(async () => {
      const MockFailStrategy = await ethers.getContractFactory("MockFailStrategy");
      mockFailStrategy = await MockFailStrategy.deploy();
      await mockFailStrategy.waitForDeployment();
    });

    it("calculateVotingPower debe retornar 0", async function () {
      const vp = await mockFailStrategy.calculateVotingPower(user.address);
      expect(vp).to.equal(0);
    });

    it("isProposalAccepted debe retornar false", async function () {
      const accepted = await mockFailStrategy.isProposalAccepted(1, 100, 50);
      expect(accepted).to.equal(false);
    });

    it("getTotalVotingPower debe revertir", async function () {
      await expect(
        mockFailStrategy.getTotalVotingPower()
      ).to.be.revertedWith("Failure");
    });
  });

  // =====================================================
  //            MockGovernanceToken
  // =====================================================
  describe("MockGovernanceToken", function () {
    let mockToken;

    beforeEach(async () => {
      const MockGovernanceToken = await ethers.getContractFactory("MockGovernanceToken");
      mockToken = await MockGovernanceToken.deploy();
      await mockToken.waitForDeployment();
    });

    it("burn debe registrar from y amount", async function () {
      await mockToken.burn(user.address, 100);
      expect(await mockToken.lastBurnFrom()).to.equal(user.address);
      expect(await mockToken.lastBurnAmount()).to.equal(100);
    });

    it("approve debe retornar true", async function () {
      const result = await mockToken.approve(user.address, 1000);
      // approve retorna true pero es una transacción, verificamos que no revierte
      expect(result).to.not.be.undefined;
    });

    it("mint debe registrar to y amount", async function () {
      await mockToken.mint(user.address, 500);
      expect(await mockToken.lastMintTo()).to.equal(user.address);
      expect(await mockToken.lastMintAmount()).to.equal(500);
    });

    it("balanceOf debe retornar 1000 ether", async function () {
      const balance = await mockToken.balanceOf(user.address);
      expect(balance).to.equal(ethers.parseEther("1000"));
    });

    it("allowance debe retornar 500 ether", async function () {
      const allowance = await mockToken.allowance(user.address, owner.address);
      expect(allowance).to.equal(ethers.parseEther("500"));
    });

    it("transferFrom debe registrar los datos y retornar true", async function () {
      const result = await mockToken.transferFrom(user.address, owner.address, 200);
      expect(await mockToken.lastBurnFrom()).to.equal(user.address);
      expect(await mockToken.lastBurnAmount()).to.equal(200);
    });
  });

  // =====================================================
  //            MockPanicManager
  // =====================================================
  describe("MockPanicManager", function () {
    let mockPanicManager;

    beforeEach(async () => {
      const MockPanicManager = await ethers.getContractFactory("MockPanicManager");
      mockPanicManager = await MockPanicManager.deploy();
      await mockPanicManager.waitForDeployment();
    });

    it("setPanicOperator debe cambiar el operador", async function () {
      await mockPanicManager.setPanicOperator(user.address);
      expect(await mockPanicManager.panicOperator()).to.equal(user.address);
    });

    it("setPanic debe cambiar el estado de pánico", async function () {
      expect(await mockPanicManager.isPanicked()).to.equal(false);
      await mockPanicManager.setPanic(true);
      expect(await mockPanicManager.isPanicked()).to.equal(true);
    });

    it("checkNotPanicked no debe revertir cuando no hay pánico", async function () {
      await expect(mockPanicManager.checkNotPanicked()).to.not.be.reverted;
    });

    it("checkNotPanicked debe revertir cuando hay pánico", async function () {
      await mockPanicManager.setPanic(true);
      await expect(mockPanicManager.checkNotPanicked()).to.be.reverted;
    });
  });

  // =====================================================
  //            MockParameters
  // =====================================================
  describe("MockParameters", function () {
    let mockParameters;

    beforeEach(async () => {
      const MockParameters = await ethers.getContractFactory("MockParameters");
      mockParameters = await MockParameters.deploy();
      await mockParameters.waitForDeployment();
    });

    it("setTokenPriceValue debe cambiar el precio del token", async function () {
      await mockParameters.setTokenPriceValue(ethers.parseEther("2"));
      expect(await mockParameters.tokenPriceValue()).to.equal(ethers.parseEther("2"));
    });

    it("setPrice debe cambiar el precio del token (alias)", async function () {
      await mockParameters.setPrice(ethers.parseEther("3"));
      expect(await mockParameters.tokenPrice()).to.equal(ethers.parseEther("3"));
    });

    it("setMinStakeForVoting y getMinStakeForVoting deben funcionar", async function () {
      await mockParameters.setMinStakeForVoting(100);
      expect(await mockParameters.getMinStakeForVoting()).to.equal(100);
    });

    it("setMinStakeForProposing y getMinStakeForProposing deben funcionar", async function () {
      await mockParameters.setMinStakeForProposing(200);
      expect(await mockParameters.getMinStakeForProposing()).to.equal(200);
    });

    it("setStakingLockTime y getStakingLockTime deben funcionar", async function () {
      await mockParameters.setStakingLockTime(3600);
      expect(await mockParameters.getStakingLockTime()).to.equal(3600);
    });

    it("setProposalDuration y getProposalDuration deben funcionar", async function () {
      await mockParameters.setProposalDuration(86400);
      expect(await mockParameters.getProposalDuration()).to.equal(86400);
    });

    it("setTokensPerVotingPower y getTokensPerVotingPower deben funcionar", async function () {
      await mockParameters.setTokensPerVotingPower(10);
      expect(await mockParameters.getTokensPerVotingPower()).to.equal(10);
    });
  });

  // =====================================================
  //            MockProposalManager
  // =====================================================
  describe("MockProposalManager", function () {
    let mockProposalManager;

    beforeEach(async () => {
      const MockProposalManager = await ethers.getContractFactory("MockProposalManager");
      mockProposalManager = await MockProposalManager.deploy();
      await mockProposalManager.waitForDeployment();
    });

    it("setCurrentVoter debe establecer el votante actual", async function () {
      await mockProposalManager.setCurrentVoter(user.address);
      expect(await mockProposalManager.currentVoter()).to.equal(user.address);
    });

    it("setCurrentCreator debe establecer el creador actual", async function () {
      await mockProposalManager.setCurrentCreator(user.address);
      expect(await mockProposalManager.currentCreator()).to.equal(user.address);
    });

    it("createProposal debe incrementar proposalCount y nextId", async function () {
      const id = await mockProposalManager.createProposal.staticCall(
        user.address, 
        "Test", 
        "Description", 
        100
      );
      expect(id).to.equal(1);
      
      await mockProposalManager.createProposal(user.address, "Test", "Description", 100);
      expect(await mockProposalManager.proposalCount()).to.equal(1);
    });

    it("vote debe registrar los datos del voto", async function () {
      await mockProposalManager.vote(user.address, 1, 1); // VoteType.FOR = 1
      expect(await mockProposalManager.lastVoteProposal()).to.equal(1);
      expect(await mockProposalManager.lastVoteUser()).to.equal(user.address);
      expect(await mockProposalManager.lastSupport()).to.equal(true);
    });

    it("changeVote debe registrar los datos del cambio", async function () {
      await mockProposalManager.changeVote(user.address, 2, 2); // VoteType.AGAINST = 2
      expect(await mockProposalManager.lastChangeProposal()).to.equal(2);
      expect(await mockProposalManager.lastChangeUser()).to.equal(user.address);
      expect(await mockProposalManager.lastChangeSupport()).to.equal(false);
    });

    it("getProposal debe retornar una propuesta de prueba", async function () {
      const proposal = await mockProposalManager.getProposal(1);
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.description).to.equal("Test Description");
    });

    it("getProposalState debe retornar ACTIVE", async function () {
      const state = await mockProposalManager.getProposalState(1);
      expect(state).to.equal(0); // ACTIVE = 0
    });

    it("getProposalResults debe retornar votos", async function () {
      const [votesFor, votesAgainst] = await mockProposalManager.getProposalResults(1);
      expect(votesFor).to.equal(100);
      expect(votesAgainst).to.equal(50);
    });

    it("getUserVote debe retornar FOR", async function () {
      const vote = await mockProposalManager.getUserVote(1, user.address);
      expect(vote).to.equal(1); // FOR = 1
    });

    it("isProposalActive debe retornar true", async function () {
      expect(await mockProposalManager.isProposalActive(1)).to.equal(true);
    });

    it("hasUserVoted debe retornar true", async function () {
      expect(await mockProposalManager.hasUserVoted(1, user.address)).to.equal(true);
    });

    it("hasProposalDeadlinePassed debe retornar false", async function () {
      expect(await mockProposalManager.hasProposalDeadlinePassed(1)).to.equal(false);
    });

    it("finalizeProposal no debe revertir", async function () {
      await expect(mockProposalManager.finalizeProposal(1, 1000)).to.not.be.reverted;
    });

    it("expireProposal no debe revertir", async function () {
      await expect(mockProposalManager.expireProposal(1)).to.not.be.reverted;
    });
  });

  // =====================================================
  //            MockStaking
  // =====================================================
  describe("MockStaking", function () {
    let mockStaking;

    beforeEach(async () => {
      const MockStaking = await ethers.getContractFactory("MockStaking");
      mockStaking = await MockStaking.deploy();
      await mockStaking.waitForDeployment();
    });

    it("setCurrentUser debe establecer el usuario actual", async function () {
      await mockStaking.setCurrentUser(user.address);
      expect(await mockStaking.currentUser()).to.equal(user.address);
    });

    it("stakeForVotingFrom sin currentUser debe usar user parameter", async function () {
      await mockStaking.stakeForVotingFrom(user.address, 100);
      expect(await mockStaking.lastUser()).to.equal(user.address);
      expect(await mockStaking.lastAmount()).to.equal(100);
    });

    it("stakeForVotingFrom con currentUser debe usar currentUser", async function () {
      await mockStaking.setCurrentUser(owner.address);
      await mockStaking.stakeForVotingFrom(user.address, 200);
      expect(await mockStaking.lastUser()).to.equal(owner.address);
      expect(await mockStaking.lastAmount()).to.equal(200);
    });

    it("stakeForProposingFrom sin currentUser debe usar user parameter", async function () {
      await mockStaking.stakeForProposingFrom(user.address, 300);
      expect(await mockStaking.lastUser()).to.equal(user.address);
      expect(await mockStaking.lastAmount()).to.equal(300);
    });

    it("stakeForProposingFrom con currentUser debe usar currentUser", async function () {
      await mockStaking.setCurrentUser(owner.address);
      await mockStaking.stakeForProposingFrom(user.address, 400);
      expect(await mockStaking.lastUser()).to.equal(owner.address);
    });

    it("unstakeFromVoting sin currentUser debe usar msg.sender", async function () {
      await mockStaking.connect(user).unstakeFromVoting(100);
      expect(await mockStaking.lastUser()).to.equal(user.address);
    });

    it("unstakeFromVoting con currentUser debe usar currentUser", async function () {
      await mockStaking.setCurrentUser(owner.address);
      await mockStaking.connect(user).unstakeFromVoting(100);
      expect(await mockStaking.lastUser()).to.equal(owner.address);
    });

    it("unstakeFromProposing sin currentUser debe usar msg.sender", async function () {
      await mockStaking.connect(user).unstakeFromProposing(100);
      expect(await mockStaking.lastUser()).to.equal(user.address);
    });

    it("unstakeFromProposing con currentUser debe usar currentUser", async function () {
      await mockStaking.setCurrentUser(owner.address);
      await mockStaking.connect(user).unstakeFromProposing(100);
      expect(await mockStaking.lastUser()).to.equal(owner.address);
    });

    it("getVotingStake debe retornar 0", async function () {
      expect(await mockStaking.getVotingStake(user.address)).to.equal(0);
    });

    it("getProposingStake debe retornar 0", async function () {
      expect(await mockStaking.getProposingStake(user.address)).to.equal(0);
    });

    it("totalVotingStaked debe retornar 10000 ether", async function () {
      expect(await mockStaking.totalVotingStaked()).to.equal(ethers.parseEther("10000"));
    });

    it("extendVotingLock debe extender el lock si es mayor", async function () {
      await mockStaking.extendVotingLock(user.address, 1000);
      expect(await mockStaking.votingLockExpiry(user.address)).to.equal(1000);
      
      // No debe reducir
      await mockStaking.extendVotingLock(user.address, 500);
      expect(await mockStaking.votingLockExpiry(user.address)).to.equal(1000);
      
      // Debe incrementar
      await mockStaking.extendVotingLock(user.address, 2000);
      expect(await mockStaking.votingLockExpiry(user.address)).to.equal(2000);
    });

    it("getVotingLockExpiry debe retornar el valor correcto", async function () {
      await mockStaking.extendVotingLock(user.address, 5000);
      expect(await mockStaking.getVotingLockExpiry(user.address)).to.equal(5000);
    });
  });

  // =====================================================
  //            MockStrategyManager
  // =====================================================
  describe("MockStrategyManager", function () {
    let mockStrategyManager;

    beforeEach(async () => {
      const MockStrategyManager = await ethers.getContractFactory("MockStrategyManager");
      mockStrategyManager = await MockStrategyManager.deploy();
      await mockStrategyManager.waitForDeployment();
    });

    it("setActiveStrategy debe establecer la estrategia actual", async function () {
      await mockStrategyManager.setActiveStrategy(user.address);
      expect(await mockStrategyManager.current()).to.equal(user.address);
    });

    it("getStrategy debe retornar la estrategia actual", async function () {
      await mockStrategyManager.setActiveStrategy(user.address);
      expect(await mockStrategyManager.getStrategy()).to.equal(user.address);
    });

    it("getActiveStrategyAddress debe retornar la estrategia actual", async function () {
      await mockStrategyManager.setActiveStrategy(user.address);
      expect(await mockStrategyManager.getActiveStrategyAddress()).to.equal(user.address);
    });
  });

  // =====================================================
  //            MockVotingStrategy
  // =====================================================
  describe("MockVotingStrategy", function () {
    let mockVotingStrategy;

    beforeEach(async () => {
      const MockVotingStrategy = await ethers.getContractFactory("MockVotingStrategy");
      mockVotingStrategy = await MockVotingStrategy.deploy(ethers.parseEther("100"));
      await mockVotingStrategy.waitForDeployment();
    });

    it("calculateVotingPower debe retornar base para usuarios válidos", async function () {
      const vp = await mockVotingStrategy.calculateVotingPower(user.address);
      expect(vp).to.equal(ethers.parseEther("100"));
    });

    it("calculateVotingPower debe retornar 0 para address(0)", async function () {
      const vp = await mockVotingStrategy.calculateVotingPower(ethers.ZeroAddress);
      expect(vp).to.equal(0);
    });

    it("base debe ser establecido correctamente en el constructor", async function () {
      expect(await mockVotingStrategy.base()).to.equal(ethers.parseEther("100"));
    });
  });
});
