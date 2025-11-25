const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Staking", function () {

  let ShaCoin, sha, Staking, staking, Parameters, parameters;
  let owner, user, user2;

  const LOCK_TIME = 1000;

  beforeEach(async () => {
    [owner, user, user2] = await ethers.getSigners();

    // Deploy token
    ShaCoin = await ethers.getContractFactory("ShaCoin");
    sha = await ShaCoin.deploy(owner.address);
    await sha.waitForDeployment();

    await sha.connect(owner).mint(user.address, 10_000);
    await sha.connect(owner).mint(user2.address, 10_000);

    // Deploy Parameters
    Parameters = await ethers.getContractFactory("Parameters");
    parameters = await Parameters.deploy(owner.address);
    await parameters.waitForDeployment();

    // Deploy Staking
    Staking = await ethers.getContractFactory("Staking");
    staking = await Staking.deploy(
      sha.target,
      parameters.target
    );
    await staking.waitForDeployment();

    // Configure global staking lock time in Parameters
    await parameters.connect(owner).setStakingLockTime(LOCK_TIME);
    // Refresh local caches for visibility (events/UI)
    await staking.connect(owner).setVotingLock(0);
    await staking.connect(owner).setProposingLock(0);
  });

  it("Debe setear correctamente los locks", async () => {
    expect(await staking.votingLock()).to.equal(LOCK_TIME);
    expect(await staking.proposingLock()).to.equal(LOCK_TIME);
  });

  it("Debe setear correctamente el token", async () => {
    expect(await staking.token()).to.equal(sha.target);
  });

  it("Un usuario puede stakear para votar", async () => {
    await sha.connect(user).approve(staking.target, 1000);

    await staking.connect(user).stakeForVoting(1000);

    expect(await staking.votingStake(user.address)).to.equal(1000);
  });

  it("Debe revertir si no hiciste approve antes de stakeForVoting", async () => {
    await expect(
      staking.connect(user).stakeForVoting(1000)
    ).to.be.reverted;
  });

  it("Debe setear correctamente el lock de voting", async () => {
    await sha.connect(user).approve(staking.target, 1000);
    
    const tx = await staking.connect(user).stakeForVoting(1000);
    const block = await ethers.provider.getBlock(tx.blockNumber);

    expect(await staking.lockedUntilVoting(user.address))
      .to.equal(block.timestamp + LOCK_TIME);
  });

  it("Debe revertir si el amount de stakeForVoting es 0", async () => {
    await expect(
      staking.connect(user).stakeForVoting(0)
    ).to.be.revertedWithCustomError(staking, "InvalidAmount");
  });

  it("Un usuario no puede des-stakear antes del lock", async () => {
    await sha.connect(user).approve(staking.target, 1000);
    await staking.connect(user).stakeForVoting(1000);

    await expect(
      staking.connect(user).unstakeFromVoting(1000)
    ).to.be.revertedWithCustomError(staking, "StakeLocked");
  });

  it("Un usuario puede des-stakear después del lock", async () => {
    await sha.connect(user).approve(staking.target, 1000);
    await staking.connect(user).stakeForVoting(1000);

    await ethers.provider.send("evm_increaseTime", [LOCK_TIME + 1]);
    await ethers.provider.send("evm_mine");

    await staking.connect(user).unstakeFromVoting(1000);

    expect(await staking.votingStake(user.address)).to.equal(0);
    expect(await sha.balanceOf(user.address)).to.equal(10_000);
  });

  it("Debe revertir si intenta unstakear más de lo que tiene", async () => {
    await sha.connect(user).approve(staking.target, 500);
    await staking.connect(user).stakeForVoting(500);

    await ethers.provider.send("evm_increaseTime", [LOCK_TIME + 1]);
    await ethers.provider.send("evm_mine");

    await expect(
      staking.connect(user).unstakeFromVoting(1000)
    ).to.be.revertedWithCustomError(staking, "InsufficientStake");
  });

  it("Un usuario puede stakear para proponer", async () => {
    await sha.connect(user).approve(staking.target, 2000);
    await staking.connect(user).stakeForProposing(2000);

    expect(await staking.proposalStake(user.address)).to.equal(2000);
  });

  it("Debe setear correctamente el lock de proposing", async () => {
    await sha.connect(user).approve(staking.target, 2000);

    const tx = await staking.connect(user).stakeForProposing(2000);
    const block = await ethers.provider.getBlock(tx.blockNumber);

    expect(await staking.lockedUntilProposing(user.address))
      .to.equal(block.timestamp + LOCK_TIME);
  });

  it("Debe revertir si amount de stakeForProposing es 0", async () => {
    await expect(
      staking.connect(user).stakeForProposing(0)
    ).to.be.revertedWithCustomError(staking, "InvalidAmount");
  });

  it("Unstake de proponing debe respetar el lock", async () => {
    await sha.connect(user).approve(staking.target, 3000);
    await staking.connect(user).stakeForProposing(3000);

    await expect(
      staking.connect(user).unstakeFromProposing(3000)
    ).to.be.revertedWithCustomError(staking, "StakeLocked");
  });

  it("Un usuario puede des-stakear proposer después del lock", async () => {
    await sha.connect(user).approve(staking.target, 3000);
    await staking.connect(user).stakeForProposing(3000);

    await ethers.provider.send("evm_increaseTime", [LOCK_TIME + 1]);
    await ethers.provider.send("evm_mine");

    await staking.connect(user).unstakeFromProposing(3000);

    expect(await staking.proposalStake(user.address)).to.equal(0);
    expect(await sha.balanceOf(user.address)).to.equal(10_000);
  });

  it("Debe revertir si intenta des-stakear más de lo que tiene en proposing", async () => {
    await sha.connect(user).approve(staking.target, 1000);
    await staking.connect(user).stakeForProposing(1000);

    await ethers.provider.send("evm_increaseTime", [LOCK_TIME + 1]);
    await ethers.provider.send("evm_mine");

    await expect(
      staking.connect(user).unstakeFromProposing(2000)
    ).to.be.revertedWithCustomError(staking, "InsufficientStake");
  });

  it("Emite eventos al actualizar locks desde Parameters", async () => {
    // change parameter and refresh locks, expect events with old/new values
    const NEW_LOCK = 2000;
    await parameters.connect(owner).setStakingLockTime(NEW_LOCK);

    await expect(staking.connect(owner).setVotingLock(999))
      .to.emit(staking, "VotingLockUpdated").withArgs(LOCK_TIME, NEW_LOCK);

    await expect(staking.connect(owner).setProposingLock(123))
      .to.emit(staking, "ProposingLockUpdated").withArgs(LOCK_TIME, NEW_LOCK);

    expect(await staking.votingLock()).to.equal(NEW_LOCK);
    expect(await staking.proposingLock()).to.equal(NEW_LOCK);
  });

  it("getVotingStake debe retornar correctamente", async () => {
    await sha.connect(user).approve(staking.target, 500);
    await staking.connect(user).stakeForVoting(500);

    expect(await staking.getVotingStake(user.address)).to.equal(500);
  });

  it("getProposingStake debe retornar correctamente", async () => {
    await sha.connect(user).approve(staking.target, 400);
    await staking.connect(user).stakeForProposing(400);

    expect(await staking.getProposingStake(user.address)).to.equal(400);
  });

});
