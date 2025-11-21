const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PanicManager", function () {
  let PanicManager, panicManager;
  let dao, panicOperator, other, newOperator;

  beforeEach(async function () {
    [dao, panicOperator, other, newOperator] = await ethers.getSigners();

    PanicManager = await ethers.getContractFactory("PanicManager");
    panicManager = await PanicManager.deploy(
      dao.address,
      panicOperator.address
    );
    await panicManager.waitForDeployment();
  });

  describe("Constructor", function () {
    it("Setea valores iniciales correctamente", async function () {
      expect(await panicManager.dao()).to.equal(dao.address);
      expect(await panicManager.panicOperator()).to.equal(
        panicOperator.address
      );
      expect(await panicManager.isPanicked()).to.equal(false);
    });

    it("Revert si alguna address es zero", async function () {
      const ZERO = ethers.ZeroAddress;

      await expect(
        PanicManager.deploy(ZERO, panicOperator.address)
      ).to.be.revertedWithCustomError(panicManager, "InvalidAddress");

      await expect(PanicManager.deploy(dao.address, ZERO)).to.be.revertedWithCustomError(
        panicManager,
        "InvalidAddress"
      );
    });
  });

  describe("setPanicOperator", function () {
    it("DAO puede cambiar operador", async function () {
      await expect(panicManager.setPanicOperator(newOperator.address))
        .to.emit(panicManager, "PanicOperatorChanged")
        .withArgs(panicOperator.address, newOperator.address);

      expect(await panicManager.panicOperator()).to.equal(
        newOperator.address
      );
    });

    it("Revert si no es DAO", async function () {
      await expect(
        panicManager.connect(other).setPanicOperator(newOperator.address)
      ).to.be.revertedWithCustomError(panicManager, "NotDao");
    });

    it("Revert si newOperator es zero", async function () {
      await expect(
        panicManager.setPanicOperator(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(panicManager, "InvalidAddress");
    });

    it("El viejo operador ya no puede usar panic ni calm", async function () {
      await panicManager.setPanicOperator(newOperator.address);

      await expect(
        panicManager.connect(panicOperator).panic()
      ).to.be.revertedWithCustomError(panicManager, "NotPanicOperator");

      await expect(
        panicManager.connect(panicOperator).calm()
      ).to.be.revertedWithCustomError(panicManager, "NotPanicOperator");
    });

    it("El nuevo operador sí puede usar panic", async function () {
      await panicManager.setPanicOperator(newOperator.address);

      await expect(
        panicManager.connect(newOperator).panic()
      ).to.emit(panicManager, "PanicActivated");
    });
  });

  describe("panic()", function () {
    it("Operador correcto activa pánico", async function () {
      await expect(panicManager.connect(panicOperator).panic())
        .to.emit(panicManager, "PanicActivated")
        .withArgs(panicOperator.address);

      expect(await panicManager.isPanicked()).to.equal(true);
    });

    it("Revert si no es operador", async function () {
      await expect(
        panicManager.connect(other).panic()
      ).to.be.revertedWithCustomError(panicManager, "NotPanicOperator");
    });

    it("Revert si ya está en pánico", async function () {
      await panicManager.connect(panicOperator).panic();

      await expect(
        panicManager.connect(panicOperator).panic()
      ).to.be.revertedWithCustomError(panicManager, "PanicActive");
    });

    it("DAO no puede activar pánico", async function () {
      await expect(
        panicManager.connect(dao).panic()
      ).to.be.revertedWithCustomError(panicManager, "NotPanicOperator");
    });
  });

  describe("calm()", function () {
    it("Operador puede desactivar pánico", async function () {
      await panicManager.connect(panicOperator).panic();

      await expect(panicManager.connect(panicOperator).calm())
        .to.emit(panicManager, "PanicDeactivated")
        .withArgs(panicOperator.address);

      expect(await panicManager.isPanicked()).to.equal(false);
    });

    it("Revert si no es operador", async function () {
      await expect(
        panicManager.connect(other).calm()
      ).to.be.revertedWithCustomError(panicManager, "NotPanicOperator");
    });

    it("Revert si no está en pánico", async function () {
      await expect(
        panicManager.connect(panicOperator).calm()
      ).to.be.revertedWithCustomError(panicManager, "PanicNotActive");
    });

    it("DAO no puede desactivar pánico", async function () {
      await panicManager.connect(panicOperator).panic();

      await expect(
        panicManager.connect(dao).calm()
      ).to.be.revertedWithCustomError(panicManager, "NotPanicOperator");
    });

    it("ciclo completo: panic → calm → panic", async function () {
      await panicManager.connect(panicOperator).panic();
      await panicManager.connect(panicOperator).calm();

      expect(await panicManager.isPanicked()).to.equal(false);

      await expect(
        panicManager.connect(panicOperator).panic()
      ).to.emit(panicManager, "PanicActivated");
    });
  });

  describe("checkNotPanicked", function () {
    it("No revierte cuando no hay pánico", async function () {
      await expect(panicManager.checkNotPanicked()).to.not.be.reverted;
    });

    it("Revierte cuando hay pánico", async function () {
      await panicManager.connect(panicOperator).panic();

      await expect(
        panicManager.checkNotPanicked()
      ).to.be.revertedWithCustomError(panicManager, "PanicActive");
    });

    it("Funciona bien apenas se hace calm()", async function () {
      await panicManager.connect(panicOperator).panic();
      await panicManager.connect(panicOperator).calm();

      await expect(panicManager.checkNotPanicked()).to.not.be.reverted;
    });
  });

  describe("Estado general", function () {
    it("Estado inicial correcto", async function () {
      expect(await panicManager.isPanicked()).to.equal(false);
    });

    it("checkNotPanicked simula una protección real", async function () {
      await panicManager.connect(panicOperator).panic();

      await expect(
        panicManager.checkNotPanicked()
      ).to.be.revertedWithCustomError(panicManager, "PanicActive");
    });
  });
});
