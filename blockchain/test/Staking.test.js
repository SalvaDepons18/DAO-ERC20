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

  // --------------------------------------------------------------
  // Constructor
  // --------------------------------------------------------------
  describe("Constructor", () => {
    it("Debe revertir si token es address(0)", async () => {
      await expect(
        Staking.deploy(ethers.ZeroAddress, parameters.target)
      ).to.be.revertedWithCustomError(staking, "InvalidAddress");
    });

    it("Debe revertir si parameters es address(0)", async () => {
      await expect(
        Staking.deploy(sha.target, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(staking, "InvalidAddress");
    });

    it("Debe inicializar correctamente token y parameters", async () => {
      expect(await staking.token()).to.equal(sha.target);
      expect(await staking.parameters()).to.equal(parameters.target);
    });
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

  // --------------------------------------------------------------
  // extendVotingLock — pruebas de autorización y comportamiento
  // --------------------------------------------------------------
  describe("extendVotingLock", () => {
    beforeEach(async () => {
      await sha.connect(user).approve(staking.target, 1000);
      await staking.connect(user).stakeForVoting(1000);
    });

    it("Debe revertir si llama alguien que no es daoController", async () => {
      const currentLock = await staking.lockedUntilVoting(user.address);
      await expect(
        staking.connect(user).extendVotingLock(user.address, currentLock + 500n)
      ).to.be.revertedWithCustomError(staking, "NotAuthorized");
    });

    it("Extiende el lock si newUnlockTime es mayor", async () => {
      const oldLock = await staking.lockedUntilVoting(user.address);
      await staking.connect(owner).setDaoController(user2.address);
      await staking.connect(user2).extendVotingLock(user.address, oldLock + 500n);
      const newLock = await staking.lockedUntilVoting(user.address);
      expect(newLock).to.equal(oldLock + 500n);
    });

    it("No reduce el lock si newUnlockTime es menor", async () => {
      const oldLock = await staking.lockedUntilVoting(user.address);
      await staking.connect(owner).setDaoController(user2.address);
      await staking.connect(user2).extendVotingLock(user.address, oldLock - 10n);
      const after = await staking.lockedUntilVoting(user.address);
      expect(after).to.equal(oldLock);
    });

    it("Mantiene el lock si newUnlockTime == lock actual", async () => {
      const oldLock = await staking.lockedUntilVoting(user.address);
      await staking.connect(owner).setDaoController(user2.address);
      await staking.connect(user2).extendVotingLock(user.address, oldLock);
      const after = await staking.lockedUntilVoting(user.address);
      expect(after).to.equal(oldLock);
    });
  });

  // --------------------------------------------------------------
  // setParameters
  // --------------------------------------------------------------
  describe("setParameters", () => {
    it("Debe permitir al owner cambiar la dirección de Parameters", async () => {
      const newParams = await Parameters.deploy(owner.address);
      await newParams.waitForDeployment();

      await expect(staking.connect(owner).setParameters(newParams.target))
        .to.emit(staking, "ParametersUpdated")
        .withArgs(parameters.target, newParams.target);

      expect(await staking.parameters()).to.equal(newParams.target);
    });

    it("Debe revertir si newParameters es address(0)", async () => {
      await expect(
        staking.connect(owner).setParameters(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(staking, "InvalidAddress");
    });

    it("Debe revertir si no es el owner", async () => {
      const newParams = await Parameters.deploy(owner.address);
      await newParams.waitForDeployment();

      await expect(
        staking.connect(user).setParameters(newParams.target)
      ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });
  });

  // --------------------------------------------------------------
  // getVotingLockExpiry
  // --------------------------------------------------------------
  describe("getVotingLockExpiry", () => {
    it("Debe retornar 0 si el usuario no ha stakeado", async () => {
      expect(await staking.getVotingLockExpiry(user.address)).to.equal(0);
    });

    it("Debe retornar el timestamp de expiración correcto después de stakear", async () => {
      await sha.connect(user).approve(staking.target, 1000);
      const tx = await staking.connect(user).stakeForVoting(1000);
      const block = await ethers.provider.getBlock(tx.blockNumber);
      
      const expiry = await staking.getVotingLockExpiry(user.address);
      expect(expiry).to.equal(block.timestamp + LOCK_TIME);
    });
  });

  // --------------------------------------------------------------
  // stakeForVotingFrom - pruebas de la función delegada
  // --------------------------------------------------------------
  describe("stakeForVotingFrom", () => {
    it("Debe stakear tokens para otro usuario", async () => {
      const initialStake = await staking.votingStake(user.address);
      expect(initialStake).to.equal(0);

      await staking.connect(owner).stakeForVotingFrom(user.address, 500);

      expect(await staking.votingStake(user.address)).to.equal(500);
    });

    it("Debe actualizar el lock del usuario destino", async () => {
      const tx = await staking.connect(owner).stakeForVotingFrom(user.address, 500);
      const block = await ethers.provider.getBlock(tx.blockNumber);

      expect(await staking.lockedUntilVoting(user.address))
        .to.equal(block.timestamp + LOCK_TIME);
    });

    it("Debe incrementar totalVotingStaked", async () => {
      const before = await staking.totalVotingStaked();
      await staking.connect(owner).stakeForVotingFrom(user.address, 300);
      const after = await staking.totalVotingStaked();
      expect(after).to.equal(before + 300n);
    });

    it("Debe emitir evento StakedForVoting con los datos correctos", async () => {
      await expect(staking.connect(owner).stakeForVotingFrom(user.address, 400))
        .to.emit(staking, "StakedForVoting");
    });

    it("Debe revertir si amount es 0", async () => {
      await expect(
        staking.connect(owner).stakeForVotingFrom(user.address, 0)
      ).to.be.revertedWithCustomError(staking, "InvalidAmount");
    });
  });

  // --------------------------------------------------------------
  // stakeForProposingFrom - pruebas de la función delegada
  // --------------------------------------------------------------
  describe("stakeForProposingFrom", () => {
    it("Debe stakear tokens para proponer para otro usuario", async () => {
      const initialStake = await staking.proposalStake(user.address);
      expect(initialStake).to.equal(0);

      await staking.connect(owner).stakeForProposingFrom(user.address, 600);

      expect(await staking.proposalStake(user.address)).to.equal(600);
    });

    it("Debe actualizar el lock de proposing del usuario destino", async () => {
      const tx = await staking.connect(owner).stakeForProposingFrom(user.address, 600);
      const block = await ethers.provider.getBlock(tx.blockNumber);

      expect(await staking.lockedUntilProposing(user.address))
        .to.equal(block.timestamp + LOCK_TIME);
    });

    it("Debe incrementar totalProposalStaked", async () => {
      const before = await staking.totalProposalStaked();
      await staking.connect(owner).stakeForProposingFrom(user.address, 700);
      const after = await staking.totalProposalStaked();
      expect(after).to.equal(before + 700n);
    });

    it("Debe emitir evento StakedForProposing con los datos correctos", async () => {
      await expect(staking.connect(owner).stakeForProposingFrom(user.address, 800))
        .to.emit(staking, "StakedForProposing");
    });

    it("Debe revertir si amount es 0", async () => {
      await expect(
        staking.connect(owner).stakeForProposingFrom(user.address, 0)
      ).to.be.revertedWithCustomError(staking, "InvalidAmount");
    });
  });

  // --------------------------------------------------------------
  // setDaoController
  // --------------------------------------------------------------
  describe("setDaoController", () => {
    it("Debe permitir al owner establecer el daoController", async () => {
      await staking.connect(owner).setDaoController(user.address);
      expect(await staking.daoController()).to.equal(user.address);
    });

    it("Debe revertir si newDao es address(0)", async () => {
      await expect(
        staking.connect(owner).setDaoController(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(staking, "InvalidAddress");
    });

    it("Debe revertir si no es el owner", async () => {
      await expect(
        staking.connect(user).setDaoController(user2.address)
      ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });
  });

  // --------------------------------------------------------------
  // totalVotingStaked and totalProposalStaked
  // --------------------------------------------------------------
  describe("Total stakes", () => {
    it("totalVotingStaked debe actualizarse correctamente", async () => {
      expect(await staking.totalVotingStaked()).to.equal(0);

      await sha.connect(user).approve(staking.target, 1000);
      await staking.connect(user).stakeForVoting(1000);
      
      expect(await staking.totalVotingStaked()).to.equal(1000);

      await sha.connect(user2).approve(staking.target, 500);
      await staking.connect(user2).stakeForVoting(500);
      
      expect(await staking.totalVotingStaked()).to.equal(1500);
    });

    it("totalProposalStaked debe actualizarse correctamente", async () => {
      expect(await staking.totalProposalStaked()).to.equal(0);

      await sha.connect(user).approve(staking.target, 2000);
      await staking.connect(user).stakeForProposing(2000);
      
      expect(await staking.totalProposalStaked()).to.equal(2000);

      await sha.connect(user2).approve(staking.target, 1000);
      await staking.connect(user2).stakeForProposing(1000);
      
      expect(await staking.totalProposalStaked()).to.equal(3000);
    });
  });

  // --------------------------------------------------------------
  // Branch Coverage - Additional Tests
  // --------------------------------------------------------------
  describe("Branch Coverage - Additional Tests", () => {
    it("stakeForVoting con diferentes montos debe funcionar", async () => {
      await sha.connect(user).approve(staking.target, 5000);
      await staking.connect(user).stakeForVoting(1000);
      await staking.connect(user).stakeForVoting(2000);
      expect(await staking.votingStake(user.address)).to.equal(3000);
    });

    it("stakeForProposing con diferentes montos debe funcionar", async () => {
      await sha.connect(user).approve(staking.target, 5000);
      await staking.connect(user).stakeForProposing(1000);
      await staking.connect(user).stakeForProposing(2000);
      expect(await staking.proposalStake(user.address)).to.equal(3000);
    });

    it("unstakeFromVoting parcial debe funcionar", async () => {
      await sha.connect(user).approve(staking.target, 1000);
      await staking.connect(user).stakeForVoting(1000);

      await ethers.provider.send("evm_increaseTime", [LOCK_TIME + 1]);
      await ethers.provider.send("evm_mine");

      await staking.connect(user).unstakeFromVoting(400);
      expect(await staking.votingStake(user.address)).to.equal(600);

      await staking.connect(user).unstakeFromVoting(600);
      expect(await staking.votingStake(user.address)).to.equal(0);
    });

    it("unstakeFromProposing parcial debe funcionar", async () => {
      await sha.connect(user).approve(staking.target, 1000);
      await staking.connect(user).stakeForProposing(1000);

      await ethers.provider.send("evm_increaseTime", [LOCK_TIME + 1]);
      await ethers.provider.send("evm_mine");

      await staking.connect(user).unstakeFromProposing(300);
      expect(await staking.proposalStake(user.address)).to.equal(700);

      await staking.connect(user).unstakeFromProposing(700);
      expect(await staking.proposalStake(user.address)).to.equal(0);
    });

    it("Múltiples usuarios staking simultáneo", async () => {
      await sha.connect(user).approve(staking.target, 500);
      await sha.connect(user2).approve(staking.target, 800);

      await staking.connect(user).stakeForVoting(500);
      await staking.connect(user2).stakeForVoting(800);

      expect(await staking.totalVotingStaked()).to.equal(1300);
      expect(await staking.votingStake(user.address)).to.equal(500);
      expect(await staking.votingStake(user2.address)).to.equal(800);
    });

    it("setVotingLock y setProposingLock solo owner", async () => {
      await expect(
        staking.connect(user).setVotingLock(0)
      ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");

      await expect(
        staking.connect(user).setProposingLock(0)
      ).to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });

    it("stakeForVotingFrom con múltiples llamadas", async () => {
      await staking.connect(owner).stakeForVotingFrom(user.address, 100);
      await staking.connect(owner).stakeForVotingFrom(user.address, 200);
      expect(await staking.votingStake(user.address)).to.equal(300);
    });

    it("stakeForProposingFrom con múltiples llamadas", async () => {
      await staking.connect(owner).stakeForProposingFrom(user.address, 150);
      await staking.connect(owner).stakeForProposingFrom(user.address, 250);
      expect(await staking.proposalStake(user.address)).to.equal(400);
    });

    it("lockedUntilProposing debe actualizarse al stakear", async () => {
      expect(await staking.lockedUntilProposing(user.address)).to.equal(0);

      await sha.connect(user).approve(staking.target, 500);
      const tx = await staking.connect(user).stakeForProposing(500);
      const block = await ethers.provider.getBlock(tx.blockNumber);

      expect(await staking.lockedUntilProposing(user.address)).to.equal(block.timestamp + LOCK_TIME);
    });
  });

});
