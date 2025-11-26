const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const addresses = JSON.parse(
    fs.readFileSync("./deployed-addresses.json", "utf8")
  );

  console.log("\n🔍 Debugging Finalize Proposal\n");

  const dao = await ethers.getContractAt("DAO", addresses.dao);
  const strategyManager = await ethers.getContractAt("StrategyManager", addresses.strategyManager);
  const strategy = await ethers.getContractAt("SimpleMajorityStrategy", addresses.simpleMajorityStrategy);
  const staking = await ethers.getContractAt("Staking", addresses.staking);
  const parameters = await ethers.getContractAt("Parameters", addresses.parameters);

  console.log("📊 Estado del Sistema:");
  console.log("════════════════════════");
  
  const activeStrategyAddr = await strategyManager.getActiveStrategyAddress();
  console.log(`Estrategia activa: ${activeStrategyAddr}`);
  console.log(`Estrategia esperada: ${addresses.simpleMajorityStrategy}`);
  
  if (activeStrategyAddr === ethers.ZeroAddress) {
    console.log("\n❌ ERROR: No hay estrategia activa configurada!");
    return;
  }

  console.log("\n🔢 Calculando Total Voting Power:");
  console.log("═════════════════════════════════");
  
  try {
    const totalStaked = await staking.totalVotingStaked();
    console.log(`Total staked: ${ethers.formatEther(totalStaked)} tokens (${totalStaked.toString()} wei)`);
    
    const tokensPerVP = await parameters.tokensPerVotingPower();
    console.log(`Tokens per VP: ${ethers.formatEther(tokensPerVP)} tokens (${tokensPerVP.toString()} wei)`);
    
    const totalVP = await strategy.getTotalVotingPower();
    console.log(`Total Voting Power: ${totalVP.toString()}`);
    
    console.log(`\nCálculo manual: ${totalStaked.toString()} / ${tokensPerVP.toString()} = ${totalStaked / tokensPerVP}`);
    
  } catch (e) {
    console.error("\n❌ Error al calcular voting power:", e.message);
  }

  console.log("\n📋 Propuestas:");
  console.log("═════════════");
  const proposalCount = await dao.getProposalCount();
  console.log(`Total de propuestas: ${proposalCount}`);
  
  for (let i = 0; i < proposalCount; i++) {
    try {
      const proposal = await dao.getProposal(i);
      console.log(`\nPropuesta #${i}:`);
      console.log(`  Título: ${proposal.title}`);
      console.log(`  Estado: ${proposal.stateName}`);
      console.log(`  Votos a favor: ${proposal.votesFor.toString()}`);
      console.log(`  Votos en contra: ${proposal.votesAgainst.toString()}`);
      console.log(`  Deadline: ${new Date(Number(proposal.deadline) * 1000).toLocaleString()}`);
    } catch (e) {
      console.error(`  Error obteniendo propuesta ${i}:`, e.message);
    }
  }

  console.log("\n✅ Diagnóstico completo\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
