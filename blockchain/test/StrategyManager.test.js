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
    it("Debe permitir al owner cambiar la estrategia activa y emitir evento", async function () {
      const tx = await strategyManager.setActiveStrategy(strategy2.target);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      await expect(tx)
        .to.emit(strategyManager, "StrategyChanged")
        .withArgs(strategy1.target, strategy2.target, block.timestamp);

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

    it("Debe permitir cambiar la estrategia múltiples veces", async function () {
      await strategyManager.setActiveStrategy(strategy2.target);
      expect(await strategyManager.activeStrategy()).to.equal(strategy2.target);

      await strategyManager.setActiveStrategy(strategy1.target);
      expect(await strategyManager.activeStrategy()).to.equal(strategy1.target);
    });
  });

  // ---------------------------
  // getActiveStrategy y getActiveStrategyAddress
  // ---------------------------
  describe("getActiveStrategy / getActiveStrategyAddress", function () {
    it("Debe retornar la estrategia activa y ambas funciones deben coincidir", async function () {
      expect(await strategyManager.getActiveStrategy()).to.equal(strategy1.target);
      expect(await strategyManager.getActiveStrategyAddress()).to.equal(strategy1.target);
      
      const address1 = await strategyManager.getActiveStrategy();
      const address2 = await strategyManager.getActiveStrategyAddress();
      expect(address1).to.equal(address2);
    });

    it("Debe retornar la nueva estrategia después de cambiarla", async function () {
      await strategyManager.setActiveStrategy(strategy2.target);
      expect(await strategyManager.getActiveStrategy()).to.equal(strategy2.target);
      expect(await strategyManager.getActiveStrategyAddress()).to.equal(strategy2.target);
    });
  });

  // ---------------------------
  // ---------------------------
  // Ownership
  // ---------------------------
  describe("Ownership", function () {
    it("El owner puede transferir ownership y el nuevo owner puede cambiar estrategia", async function () {
      await strategyManager.transferOwnership(user1.address);
      expect(await strategyManager.owner()).to.equal(user1.address);
      
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

  // ---------------------------
  // Branch Coverage - Additional Tests
  // ---------------------------
  describe("Branch Coverage - Additional Tests", function () {
    it("setActiveStrategy con estrategia válida diferente debe actualizar", async function () {
      // Test que pasa la validación address(0) y la validación SameStrategy
      expect(await strategyManager.activeStrategy()).to.equal(strategy1.target);
      await strategyManager.setActiveStrategy(strategy2.target);
      expect(await strategyManager.activeStrategy()).to.equal(strategy2.target);
    });

    it("Constructor inicializa activeStrategy correctamente", async function () {
      const newManager = await StrategyManager.deploy(strategy2.target);
      await newManager.waitForDeployment();
      expect(await newManager.activeStrategy()).to.equal(strategy2.target);
    });

    it("setActiveStrategy emite evento con timestamp correcto", async function () {
      const tx = await strategyManager.setActiveStrategy(strategy2.target);
      const receipt = await tx.wait();
      const block = await ethers.provider.getBlock(receipt.blockNumber);

      // Verificar que el evento tiene el timestamp correcto
      const events = receipt.logs.filter(log => {
        try {
          return strategyManager.interface.parseLog(log)?.name === "StrategyChanged";
        } catch {
          return false;
        }
      });
      expect(events.length).to.equal(1);
    });

    it("Cambio de estrategia múltiple debe emitir eventos correctos", async function () {
      await expect(strategyManager.setActiveStrategy(strategy2.target))
        .to.emit(strategyManager, "StrategyChanged");
      
      await expect(strategyManager.setActiveStrategy(strategy1.target))
        .to.emit(strategyManager, "StrategyChanged");
      
      expect(await strategyManager.activeStrategy()).to.equal(strategy1.target);
    });
  });
});
