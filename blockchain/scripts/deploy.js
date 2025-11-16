async function main() {
  const DAO = await ethers.deployContract("DAO");
  await DAO.waitForDeployment();
  console.log("DAO deployed at:", DAO.target);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
