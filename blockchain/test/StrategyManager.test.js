const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("StrategyManager", function () {
  let StrategyManager, strategyManager;
  let SimpleMajorityStrategy, strategy1, strategy2;
  let ShaCoin, token;
  let Parameters, parameters;
  let Staking, staking;
  let owner, user1;

  beforeEach(async function () {
    [owner, user1] = await ethers.getSigners();

    // Deploy ShaCoin (ERC20 token)
    ShaCoin = await ethers.getContractFactory("ShaCoin");
    token = await ShaCoin.deploy(owner.address);
    await token.waitForDeployment();

    // Deploy Parameters
    Parameters = await ethers.getContractFactory("Parameters");
    parameters = await Parameters.deploy(owner.address);
    await parameters.waitForDeployment();

    // Configurar tokensPerVotingPower
    await parameters.setTokensPerVotingPower(ethers.parseEther("100"));

    // Deploy Staking
    Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(token.target, parameters.target);
    await staking.waitForDeployment();

    // Deploy dos estrategias de votación
    SimpleMajorityStrategy = await ethers.getContractFactory("SimpleMajorityStrategy");
    strategy1 = await SimpleMajorityStrategy.deploy(staking.target, parameters.target);
    await strategy1.waitForDeployment();

    strategy2 = await SimpleMajorityStrategy.deploy(staking.target, parameters.target);
    await strategy2.waitForDeployment();

    // Deploy StrategyManager con strategy1 como estrategia inicial
    StrategyManager = await ethers.getContractFactory("StrategyManager");
    strategyManager = await StrategyManager.deploy(strategy1.target);
    await strategyManager.waitForDeployment();
  });

  // ---------------------------
  // Constructor
  // ---------------------------
  describe("Constructor", function () {
    it("Debe deployarse correctamente con una estrategia inicial válida", async function () {
      expect(await strategyManager.activeStrategy()).to.equal(strategy1.target);
    });

    it("Debe setear correctamente el owner", async function () {
      expect(await strategyManager.owner()).to.equal(owner.address);
    });

    it("Debe revertir si la dirección de la estrategia inicial es address(0)", async function () {
      await expect(
        StrategyManager.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(StrategyManager, "InvalidStrategy");
    });
  });

  // ---------------------------
  // setActiveStrategy
  // ---------------------------
  describe("setActiveStrategy", function () {
    it("Debe permitir al owner cambiar la estrategia activa", async function () {
      await expect(strategyManager.setActiveStrategy(strategy2.target))
        .to.emit(strategyManager, "StrategyChanged")
        .withArgs(strategy1.target, strategy2.target, await ethers.provider.getBlock('latest').then(b => b.timestamp + 1));

      expect(await strategyManager.activeStrategy()).to.equal(strategy2.target);
    });

    it("Debe revertir si la nueva estrategia es address(0)", async function () {
      await expect(
        strategyManager.setActiveStrategy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(strategyManager, "InvalidStrategy");
    });

    it("Debe revertir si la nueva estrategia es la misma que la actual", async function () {
      await expect(
        strategyManager.setActiveStrategy(strategy1.target)
      ).to.be.revertedWithCustomError(strategyManager, "SameStrategy");
    });

    it("Debe revertir si el caller no es el owner", async function () {
      await expect(
        strategyManager.connect(user1).setActiveStrategy(strategy2.target)
      ).to.be.revertedWithCustomError(strategyManager, "OwnableUnauthorizedAccount");
    });

    it("Debe emitir el evento StrategyChanged con los parámetros correctos", async function () {
      const tx = await strategyManager.setActiveStrategy(strategy2.target);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(strategyManager, "StrategyChanged")
        .withArgs(strategy1.target, strategy2.target, block.timestamp);
    });

    it("Debe permitir cambiar la estrategia múltiples veces", async function () {
      // Cambiar a strategy2
      await strategyManager.setActiveStrategy(strategy2.target);
      expect(await strategyManager.activeStrategy()).to.equal(strategy2.target);

      // Cambiar de vuelta a strategy1
      await strategyManager.setActiveStrategy(strategy1.target);
      expect(await strategyManager.activeStrategy()).to.equal(strategy1.target);

      // Cambiar otra vez a strategy2
      await strategyManager.setActiveStrategy(strategy2.target);
      expect(await strategyManager.activeStrategy()).to.equal(strategy2.target);
    });
  });

  // ---------------------------
  // getActiveStrategy
  // ---------------------------
  describe("getActiveStrategy", function () {
    it("Debe retornar la estrategia activa inicial", async function () {
      expect(await strategyManager.getActiveStrategy()).to.equal(strategy1.target);
    });

    it("Debe retornar la nueva estrategia después de cambiarla", async function () {
      await strategyManager.setActiveStrategy(strategy2.target);
      expect(await strategyManager.getActiveStrategy()).to.equal(strategy2.target);
    });
  });

  // ---------------------------
  // getActiveStrategyAddress
  // ---------------------------
  describe("getActiveStrategyAddress", function () {
    it("Debe retornar la dirección de la estrategia activa inicial", async function () {
      expect(await strategyManager.getActiveStrategyAddress()).to.equal(strategy1.target);
    });

    it("Debe retornar la dirección de la nueva estrategia después de cambiarla", async function () {
      await strategyManager.setActiveStrategy(strategy2.target);
      expect(await strategyManager.getActiveStrategyAddress()).to.equal(strategy2.target);
    });

    it("getActiveStrategy y getActiveStrategyAddress deben retornar lo mismo", async function () {
      const address1 = await strategyManager.getActiveStrategy();
      const address2 = await strategyManager.getActiveStrategyAddress();
      expect(address1).to.equal(address2);
    });
  });

  // ---------------------------
  // Integración
  // ---------------------------
  describe("Integración con SimpleMajorityStrategy", function () {
    it("Debe poder llamar a calculateVotingPower a través de la estrategia activa", async function () {
      // Mintear y stakear tokens para user1
      await token.mint(user1.address, ethers.parseEther("1000"));
      await token.connect(user1).approve(staking.target, ethers.parseEther("1000"));
      await staking.connect(user1).stakeForVoting(ethers.parseEther("1000"));

      // Obtener la estrategia activa y llamar a calculateVotingPower
      const activeStrategyAddress = await strategyManager.getActiveStrategyAddress();
      const activeStrategy = await ethers.getContractAt("SimpleMajorityStrategy", activeStrategyAddress);
      
      const votingPower = await activeStrategy.calculateVotingPower(user1.address);
      expect(votingPower).to.equal(10n); // 1000 tokens / 100 = 10 VP
    });

    it("Debe poder llamar a isProposalAccepted a través de la estrategia activa", async function () {
      const activeStrategyAddress = await strategyManager.getActiveStrategyAddress();
      const activeStrategy = await ethers.getContractAt("SimpleMajorityStrategy", activeStrategyAddress);
      
      const isAccepted = await activeStrategy.isProposalAccepted(100, 50, 150);
      expect(isAccepted).to.be.true;
    });

    it("Cambiar la estrategia debe afectar las llamadas futuras", async function () {
      // Verificar con strategy1
      let activeStrategyAddress = await strategyManager.getActiveStrategyAddress();
      expect(activeStrategyAddress).to.equal(strategy1.target);

      // Cambiar a strategy2
      await strategyManager.setActiveStrategy(strategy2.target);

      // Verificar que ahora es strategy2
      activeStrategyAddress = await strategyManager.getActiveStrategyAddress();
      expect(activeStrategyAddress).to.equal(strategy2.target);
    });
  });

  // ---------------------------
  // Ownership
  // ---------------------------
  describe("Ownership", function () {
    it("Solo el owner debe poder cambiar la estrategia", async function () {
      await expect(
        strategyManager.connect(user1).setActiveStrategy(strategy2.target)
      ).to.be.revertedWithCustomError(strategyManager, "OwnableUnauthorizedAccount");
    });

    it("El owner puede transferir la ownership", async function () {
      await strategyManager.transferOwnership(user1.address);
      expect(await strategyManager.owner()).to.equal(user1.address);
    });

    it("El nuevo owner puede cambiar la estrategia después de la transferencia", async function () {
      await strategyManager.transferOwnership(user1.address);
      
      await expect(strategyManager.connect(user1).setActiveStrategy(strategy2.target))
        .to.emit(strategyManager, "StrategyChanged");
      
      expect(await strategyManager.activeStrategy()).to.equal(strategy2.target);
    });

    it("El antiguo owner no puede cambiar la estrategia después de la transferencia", async function () {
      await strategyManager.transferOwnership(user1.address);
      
      await expect(
        strategyManager.connect(owner).setActiveStrategy(strategy2.target)
      ).to.be.revertedWithCustomError(strategyManager, "OwnableUnauthorizedAccount");
    });
  });
});
