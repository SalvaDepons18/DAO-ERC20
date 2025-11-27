const fs = require("fs");
const path = require("path");

async function main() {
  console.log("Configurando parámetros de la DAO...\n");

  const [deployer] = await ethers.getSigners();
  console.log("Configurando con cuenta:", deployer.address);

  // Cargar direcciones desplegadas
  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ No se encontró deployed-addresses.json");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  
  // Conectar al contrato Parameters
  console.log("\nConectando a Parameters...");
  const Parameters = await ethers.getContractFactory("Parameters");
  const parameters = Parameters.attach(addresses.parameters);

  // Configurar parámetros
  console.log("\nConfigurando parámetros...");
  
  // Token price: 0.001 ETH por token (1000000000000000 wei)
  const tokenPrice = ethers.parseEther("0.001");
  console.log("  Configurando precio del token:", ethers.formatEther(tokenPrice), "ETH");
  let tx = await parameters.setTokenPrice(tokenPrice);
  await tx.wait();
  console.log("  Precio del token configurado");

  // Tokens per voting power: 1 token = 1 voto
  const tokensPerVotingPower = ethers.parseEther("1");
  console.log("  Configurando tokens por poder de voto:", ethers.formatEther(tokensPerVotingPower));
  tx = await parameters.setTokensPerVotingPower(tokensPerVotingPower);
  await tx.wait();
  console.log("  Tokens por poder de voto configurados");

  // Min stake for voting: 10 tokens
  const minStakeForVoting = ethers.parseEther("10");
  console.log("  Configurando stake mínimo para votar:", ethers.formatEther(minStakeForVoting), "tokens");
  tx = await parameters.setMinStakeForVoting(minStakeForVoting);
  await tx.wait();
  console.log("  Stake mínimo para votar configurado");

  // Min stake for proposing: 50 tokens
  const minStakeForProposing = ethers.parseEther("50");
  console.log("  Configurando stake mínimo para proponer:", ethers.formatEther(minStakeForProposing), "tokens");
  tx = await parameters.setMinStakeForProposing(minStakeForProposing);
  await tx.wait();
  console.log("  Stake mínimo para proponer configurado");

  // Staking lock time: 7 días (604800 segundos)
  const stakingLockTime = 604800;
  console.log("  Configurando tiempo de bloqueo de staking:", stakingLockTime, "segundos (7 días)");
  tx = await parameters.setStakingLockTime(stakingLockTime);
  await tx.wait();
  console.log("  Tiempo de bloqueo de staking configurado");

  // Proposal duration: 3 días (259200 segundos)
  const proposalDuration = 259200;
  console.log("  Configurando duración de propuestas:", proposalDuration, "segundos (3 días)");
  tx = await parameters.setProposalDuration(proposalDuration);
  await tx.wait();
  console.log("  Duración de propuestas configurada");

  // Transferir ownership de ShaCoin al DAO
  console.log("\nTransfiriendo ownership de ShaCoin al DAO...");
  const ShaCoin = await ethers.getContractFactory("ShaCoin");
  const shaCoin = ShaCoin.attach(addresses.shaCoin);
  
  try {
    const currentOwner = await shaCoin.owner();
    console.log("  Owner actual de ShaCoin:", currentOwner);
    console.log("  Dirección del DAO:", addresses.dao);
    
    if (currentOwner !== addresses.dao) {
      tx = await shaCoin.transferOwnership(addresses.dao);
      await tx.wait();
      console.log("  Ownership transferido al DAO");
    } else {
      console.log("  ShaCoin ya es propiedad del DAO");
    }
  } catch (error) {
    console.log("  Error verificando/transfiriendo ownership:", error.message);
    console.log("  Puede que ShaCoin ya tenga el ownership correcto o que haya un problema con el contrato");
  }

  console.log("\nConfiguración completada exitosamente!");
  console.log("\nResumen de configuración:");
  console.log("=====================================");
  console.log(`Precio del token:              ${ethers.formatEther(tokenPrice)} ETH`);
  console.log(`Tokens por poder de voto:      ${ethers.formatEther(tokensPerVotingPower)}`);
  console.log(`Stake mínimo para votar:       ${ethers.formatEther(minStakeForVoting)} tokens`);
  console.log(`Stake mínimo para proponer:    ${ethers.formatEther(minStakeForProposing)} tokens`);
  console.log(`Tiempo de bloqueo de staking:  ${stakingLockTime} segundos`);
  console.log(`Duración de propuestas:        ${proposalDuration} segundos`);
}

main().catch(err => {
  console.error("Error en la configuración:", err);
  process.exit(1);
});
