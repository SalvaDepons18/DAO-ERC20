const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SimpleMajorityStrategy", function () {
  let SimpleMajorityStrategy, strategy;
  let ShaCoin, token;
  let Parameters, parameters;
  let Staking, staking;
  let owner, user1, user2, user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    // Deploy ShaCoin (ERC20 token)
    ShaCoin = await ethers.getContractFactory("ShaCoin");
    token = await ShaCoin.deploy(owner.address);
    await token.waitForDeployment();

    // Deploy Parameters
    Parameters = await ethers.getContractFactory("Parameters");
    parameters = await Parameters.deploy(owner.address);
    await parameters.waitForDeployment();

    // Configurar tokensPerVotingPower (ej: 100 tokens = 1 VP)
    // Usamos wei para ser consistentes con los stakes
    await parameters.setTokensPerVotingPower(ethers.parseEther("100"));

    // Deploy Staking
    Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(token.target, parameters.target);
    await staking.waitForDeployment();

    // Deploy SimpleMajorityStrategy
    SimpleMajorityStrategy = await ethers.getContractFactory("SimpleMajorityStrategy");
    strategy = await SimpleMajorityStrategy.deploy(staking.target, parameters.target);
    await strategy.waitForDeployment();
  });

  // ---------------------------
  // Constructor
  // ---------------------------
  describe("Constructor", function () {
    it("Debe deployarse correctamente con direcciones válidas", async function () {
      expect(await strategy.staking()).to.equal(staking.target);
      expect(await strategy.parameters()).to.equal(parameters.target);
    });

    it("Debe revertir si la dirección de Staking es address(0)", async function () {
      await expect(
        SimpleMajorityStrategy.deploy(ethers.ZeroAddress, parameters.target)
      ).to.be.revertedWithCustomError(SimpleMajorityStrategy, "InvalidAddress");
    });

    it("Debe revertir si la dirección de Parameters es address(0)", async function () {
      await expect(
        SimpleMajorityStrategy.deploy(staking.target, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(SimpleMajorityStrategy, "InvalidAddress");
    });
  });

  // ---------------------------
  // calculateVotingPower
  // ---------------------------
  describe("calculateVotingPower", function () {
    beforeEach(async function () {
      // Mintear tokens a los usuarios
      await token.mint(user1.address, ethers.parseEther("1000"));
      await token.mint(user2.address, ethers.parseEther("500"));
      
      // Aprobar el contrato de staking
      await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
      await token.connect(user2).approve(staking.target, ethers.parseEther("500"));
    });

    it("Debe calcular correctamente el poder de voto basado en stake", async function () {
      // user1 stakea 1000 tokens
      await staking.connect(user1).stakeForVoting(ethers.parseEther("1000"));
      
      // Con tokensPerVP = 100, debería tener 10 VP
      const votingPower = await strategy.calculateVotingPower(user1.address);
      expect(votingPower).to.equal(10n);
    });

    it("Debe retornar 0 si el usuario no tiene stake", async function () {
      const votingPower = await strategy.calculateVotingPower(user3.address);
      expect(votingPower).to.equal(0);
    });

    it("Debe retornar 0 si tokensPerVotingPower es 0", async function () {
      // Stakear primero
      await staking.connect(user1).stakeForVoting(ethers.parseEther("1000"));
      
      // Cambiar tokensPerVotingPower a 0
      await parameters.setTokensPerVotingPower(0);
      
      const votingPower = await strategy.calculateVotingPower(user1.address);
      expect(votingPower).to.equal(0);
    });

    it("Debe calcular correctamente con diferentes ratios de tokens", async function () {
      // Cambiar a 200 tokens = 1 VP
      await parameters.setTokensPerVotingPower(ethers.parseEther("200"));
      
      await staking.connect(user1).stakeForVoting(ethers.parseEther("1000"));
      
      // Con 1000 tokens y ratio 200, debería tener 5 VP
      const votingPower = await strategy.calculateVotingPower(user1.address);
      expect(votingPower).to.equal(5n);
    });

    it("Debe calcular poder de voto para múltiples usuarios", async function () {
      await staking.connect(user1).stakeForVoting(ethers.parseEther("1000"));
      await staking.connect(user2).stakeForVoting(ethers.parseEther("500"));
      
      const vp1 = await strategy.calculateVotingPower(user1.address);
      const vp2 = await strategy.calculateVotingPower(user2.address);
      
      expect(vp1).to.equal(10n);
      expect(vp2).to.equal(5n);
    });

    it("Debe revertir si la dirección del usuario es address(0)", async function () {
      await expect(
        strategy.calculateVotingPower(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(strategy, "InvalidAddress");
    });

    it("Debe manejar stakes parciales (división entera)", async function () {
      // Para probar división entera correctamente, necesitamos números que no dividan exactamente
      // Stakear 99 tokens con ratio 100 tokens/VP = 0 VP (división entera)
      await staking.connect(user2).stakeForVoting(ethers.parseEther("99"));
      
      const votingPower = await strategy.calculateVotingPower(user2.address);
      expect(votingPower).to.equal(0n); // 99/100 = 0 en división entera
      
      // Ahora stakear 101 tokens = 1 VP (no 1.01)
      await token.mint(user1.address, ethers.parseEther("101"));
      await token.connect(user1).approve(staking.target, ethers.parseEther("101"));
      await staking.connect(user1).stakeForVoting(ethers.parseEther("101"));
      const vp1 = await strategy.calculateVotingPower(user1.address);
      expect(vp1).to.equal(1n); // 101/100 = 1 en división entera
    });
  });

  // ---------------------------
  // isProposalAccepted
  // ---------------------------
  describe("isProposalAccepted", function () {
    it("Debe aceptar propuesta si votesFor > votesAgainst y rechazar en caso contrario", async function () {
      expect(await strategy.isProposalAccepted(100, 50, 150)).to.be.true;
      expect(await strategy.isProposalAccepted(30, 70, 100)).to.be.false;
      expect(await strategy.isProposalAccepted(50, 50, 100)).to.be.false; // empate
      expect(await strategy.isProposalAccepted(0, 0, 0)).to.be.false; // sin votos
    });
  });

  // ---------------------------
  // Integración completa
  // ---------------------------
  describe("Integración: Staking + Voting Power + Proposal", function () {
    beforeEach(async function () {
      // Mintear y aprobar tokens
      await token.mint(user1.address, ethers.parseEther("1000"));
      await token.mint(user2.address, ethers.parseEther("500"));
      await token.mint(user3.address, ethers.parseEther("300"));
      
      await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
      await token.connect(user2).approve(staking.target, ethers.parseEther("500"));
      await token.connect(user3).approve(staking.target, ethers.parseEther("300"));
      
      // Todos stakean
      await staking.connect(user1).stakeForVoting(ethers.parseEther("1000"));
      await staking.connect(user2).stakeForVoting(ethers.parseEther("500"));
      await staking.connect(user3).stakeForVoting(ethers.parseEther("300"));
    });

    it("Debe calcular correctamente escenarios de votación con múltiples usuarios", async function () {
      const vp1 = await strategy.calculateVotingPower(user1.address); // 10 VP
      const vp2 = await strategy.calculateVotingPower(user2.address); // 5 VP
      const vp3 = await strategy.calculateVotingPower(user3.address); // 3 VP
      
      // Mayoría a favor: 15 vs 3
      expect(await strategy.isProposalAccepted(vp1 + vp2, vp3, vp1 + vp2 + vp3)).to.be.true;
      
      // Mayoría en contra: 8 vs 10
      expect(await strategy.isProposalAccepted(vp2 + vp3, vp1, vp1 + vp2 + vp3)).to.be.false;
    });
  });

  // ---------------------------
  // getTotalVotingPower
  // ---------------------------
  describe("getTotalVotingPower", function () {
    it("Debe retornar el poder de voto total basado en stake total", async function () {
      // Mintear y stakear tokens
      await token.mint(user1.address, ethers.parseEther("1000"));
      await token.mint(user2.address, ethers.parseEther("500"));
      
      await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
      await token.connect(user2).approve(staking.target, ethers.parseEther("500"));
      
      await staking.connect(user1).stakeForVoting(ethers.parseEther("1000"));
      await staking.connect(user2).stakeForVoting(ethers.parseEther("500"));
      
      // Total stake = 1500, tokensPerVP = 100 → total VP = 15
      const totalVP = await strategy.getTotalVotingPower();
      expect(totalVP).to.equal(15n);
    });

    it("Debe retornar 0 si no hay stake", async function () {
      const totalVP = await strategy.getTotalVotingPower();
      expect(totalVP).to.equal(0);
    });

    it("Debe retornar 0 si tokensPerVotingPower es 0", async function () {
      // Stakear algo primero
      await token.mint(user1.address, ethers.parseEther("1000"));
      await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
      await staking.connect(user1).stakeForVoting(ethers.parseEther("1000"));
      
      // Cambiar tokensPerVotingPower a 0
      await parameters.setTokensPerVotingPower(0);
      
      const totalVP = await strategy.getTotalVotingPower();
      expect(totalVP).to.equal(0);
    });

    it("Debe calcular correctamente con diferentes ratios", async function () {
      await token.mint(user1.address, ethers.parseEther("2000"));
      await token.connect(user1).approve(staking.target, ethers.parseEther("2000"));
      await staking.connect(user1).stakeForVoting(ethers.parseEther("2000"));
      
      // Cambiar a 400 tokens = 1 VP
      await parameters.setTokensPerVotingPower(ethers.parseEther("400"));
      
      // Total stake = 2000, tokensPerVP = 400 → total VP = 5
      const totalVP = await strategy.getTotalVotingPower();
      expect(totalVP).to.equal(5n);
    });
  });
});
