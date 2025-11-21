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
    it("Debe aceptar propuesta si votesFor > votesAgainst", async function () {
      const isAccepted = await strategy.isProposalAccepted(100, 50, 150);
      expect(isAccepted).to.be.true;
    });

    it("Debe rechazar propuesta si votesFor < votesAgainst", async function () {
      const isAccepted = await strategy.isProposalAccepted(30, 70, 100);
      expect(isAccepted).to.be.false;
    });

    it("Debe rechazar propuesta si votesFor == votesAgainst (empate)", async function () {
      const isAccepted = await strategy.isProposalAccepted(50, 50, 100);
      expect(isAccepted).to.be.false;
    });

    it("Debe aceptar propuesta con votesFor muy superior", async function () {
      const isAccepted = await strategy.isProposalAccepted(1000, 1, 1001);
      expect(isAccepted).to.be.true;
    });

    it("Debe funcionar con valores mínimos", async function () {
      const isAccepted = await strategy.isProposalAccepted(1, 0, 1);
      expect(isAccepted).to.be.true;
    });

    it("Debe rechazar si no hay votos a favor", async function () {
      const isAccepted = await strategy.isProposalAccepted(0, 10, 10);
      expect(isAccepted).to.be.false;
    });

    it("Debe rechazar si ambos votos son 0", async function () {
      const isAccepted = await strategy.isProposalAccepted(0, 0, 0);
      expect(isAccepted).to.be.false;
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

    it("Escenario 1: Mayoría a favor gana", async function () {
      // user1 (10 VP) y user2 (5 VP) votan a favor = 15 VP
      // user3 (3 VP) vota en contra = 3 VP
      
      const vp1 = await strategy.calculateVotingPower(user1.address);
      const vp2 = await strategy.calculateVotingPower(user2.address);
      const vp3 = await strategy.calculateVotingPower(user3.address);
      
      const votesFor = vp1 + vp2; // 15 VP
      const votesAgainst = vp3;   // 3 VP
      const totalVotingPower = vp1 + vp2 + vp3;

      expect(await strategy.isProposalAccepted(votesFor, votesAgainst, totalVotingPower)).to.be.true;
    });

    it("Escenario 2: Mayoría en contra rechaza", async function () {
      // user1 (10 VP) vota en contra = 10 VP
      // user2 (5 VP) y user3 (3 VP) votan a favor = 8 VP
      
      const vp1 = await strategy.calculateVotingPower(user1.address);
      const vp2 = await strategy.calculateVotingPower(user2.address);
      const vp3 = await strategy.calculateVotingPower(user3.address);
      
      const votesFor = vp2 + vp3;     // 8 VP
      const votesAgainst = vp1;       // 10 VP
      const totalVotingPower = vp1 + vp2 + vp3;

      expect(await strategy.isProposalAccepted(votesFor, votesAgainst, totalVotingPower)).to.be.false;
    });

    it("Escenario 3: Un solo votante a favor, sin oposición", async function () {
      const vp1 = await strategy.calculateVotingPower(user1.address);
      
      const votesFor = vp1;
      const votesAgainst = 0n;
      const totalVotingPower = vp1;

      expect(await strategy.isProposalAccepted(votesFor, votesAgainst, totalVotingPower)).to.be.true;
    });
  });
});
