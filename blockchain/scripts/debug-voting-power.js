const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  // Cargar direcciones desplegadas
  const addresses = JSON.parse(
    fs.readFileSync("./deployed-addresses.json", "utf8")
  );

  console.log("\n🔍 Debugging Voting Power Issue\n");

  // Obtener contratos
  const dao = await ethers.getContractAt("DAO", addresses.dao);
  const parameters = await ethers.getContractAt("Parameters", addresses.parameters);
  const staking = await ethers.getContractAt("Staking", addresses.staking);
  const strategy = await ethers.getContractAt("SimpleMajorityStrategy", addresses.simpleMajorityStrategy);

  // Obtener signers
  const [deployer, user1] = await ethers.getSigners();
  
  console.log("📊 Parámetros del Sistema:");
  console.log("══════════════════════════");
  
  const tokensPerVP = await parameters.tokensPerVotingPower();
  console.log(`Tokens por poder de voto: ${ethers.formatEther(tokensPerVP)} tokens (${tokensPerVP.toString()} wei)`);
  
  const minStakeVoting = await parameters.minStakeForVoting();
  console.log(`Mínimo stake para votar:  ${ethers.formatEther(minStakeVoting)} tokens (${minStakeVoting.toString()} wei)`);
  
  console.log("\n👤 Estado del Usuario (user1):");
  console.log("══════════════════════════════");
  console.log(`Dirección: ${user1.address}`);
  
  const votingStake = await staking.getVotingStake(user1.address);
  console.log(`Stake de voting:          ${ethers.formatEther(votingStake)} tokens (${votingStake.toString()} wei)`);
  
  const votingPowerFromDAO = await dao.getVotingPower(user1.address);
  console.log(`Poder de voto (vía DAO):  ${votingPowerFromDAO.toString()}`);
  
  const votingPowerFromStrategy = await strategy.calculateVotingPower(user1.address);
  console.log(`Poder de voto (vía Strategy): ${votingPowerFromStrategy.toString()}`);
  
  console.log("\n🧮 Cálculo Manual:");
  console.log("═════════════════");
  console.log(`votingStake = ${votingStake.toString()}`);
  console.log(`tokensPerVP = ${tokensPerVP.toString()}`);
  console.log(`División: ${votingStake.toString()} / ${tokensPerVP.toString()} = ${votingStake / tokensPerVP}`);
  
  // Prueba con deployer si tiene stake
  const deployerVotingStake = await staking.getVotingStake(deployer.address);
  if (deployerVotingStake > 0n) {
    console.log("\n👤 Estado del Deployer:");
    console.log("══════════════════════════");
    console.log(`Dirección: ${deployer.address}`);
    console.log(`Stake de voting:          ${ethers.formatEther(deployerVotingStake)} tokens (${deployerVotingStake.toString()} wei)`);
    
    const deployerVP = await dao.getVotingPower(deployer.address);
    console.log(`Poder de voto:            ${deployerVP.toString()}`);
  }
  
  console.log("\n✅ Diagnóstico completo\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
