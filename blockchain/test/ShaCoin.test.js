const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ShaCoin", function () {

  let ShaCoin, sha, owner, addr1, addr2;

  beforeEach(async () => {
    [owner, addr1, addr2] = await ethers.getSigners();

    ShaCoin = await ethers.getContractFactory("ShaCoin");
    sha = await ShaCoin.deploy(owner.address);
    await sha.waitForDeployment();
  });

  // ------------------------------------------------------------
  // Constructor
  // ------------------------------------------------------------

  it("Debe setear correctamente el owner en el constructor", async () => {
    expect(await sha.owner()).to.equal(owner.address);
  });

  it("Debe revertir si daoOwner es address(0)", async () => {
    await expect(
      ShaCoin.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(
      ShaCoin,
      "OwnableInvalidOwner"
    );
  });

  // ------------------------------------------------------------
  // Mint
  // ------------------------------------------------------------

  it("El owner puede mintear tokens", async () => {
    await sha.connect(owner).mint(addr1.address, 1000);

    expect(await sha.balanceOf(addr1.address)).to.equal(1000);
  });

  it("Debe revertir si minteás a address 0", async () => {
    await expect(
      sha.connect(owner).mint(ethers.ZeroAddress, 1000)
    ).to.be.revertedWith("Cannot mint to zero address");
  });

  it("Debe revertir si amount es 0", async () => {
    await expect(
      sha.connect(owner).mint(addr1.address, 0)
    ).to.be.revertedWith("Amount must be > 0");
  });

  it("Debe revertir si un no-owner intenta mintear", async () => {
    await expect(
      sha.connect(addr1).mint(addr2.address, 1000)
    ).to.be.revertedWithCustomError(
      sha,
      "OwnableUnauthorizedAccount"
    );
  });

  // ------------------------------------------------------------
  // Decimals
  // ------------------------------------------------------------

  it("Debe retornar 18 decimals", async () => {
    expect(await sha.decimals()).to.equal(18);
  });

});
