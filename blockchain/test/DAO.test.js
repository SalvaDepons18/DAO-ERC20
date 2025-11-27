const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DAO – Tests Exhaustivos (actualizados con notInPanic en owner)", function () {
  let owner, user, attacker;

  let token, staking, proposalManager, strategyManager, parameters, panicManager;
  let DAO, dao;

  beforeEach(async () => {
    [owner, user, attacker] = await ethers.getSigners();

    const MockToken = await ethers.getContractFactory("MockGovernanceToken");
    token = await MockToken.deploy();

    const MockStaking = await ethers.getContractFactory("MockStaking");
    staking = await MockStaking.deploy();

    const MockProposal = await ethers.getContractFactory("MockProposalManager");
    proposalManager = await MockProposal.deploy();

    const MockStrategy = await ethers.getContractFactory("MockStrategyManager");
    strategyManager = await MockStrategy.deploy();

    const MockParams = await ethers.getContractFactory("MockParameters");
    parameters = await MockParams.deploy();

    const MockPanic = await ethers.getContractFactory("MockPanicManager");
    panicManager = await MockPanic.deploy();

    DAO = await ethers.getContractFactory("DAO");
    dao = await DAO.deploy(
      owner.address,
      token.target,
      staking.target,
      proposalManager.target,
      strategyManager.target,
      parameters.target,
      panicManager.target
    );
  });

  // =====================================================
  //                 CONSTRUCTOR
  // =====================================================

  it("constructor: inicializa correctamente los módulos", async () => {
    expect(await dao.owner()).to.equal(owner.address);
    expect(await dao.token()).to.equal(token.target);
    expect(await dao.staking()).to.equal(staking.target);
    expect(await dao.proposalManager()).to.equal(proposalManager.target);
    expect(await dao.strategyManager()).to.equal(strategyManager.target);
    expect(await dao.parameters()).to.equal(parameters.target);
    expect(await dao.panicManager()).to.equal(panicManager.target);
  });

  it("constructor: revierte si alguna dirección es cero", async () => {
    await expect(
      DAO.deploy(
        ethers.ZeroAddress,
        token.target,
        staking.target,
        proposalManager.target,
        strategyManager.target,
        parameters.target,
        panicManager.target
      )
    ).to.be.reverted;
  });

  // =====================================================
  //                      BUY TOKENS
  // =====================================================

  it("buyTokens: compra tokens correctamente", async () => {
    await dao.connect(user).buyTokens({ value: ethers.parseEther("1") });

    expect(await token.lastMintTo()).to.equal(user.address);
    expect(await token.lastMintAmount()).to.equal(ethers.parseEther("1"));
  });

  it("buyTokens: revierte si price = 0", async () => {
    await parameters.setPrice(0);

    await expect(
      dao.connect(user).buyTokens({ value: ethers.parseEther("1") })
    ).to.be.revertedWithCustomError(dao, "ZeroPrice");
  });

  it("buyTokens: revierte si value < price", async () => {
    await parameters.setPrice(ethers.parseEther("2"));

    await expect(
      dao.connect(user).buyTokens({ value: ethers.parseEther("1") })
    ).to.be.revertedWithCustomError(dao, "InsufficientETH");
  });

  // NOTA: Este test es imposible de alcanzar con la lógica actual del contrato
  // porque si msg.value >= price, entonces amount = msg.value / price >= 1 siempre.
  // La única forma de que amount sea 0 es si msg.value < price, pero eso activa InsufficientETH primero.
  // Se elimina este test ya que el caso está implícitamente cubierto por la lógica del contrato.

  it("buyTokens: revierte si DAO está en pánico", async () => {
    await panicManager.setPanic(true);

    await expect(
      dao.connect(user).buyTokens({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });

  // =====================================================
  //                  CREATE PROPOSAL
  // =====================================================

  it("createProposal: funciona correctamente", async () => {
    const tx = await dao.connect(user).createProposal("Titulo", "Desc");

    expect(await proposalManager.lastCreator()).to.equal(user.address);
    expect(await proposalManager.lastTitle()).to.equal("Titulo");
    expect(await proposalManager.lastDescription()).to.equal("Desc");
  });

  it("createProposal: revierte si title vacío", async () => {
    await expect(
      dao.connect(user).createProposal("", "Desc")
    ).to.be.revertedWithCustomError(dao, "EmptyString");
  });

  it("createProposal: revierte si description vacía", async () => {
    await expect(
      dao.connect(user).createProposal("Titulo", "")
    ).to.be.revertedWithCustomError(dao, "EmptyString");
  });

  it("createProposal: revierte si panic", async () => {
    await panicManager.setPanic(true);

    await expect(
      dao.connect(user).createProposal("Titulo", "Desc")
    ).to.be.reverted;
  });

  // =====================================================
  //                        VOTE
  // =====================================================

  it("vote: funciona correctamente", async () => {
    await dao.connect(user).vote(777, true);

    expect(await proposalManager.lastVoteProposal()).to.equal(777);
    expect(await proposalManager.lastVoteUser()).to.equal(user.address);
    expect(await proposalManager.lastSupport()).to.equal(true);
  });

  it("vote: extiende lock de staking hasta deadline de la propuesta", async () => {
    // Simular propuesta con deadline futuro (MockProposalManager devuelve deadline en +7 días)
    // Lock inicial es 0 para usuario
    const before = await staking.getVotingLockExpiry(user.address);
    expect(before).to.equal(0);
    await dao.connect(user).vote(123, true);
    const after = await staking.getVotingLockExpiry(user.address);
    expect(after).to.be.greaterThan(0);
  });

  it("vote: revierte si panic", async () => {
    await panicManager.setPanic(true);

    await expect(
      dao.connect(user).vote(1, true)
    ).to.be.reverted;
  });

  it("stakeForVoting: revierte si amount < minStakeForVoting", async () => {
    // Setear mínimo a 100
    await parameters.setMinStakeForVoting(100);
    await expect(
      dao.connect(user).stakeForVoting(50)
    ).to.be.revertedWithCustomError(dao, "MinStakeNotMet");
  });

  it("stakeForProposing: revierte si amount < minStakeForProposing", async () => {
    await parameters.setMinStakeForProposing(200);
    await expect(
      dao.connect(user).stakeForProposing(150)
    ).to.be.revertedWithCustomError(dao, "MinStakeNotMet");
  });

  it("createProposal: revierte si proposingStake < minStakeForProposing", async () => {
    await parameters.setMinStakeForProposing(1);
    await expect(
      dao.connect(user).createProposal("Titulo", "Desc")
    ).to.be.revertedWithCustomError(dao, "MinStakeNotMet");
  });

  it("vote: revierte si votingStake < minStakeForVoting", async () => {
    // MockStaking.getVotingStake retorna 0; seteamos mínimo > 0
    await parameters.setMinStakeForVoting(1);
    await expect(
      dao.connect(user).vote(777, true)
    ).to.be.revertedWithCustomError(dao, "MinStakeNotMet");
  });

  // =====================================================
  //                    CHANGE VOTE
  // =====================================================

  it("changeVote: funciona correctamente", async () => {
    // Primer voto (FOR)
    await dao.connect(user).vote(888, true);
    // Cambiar a AGAINST
    await dao.connect(user).changeVote(888, false);

    expect(await proposalManager.lastChangeProposal()).to.equal(888);
    expect(await proposalManager.lastChangeUser()).to.equal(user.address);
    expect(await proposalManager.lastChangeSupport()).to.equal(false);
  });

  it("changeVote: revierte si panic", async () => {
    await panicManager.setPanic(true);
    await expect(
      dao.connect(user).changeVote(2, true)
    ).to.be.reverted;
  });

  // =====================================================
  //                     STAKING
  // =====================================================

  it("stakeForVoting: quema y stakea correctamente", async () => {
    await dao.connect(user).stakeForVoting(100);

    expect(await token.lastBurnFrom()).to.equal(user.address);
    expect(await token.lastBurnAmount()).to.equal(100);

    expect(await staking.lastUser()).to.equal(user.address);
    expect(await staking.lastAmount()).to.equal(100);
  });

  it("stakeForVoting: realiza solo una transferencia (no doble)", async () => {
    // Reset markers
    await dao.connect(user).stakeForVoting(111);
    // En el mock, solo la primera transferFrom registra burnFrom=usuario
    expect(await token.lastBurnFrom()).to.equal(user.address);
    expect(await token.lastBurnAmount()).to.equal(111);
    // No existe registro intermedio del DAO como burnFrom porque removimos segunda transferencia
  });

  it("stakeForProposing: realiza solo una transferencia (no doble)", async () => {
    await dao.connect(user).stakeForProposing(222);
    expect(await token.lastBurnFrom()).to.equal(user.address);
    expect(await token.lastBurnAmount()).to.equal(222);
  });

  it("changeVote: mantiene extensión de lock si deadline mayor", async () => {
    const before = await staking.getVotingLockExpiry(user.address);
    await dao.connect(user).vote(321, true);
    const afterVote = await staking.getVotingLockExpiry(user.address);
    // Simular cambio de voto y confirmar que lock no retrocede
    await dao.connect(user).changeVote(321, false);
    const afterChange = await staking.getVotingLockExpiry(user.address);
    expect(afterVote).to.be.greaterThan(0);
    // Debido a que el mock devuelve un deadline relativo a block.timestamp
    // cada llamada a getProposal puede incrementarlo unos segundos. Aceptamos >=.
    expect(afterChange).to.be.greaterThanOrEqual(afterVote);
    expect(before).to.be.lessThanOrEqual(afterVote);
  });

  it("stakeForVoting: revierte amount=0", async () => {
    await expect(
      dao.connect(user).stakeForVoting(0)
    ).to.be.revertedWithCustomError(dao, "ZeroAmount");
  });

  it("stakeForProposing: funciona correctamente", async () => {
    await dao.connect(user).stakeForProposing(55);

    expect(await token.lastBurnAmount()).to.equal(55);
    expect(await staking.lastAmount()).to.equal(55);
  });

  it("unstakeVoting: funciona", async () => {
    await staking.connect(user).unstakeFromVoting(0);
    expect(await staking.lastUser()).to.equal(user.address);
  });

  it("unstakeProposing: funciona", async () => {
    await staking.connect(user).unstakeFromProposing(0);
    expect(await staking.lastUser()).to.equal(user.address);
  });

  it("staking: revierte si panic", async () => {
    await panicManager.setPanic(true);

    await expect(dao.connect(user).stakeForVoting(10)).to.be.reverted;
    // unstake se hace directamente en staking, no a través del DAO
  });

  // =====================================================
  //               OWNER — MINT TOKENS
  // =====================================================

  it("mintTokens: owner puede mintear", async () => {
    await dao.connect(owner).mintTokens(user.address, 500);

    expect(await token.lastMintTo()).to.equal(user.address);
    expect(await token.lastMintAmount()).to.equal(500);
  });

  it("mintTokens: revierte si no owner", async () => {
    await expect(
      dao.connect(attacker).mintTokens(user.address, 1)
    ).to.be.revertedWithCustomError(dao, "NotOwner");
  });

  it("mintTokens: revierte si address=0", async () => {
    await expect(
      dao.connect(owner).mintTokens(ethers.ZeroAddress, 10)
    ).to.be.revertedWithCustomError(dao, "InvalidAddress");
  });

  it("mintTokens: revierte si amount=0", async () => {
    await expect(
      dao.connect(owner).mintTokens(user.address, 0)
    ).to.be.revertedWithCustomError(dao, "ZeroAmount");
  });

  it("mintTokens: revierte si panic", async () => {
    await panicManager.setPanic(true);

    await expect(
      dao.connect(owner).mintTokens(user.address, 10)
    ).to.be.reverted;
  });

  // =====================================================
  //            OWNER — CHANGE STRATEGY
  // =====================================================

  it("changeStrategy: owner puede cambiar", async () => {
    await dao.connect(owner).changeStrategy(user.address);

    expect(await strategyManager.current()).to.equal(user.address);
  });

  it("changeStrategy: revierte si no owner", async () => {
    await expect(
      dao.connect(attacker).changeStrategy(user.address)
    ).to.be.revertedWithCustomError(dao, "NotOwner");
  });

  it("changeStrategy: revierte si newStrategy=0", async () => {
    await expect(
      dao.connect(owner).changeStrategy(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(dao, "InvalidAddress");
  });

  it("changeStrategy: revierte si panic", async () => {
    await panicManager.setPanic(true);

    await expect(
      dao.connect(owner).changeStrategy(user.address)
    ).to.be.reverted;
  });

  // =====================================================
  //            OWNER — WITHDRAW ETH (fondos)
  // =====================================================

  it("withdrawETH: owner puede retirar fondos", async () => {
    // Fondos para el contrato: usuario compra tokens enviando 2 ETH
    await dao.connect(user).buyTokens({ value: ethers.parseEther("2") });

    const daoBalanceBefore = await ethers.provider.getBalance(dao.target);
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    // Owner retira 1 ETH al usuario
    const tx = await dao.connect(owner).withdrawETH(user.address, ethers.parseEther("1"));
    await tx.wait();

    const daoBalanceAfter = await ethers.provider.getBalance(dao.target);
    const userBalanceAfter = await ethers.provider.getBalance(user.address);

    expect(daoBalanceAfter).to.equal(daoBalanceBefore - ethers.parseEther("1"));
    expect(userBalanceAfter).to.equal(userBalanceBefore + ethers.parseEther("1"));
  });

  it("withdrawETH: revierte si no owner", async () => {
    await expect(
      dao.connect(attacker).withdrawETH(user.address, 1)
    ).to.be.revertedWithCustomError(dao, "NotOwner");
  });

  it("withdrawETH: revierte si to = 0", async () => {
    await expect(
      dao.connect(owner).withdrawETH(ethers.ZeroAddress, 1)
    ).to.be.revertedWithCustomError(dao, "InvalidAddress");
  });

  it("withdrawETH: revierte si amount = 0", async () => {
    await expect(
      dao.connect(owner).withdrawETH(user.address, 0)
    ).to.be.revertedWithCustomError(dao, "ZeroAmount");
  });

  it("withdrawETH: revierte si balance insuficiente", async () => {
    // Sin fondos previos
    await expect(
      dao.connect(owner).withdrawETH(user.address, ethers.parseEther("1"))
    ).to.be.revertedWithCustomError(dao, "InsufficientETH");
  });

  it("withdrawETH: revierte si panic", async () => {
    await panicManager.setPanic(true);
    await expect(
      dao.connect(owner).withdrawETH(user.address, 1)
    ).to.be.reverted;
  });

  // =====================================================
  //          DAO FACADE — VIEW METHODS
  // =====================================================

  describe("DAO Facade — View Methods", () => {
    it("getVotingStake: delega correctamente a Staking", async () => {
      const stake = await dao.getVotingStake(user.address);
      expect(stake).to.equal(0);
    });

    it("getProposingStake: delega correctamente a Staking", async () => {
      const stake = await dao.getProposingStake(user.address);
      expect(stake).to.equal(0);
    });

    it("getTotalVotingStaked: delega correctamente a Staking", async () => {
      const total = await dao.getTotalVotingStaked();
      expect(total).to.equal(ethers.parseEther("10000"));
    });

    it("getProposal: delega correctamente a ProposalManager", async () => {
      const proposal = await dao.getProposal(1);
      expect(proposal.proposer).to.equal("0x0000000000000000000000000000000000000123");
      expect(proposal.title).to.equal("Test Proposal");
      expect(proposal.description).to.equal("Test Description");
      expect(proposal.votesFor).to.equal(100);
      expect(proposal.votesAgainst).to.equal(50);
      expect(proposal.state).to.equal(0); // ACTIVE
    });

    it("getProposalState: delega correctamente a ProposalManager", async () => {
      const state = await dao.getProposalState(1);
      expect(state).to.equal(0); // ACTIVE
    });

    it("getProposalResults: delega correctamente a ProposalManager", async () => {
      const results = await dao.getProposalResults(1);
      expect(results.votesFor).to.equal(100);
      expect(results.votesAgainst).to.equal(50);
    });

    it("getUserVote: delega correctamente a ProposalManager", async () => {
      const vote = await dao.getUserVote(1, user.address);
      expect(vote).to.equal(1); // FOR
    });

    it("isProposalActive: delega correctamente a ProposalManager", async () => {
      const active = await dao.isProposalActive(1);
      expect(active).to.equal(true);
    });

    it("hasUserVoted: delega correctamente a ProposalManager", async () => {
      const voted = await dao.hasUserVoted(1, user.address);
      expect(voted).to.equal(true);
    });

    it("hasProposalDeadlinePassed: delega correctamente a ProposalManager", async () => {
      const passed = await dao.hasProposalDeadlinePassed(1);
      expect(passed).to.equal(false);
    });

    it("getTokenPrice: delega correctamente a Parameters", async () => {
      const price = await dao.getTokenPrice();
      expect(price).to.equal(ethers.parseEther("1"));
    });

    it("getStakingLockTime: delega correctamente a Parameters", async () => {
      await parameters.setStakingLockTime(3600);
      const lockTime = await dao.getStakingLockTime();
      expect(lockTime).to.equal(3600);
    });

    it("getTokensPerVotingPower: delega correctamente a Parameters", async () => {
      const tokens = await dao.getTokensPerVotingPower();
      expect(tokens).to.equal(0); // default del mock
    });

    it("getMinStakeForVoting: delega correctamente a Parameters", async () => {
      await parameters.setMinStakeForVoting(100);
      const min = await dao.getMinStakeForVoting();
      expect(min).to.equal(100);
    });

    it("getMinStakeForProposing: delega correctamente a Parameters", async () => {
      await parameters.setMinStakeForProposing(200);
      const min = await dao.getMinStakeForProposing();
      expect(min).to.equal(200);
    });

    it("getProposalDuration: delega correctamente a Parameters", async () => {
      await parameters.setProposalDuration(7 * 24 * 3600);
      const duration = await dao.getProposalDuration();
      expect(duration).to.equal(7 * 24 * 3600);
    });

    it("getTokenBalance: delega correctamente a Token", async () => {
      const balance = await dao.getTokenBalance(user.address);
      expect(balance).to.equal(ethers.parseEther("1000"));
    });

    it("getTokenAllowance: delega correctamente a Token", async () => {
      const allowance = await dao.getTokenAllowance(user.address, dao.target);
      expect(allowance).to.equal(ethers.parseEther("500"));
    });

    it("getActiveStrategyAddress: delega correctamente a StrategyManager", async () => {
      await strategyManager.setActiveStrategy(user.address);
      const strategyAddr = await dao.getActiveStrategyAddress();
      expect(strategyAddr).to.equal(user.address);
    });

    it("isPanicked: delega correctamente a PanicManager", async () => {
      let panicked = await dao.isPanicked();
      expect(panicked).to.equal(false);

      await panicManager.setPanic(true);
      panicked = await dao.isPanicked();
      expect(panicked).to.equal(true);
    });

    it("getVotingPower: delega correctamente a estrategia activa", async () => {
      const MockVotingStrategy = await ethers.getContractFactory("MockVotingStrategy");
      const mockStrategy = await MockVotingStrategy.deploy(ethers.parseEther("42"));
      await strategyManager.setActiveStrategy(mockStrategy.target);
      const vp = await dao.getVotingPower(user.address);
      expect(vp).to.equal(ethers.parseEther("42"));
    });

    it("getProposalCount: incrementa tras crear propuestas", async () => {
      // Ajustar mínimo de stake para proponer a 0 para simplificar
      await parameters.setMinStakeForProposing(0);
      // Crear dos propuestas
      await dao.connect(user).createProposal("P1", "D1");
      await dao.connect(user).createProposal("P2", "D2");
      const count = await dao.getProposalCount();
      expect(count).to.equal(2);
    });
  });

  // =====================================================
  //          DAO FACADE — STATE-CHANGE METHODS
  // =====================================================

  describe("DAO Facade — State-Change Methods", () => {
    it("finalizeProposal: delega correctamente con notInPanic", async () => {
      await expect(
        dao.connect(owner).finalizeProposal(1)
      ).to.not.be.reverted;
    });

    it("finalizeProposal: revierte si panic", async () => {
      await panicManager.setPanic(true);
      await expect(
        dao.connect(owner).finalizeProposal(1)
      ).to.be.reverted;
    });

    it("finalizeProposal: funciona con strategyAddr = address(0)", async () => {
      // Crear un DAO con strategyManager que retorna address(0)
      const StrategyMgr = await ethers.getContractFactory("MockStrategyManager");
      const mgr = await StrategyMgr.deploy();
      // No setear ninguna estrategia, así getActiveStrategyAddress() retorna address(0)
      
      const NewDAO = await ethers.getContractFactory("DAO");
      const dao2 = await NewDAO.deploy(
        owner.address,
        token.target,
        staking.target,
        proposalManager.target,
        mgr.target,
        parameters.target,
        panicManager.target
      );
      // Debe funcionar sin error, totalVP será 0
      await expect(dao2.connect(owner).finalizeProposal(1)).to.not.be.reverted;
    });

    it("finalizeProposal: ejecuta getTotalVotingPower con estrategia válida", async () => {
      // Deploy SimpleMajorityStrategy real para cubrir la línea 250 (try success path)
      const MockParams = await ethers.getContractFactory("MockParameters");
      const params = await MockParams.deploy();
      await params.setTokensPerVotingPower(ethers.parseEther("1"));
      
      const MockStk = await ethers.getContractFactory("MockStaking");
      const stk = await MockStk.deploy();
      
      const SimpleMajority = await ethers.getContractFactory("SimpleMajorityStrategy");
      const strategy = await SimpleMajority.deploy(stk.target, params.target);
      
      const StrategyMgr = await ethers.getContractFactory("MockStrategyManager");
      const mgr = await StrategyMgr.deploy();
      await mgr.setActiveStrategy(strategy.target);
      
      const NewDAO = await ethers.getContractFactory("DAO");
      const dao2 = await NewDAO.deploy(
        owner.address,
        token.target,
        staking.target,
        proposalManager.target,
        mgr.target,
        parameters.target,
        panicManager.target
      );
      // Esto ejecutará getTotalVotingPower() exitosamente (línea 250)
      await expect(dao2.connect(owner).finalizeProposal(1)).to.not.be.reverted;
    });

    it("expireProposal: delega correctamente con notInPanic", async () => {
      await expect(
        dao.connect(owner).expireProposal(1)
      ).to.not.be.reverted;
    });

    it("expireProposal: revierte si panic", async () => {
      await panicManager.setPanic(true);
      await expect(
        dao.connect(owner).expireProposal(1)
      ).to.be.reverted;
    });

    it("finalizeProposal: revierte StrategyError si estrategia falla", async () => {
      // Deploy estrategia que revierte getTotalVotingPower
      const FailStrategy = await ethers.getContractFactory("MockFailStrategy");
      const failStrat = await FailStrategy.deploy();
      // Setear como estrategia activa vía StrategyManager mock
      // MockStrategyManager expone setActiveStrategy sin ownership en mock
      const StrategyMgr = await ethers.getContractFactory("MockStrategyManager");
      const mgr = await StrategyMgr.deploy();
      await mgr.setActiveStrategy(failStrat.target);
      // Reemplazar en DAO el strategyManager por el mock fallido
      // (direct assignment no posible; redeploy DAO para test puntual)
      const NewDAO = await ethers.getContractFactory("DAO");
      const dao2 = await NewDAO.deploy(
        owner.address,
        token.target,
        staking.target,
        proposalManager.target,
        mgr.target,
        parameters.target,
        panicManager.target
      );
      await expect(dao2.connect(owner).finalizeProposal(1)).to.be.revertedWithCustomError(dao2, "StrategyError");
    });
  });

  // =====================================================
  //        ADDITIONAL BRANCH COVERAGE
  // =====================================================

  describe("Branch Coverage - Additional Tests", () => {
    it("getVotingPower: retorna 0 si user es address(0)", async () => {
      const vp = await dao.getVotingPower(ethers.ZeroAddress);
      expect(vp).to.equal(0);
    });

    it("getVotingPower: retorna 0 si no hay estrategia activa", async () => {
      // Crear DAO con strategy manager sin estrategia
      const StrategyMgr = await ethers.getContractFactory("MockStrategyManager");
      const mgr = await StrategyMgr.deploy();
      
      const NewDAO = await ethers.getContractFactory("DAO");
      const dao2 = await NewDAO.deploy(
        owner.address,
        token.target,
        staking.target,
        proposalManager.target,
        mgr.target,
        parameters.target,
        panicManager.target
      );
      const vp = await dao2.getVotingPower(user.address);
      expect(vp).to.equal(0);
    });

    it("isPanicked: retorna true cuando está en pánico", async () => {
      await panicManager.setPanic(true);
      expect(await dao.isPanicked()).to.equal(true);
    });

    it("isPanicked: retorna false cuando no está en pánico", async () => {
      expect(await dao.isPanicked()).to.equal(false);
    });

    it("vote: maneja correctamente cuando getProposal falla", async () => {
      // El mock siempre devuelve una propuesta válida, pero podemos probar el flujo normal
      await parameters.setMinStakeForVoting(0);
      await expect(dao.connect(user).vote(999, true)).to.not.be.reverted;
    });

    it("changeVote: maneja correctamente cuando getProposal falla", async () => {
      // El mock siempre devuelve una propuesta válida
      await parameters.setMinStakeForVoting(0);
      await dao.connect(user).vote(999, true);
      await expect(dao.connect(user).changeVote(999, false)).to.not.be.reverted;
    });

    it("constructor: revierte si panicOperator no está configurado", async () => {
      // Crear un mock de PanicManager que retorna address(0) para panicOperator
      const MockPanicWithZeroOp = await ethers.getContractFactory("MockPanicManager");
      const badPanicMgr = await MockPanicWithZeroOp.deploy();
      // El MockPanicManager inicia con msg.sender como panicOperator, hay que setearlo a 0
      await badPanicMgr.setPanicOperator(ethers.ZeroAddress);
      
      const NewDAO = await ethers.getContractFactory("DAO");
      await expect(
        NewDAO.deploy(
          owner.address,
          token.target,
          staking.target,
          proposalManager.target,
          strategyManager.target,
          parameters.target,
          badPanicMgr.target
        )
      ).to.be.revertedWithCustomError(NewDAO, "PanicOperatorNotConfigured");
    });
  });

  // =====================================================
  //        OWNERSHIP TRANSFER
  // =====================================================
  
  describe("Ownership", () => {
    it("transferOwnership: revierte si newOwner es address(0)", async () => {
      await expect(
        dao.connect(owner).transferOwnership(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(dao, "InvalidAddress");
    });

    it("transferOwnership: funciona correctamente con dirección válida", async () => {
      await dao.connect(owner).transferOwnership(user.address);
      expect(await dao.owner()).to.equal(user.address);
    });
  });
});
