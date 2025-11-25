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

  it("vote: revierte si panic", async () => {
    await panicManager.setPanic(true);

    await expect(
      dao.connect(user).vote(1, true)
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
    await dao.connect(user).unstakeVoting();
    expect(await staking.lastUser()).to.equal(user.address);
  });

  it("unstakeProposing: funciona", async () => {
    await dao.connect(user).unstakeProposing();
    expect(await staking.lastUser()).to.equal(user.address);
  });

  it("staking: revierte si panic", async () => {
    await panicManager.setPanic(true);

    await expect(dao.connect(user).stakeForVoting(10)).to.be.reverted;
    await expect(dao.connect(user).unstakeVoting()).to.be.reverted;
    await expect(dao.connect(user).unstakeProposing()).to.be.reverted;
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
});
