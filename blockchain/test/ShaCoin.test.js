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
    ).to.be.revertedWithCustomError(sha, "InvalidAddress");
  });

  it("Debe revertir si amount es 0", async () => {
    await expect(
      sha.connect(owner).mint(addr1.address, 0)
    ).to.be.revertedWithCustomError(sha, "InvalidAmount");
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

  // ------------------------------------------------------------
  // Branch Coverage - Additional Tests
  // ------------------------------------------------------------

  describe("Branch Coverage - Additional Tests", () => {
    it("Mint debe funcionar con direcciones válidas y amounts válidos", async () => {
      // Este test complementa la rama true del if
      await sha.connect(owner).mint(addr1.address, 500);
      expect(await sha.balanceOf(addr1.address)).to.equal(500);

      await sha.connect(owner).mint(addr2.address, 1000);
      expect(await sha.balanceOf(addr2.address)).to.equal(1000);
    });

    it("Constructor con owner válido debe setear correctamente", async () => {
      const newSha = await ShaCoin.deploy(addr1.address);
      await newSha.waitForDeployment();
      expect(await newSha.owner()).to.equal(addr1.address);
    });

    it("Mint sucesivos deben acumular balance", async () => {
      await sha.connect(owner).mint(addr1.address, 100);
      await sha.connect(owner).mint(addr1.address, 200);
      expect(await sha.balanceOf(addr1.address)).to.equal(300);
    });

    it("ERC20 transfer funciona correctamente", async () => {
      await sha.connect(owner).mint(addr1.address, 1000);
      await sha.connect(addr1).transfer(addr2.address, 400);
      expect(await sha.balanceOf(addr1.address)).to.equal(600);
      expect(await sha.balanceOf(addr2.address)).to.equal(400);
    });

    it("Nombre y símbolo son correctos", async () => {
      expect(await sha.name()).to.equal("ShaCoin");
      expect(await sha.symbol()).to.equal("SHA");
    });
  });

});
