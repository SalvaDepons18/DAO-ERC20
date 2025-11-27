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

  describe("Constructor", () => {
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

    it("Constructor con owner válido inicializa correctamente", async () => {
      const newToken = await ShaCoin.deploy(addr2.address);
      await newToken.waitForDeployment();
      expect(await newToken.owner()).to.equal(addr2.address);
    });
  });

  // ------------------------------------------------------------
  // Mint
  // ------------------------------------------------------------

  describe("Mint", () => {
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

    it("Mint con address válido y amount válido funciona", async () => {
      await sha.connect(owner).mint(addr1.address, 123);
      expect(await sha.balanceOf(addr1.address)).to.equal(123);
    });

    it("Mint sucesivos deben acumular balance", async () => {
      await sha.connect(owner).mint(addr1.address, 100);
      await sha.connect(owner).mint(addr1.address, 200);
      expect(await sha.balanceOf(addr1.address)).to.equal(300);
    });
  });

  // ------------------------------------------------------------
  // Decimals
  // ------------------------------------------------------------

  describe("Decimals", () => {
    it("Debe retornar 18 decimals", async () => {
      expect(await sha.decimals()).to.equal(18);
    });
  });

  // ------------------------------------------------------------
  // ERC20 Standard
  // ------------------------------------------------------------

  describe("ERC20 Standard", () => {
    it("Nombre y símbolo son correctos", async () => {
      expect(await sha.name()).to.equal("ShaCoin");
      expect(await sha.symbol()).to.equal("SHA");
    });

    it("ERC20 transfer funciona correctamente", async () => {
      await sha.connect(owner).mint(addr1.address, 1000);
      await sha.connect(addr1).transfer(addr2.address, 400);
      expect(await sha.balanceOf(addr1.address)).to.equal(600);
      expect(await sha.balanceOf(addr2.address)).to.equal(400);
    });
  });

});
