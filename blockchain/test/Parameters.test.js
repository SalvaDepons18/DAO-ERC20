const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Parameters", function () {
  let Parameters;
  let parameters;
  let owner;
  let other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    Parameters = await ethers.getContractFactory("Parameters");
    parameters = await Parameters.deploy(owner.address);
    await parameters.waitForDeployment();
  });

  // ---------------------------
  // Constructor
  // ---------------------------
  it("Debe setear correctamente el owner", async function () {
    expect(await parameters.owner()).to.equal(owner.address);
  });

  it("Debe revertir si daoOwner es address(0)", async function () {
    const ZERO = ethers.ZeroAddress;
    await expect(Parameters.deploy(ZERO)).to.be.revertedWith(
      "Owner cannot be zero"
    );
  });

  // ---------------------------
  // Modificar tokensPerVotingPower
  // ---------------------------
  it("Owner puede cambiar tokensPerVotingPower", async function () {
    await expect(parameters.setTokensPerVotingPower(100))
      .to.emit(parameters, "TokensPerVotingPowerChanged")
      .withArgs(0, 100);

    expect(await parameters.tokensPerVotingPower()).to.equal(100);
  });

  it("No-owner no puede cambiar tokensPerVotingPower", async function () {
    await expect(
      parameters.connect(other).setTokensPerVotingPower(200)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  // ---------------------------
  // minStakeForVoting
  // ---------------------------
  it("Owner puede cambiar minStakeForVoting", async function () {
    await expect(parameters.setMinStakeForVoting(50))
      .to.emit(parameters, "MinStakeForVotingChanged")
      .withArgs(0, 50);

    expect(await parameters.minStakeForVoting()).to.equal(50);
  });

  it("No-owner no puede cambiar minStakeForVoting", async function () {
    await expect(
      parameters.connect(other).setMinStakeForVoting(123)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  // ---------------------------
  // minStakeForProposing
  // ---------------------------
  it("Owner puede cambiar minStakeForProposing", async function () {
    await expect(parameters.setMinStakeForProposing(70))
      .to.emit(parameters, "MinStakeForProposingChanged")
      .withArgs(0, 70);

    expect(await parameters.minStakeForProposing()).to.equal(70);
  });

  it("No-owner no puede cambiar minStakeForProposing", async function () {
    await expect(
      parameters.connect(other).setMinStakeForProposing(99)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  // ---------------------------
  // stakingLockTime
  // ---------------------------
  it("Owner puede cambiar stakingLockTime", async function () {
    await expect(parameters.setStakingLockTime(86400))
      .to.emit(parameters, "StakingLockTimeChanged")
      .withArgs(0, 86400);

    expect(await parameters.stakingLockTime()).to.equal(86400);
  });

  it("No-owner no puede cambiar stakingLockTime", async function () {
    await expect(
      parameters.connect(other).setStakingLockTime(999)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  // ---------------------------
  // proposalDuration
  // ---------------------------
  it("Owner puede cambiar proposalDuration", async function () {
    await expect(parameters.setProposalDuration(3))
      .to.emit(parameters, "ProposalDurationChanged")
      .withArgs(0, 3);

    expect(await parameters.proposalDuration()).to.equal(3);
  });

  it("No-owner no puede cambiar proposalDuration", async function () {
    await expect(
      parameters.connect(other).setProposalDuration(10)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  // ---------------------------
  // tokenPrice
  // ---------------------------
  it("Owner puede cambiar tokenPrice", async function () {
    await expect(parameters.setTokenPrice(500))
      .to.emit(parameters, "TokenPriceChanged")
      .withArgs(0, 500);

    expect(await parameters.tokenPrice()).to.equal(500);
  });

  it("No-owner no puede cambiar tokenPrice", async function () {
    await expect(
      parameters.connect(other).setTokenPrice(999)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

});