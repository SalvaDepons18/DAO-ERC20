const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function main() {
  console.log(" Iniciando deploy de la DAO...\n");

  const [deployer] = await ethers.getSigners();
  console.log(" Desplegando con cuenta:", deployer.address);

  // 1. Desplegar ShaCoin (ERC20 Token)
  console.log("\n Desplegando ShaCoin...");
  const ShaCoin = await ethers.getContractFactory("ShaCoin");
  const shaCoin = await ShaCoin.deploy(deployer.address);
  await shaCoin.waitForDeployment();
  const shaCoindAddress = shaCoin.target;
  console.log(" ShaCoin desplegado en:", shaCoindAddress);

  // 2. Desplegar Parameters
  console.log("\n Desplegando Parameters...");
  const Parameters = await ethers.getContractFactory("Parameters");
  const parameters = await Parameters.deploy(deployer.address);
  await parameters.waitForDeployment();
  const parametersAddress = parameters.target;
  console.log(" Parameters desplegado en:", parametersAddress);

  // 3. Desplegar Staking
  console.log("\n Desplegando Staking...");
  const Staking = await ethers.getContractFactory("Staking");
  const staking = await Staking.deploy(shaCoindAddress, parametersAddress);
  await staking.waitForDeployment();
  const stakingAddress = staking.target;
  console.log(" Staking desplegado en:", stakingAddress);

  // 4. Desplegar SimpleMajorityStrategy
  console.log("\n Desplegando SimpleMajorityStrategy...");
  const SimpleMajorityStrategy = await ethers.getContractFactory("SimpleMajorityStrategy");
  const simpleMajorityStrategy = await SimpleMajorityStrategy.deploy(stakingAddress, parametersAddress);
  await simpleMajorityStrategy.waitForDeployment();
  const simpleMajorityStrategyAddress = simpleMajorityStrategy.target;
  console.log(" SimpleMajorityStrategy desplegado en:", simpleMajorityStrategyAddress);

  // 5. Desplegar StrategyManager
  console.log("\n Desplegando StrategyManager...");
  const StrategyManager = await ethers.getContractFactory("StrategyManager");
  const strategyManager = await StrategyManager.deploy(simpleMajorityStrategyAddress);
  await strategyManager.waitForDeployment();
  const strategyManagerAddress = strategyManager.target;
  console.log(" StrategyManager desplegado en:", strategyManagerAddress);

  // 6. Desplegar ProposalManager
  // Constructor: (address votingStrategy, uint256 minVotingPowerToPropose, uint256 defaultProposalDuration)
  console.log("\n Desplegando ProposalManager...");
  const ProposalManager = await ethers.getContractFactory("ProposalManager");
  const minVotingPowerToPropose = ethers.parseEther("50");
  const defaultProposalDuration = 259200; // 3 días
  const proposalManager = await ProposalManager.deploy(
    simpleMajorityStrategyAddress,
    minVotingPowerToPropose,
    defaultProposalDuration
  );
  await proposalManager.waitForDeployment();
  const proposalManagerAddress = proposalManager.target;
  console.log(" ProposalManager desplegado en:", proposalManagerAddress);

  // Enlazar StrategyManager para estrategia dinámica en tiempo real
  console.log("\n Enlazando StrategyManager al ProposalManager...");
  const txLink = await proposalManager.linkStrategyManager(strategyManagerAddress);
  await txLink.wait();
  console.log(" StrategyManager enlazado");

  console.log(" Seteando Parameters en ProposalManager...");
  const txSetParams = await proposalManager.setParameters(parametersAddress);
  await txSetParams.wait();
  console.log(" Parameters enlazado en ProposalManager");

  // 7. Desplegar PanicManager
  console.log("\n Desplegando PanicManager...");
  const PanicManager = await ethers.getContractFactory("PanicManager");
  const panicOperator = process.env.PANIC_OPERATOR && ethers.isAddress(process.env.PANIC_OPERATOR)
    ? process.env.PANIC_OPERATOR
    : deployer.address;
  if (panicOperator === deployer.address) {
    console.log(" (PANIC_OPERATOR no definido o inválido en .env, usando deployer como operador de pánico)");
  } else {
    console.log(" Operador de pánico (multisig) definido:", panicOperator);
  }

  const panicManager = await PanicManager.deploy(deployer.address, panicOperator);
  await panicManager.waitForDeployment();
  const panicManagerAddress = panicManager.target;
  console.log(" PanicManager desplegado en:", panicManagerAddress);
  console.log(" Operador de pánico actual:", await panicManager.panicOperator());

  // 8. Desplegar DAO
  console.log("\n Desplegando DAO...");
  const DAO = await ethers.getContractFactory("DAO");
  const dao = await DAO.deploy(
    deployer.address,
    shaCoindAddress,
    stakingAddress,
    proposalManagerAddress,
    strategyManagerAddress,
    parametersAddress,
    panicManagerAddress
  );
  await dao.waitForDeployment();
  const daoAddress = dao.target;
  console.log(" DAO desplegado en:", daoAddress);

  // Guardar direcciones
  const addresses = {
    dao: daoAddress,
    shaCoin: shaCoindAddress,
    parameters: parametersAddress,
    staking: stakingAddress,
    proposalManager: proposalManagerAddress,
    strategyManager: strategyManagerAddress,
    simpleMajorityStrategy: simpleMajorityStrategyAddress,
    panicManager: panicManagerAddress,
  };

  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  fs.writeFileSync(addressesPath, JSON.stringify(addresses, null, 2));
  console.log("\n Direcciones guardadas en:", addressesPath);

  // Copiar ABIs al frontend
  console.log("\n Copiando ABIs al frontend...");
  const abiDir = path.join(__dirname, "..", "frontend", "src", "abi");
  if (!fs.existsSync(abiDir)) {
    fs.mkdirSync(abiDir, { recursive: true });
  }

  const contracts = {
    DAO: "DAO.sol/DAO.json",
    ShaCoin: "ShaCoin.sol/ShaCoin.json",
    Parameters: "Parameters.sol/Parameters.json",
    Staking: "Staking.sol/Staking.json",
    ProposalManager: "ProposalManager.sol/ProposalManager.json",
    StrategyManager: "StrategyManager.sol/StrategyManager.json",
    SimpleMajorityStrategy: "SimpleMajorityStrategy.sol/SimpleMajorityStrategy.json",
    PanicManager: "PanicManager.sol/PanicManager.json",
  };

  for (const [name, filePath] of Object.entries(contracts)) {
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", filePath);
    const destPath = path.join(abiDir, `${name}.json`);
    
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
      const abiOnly = { abi: artifact.abi };
      fs.writeFileSync(destPath, JSON.stringify(abiOnly, null, 2));
      console.log(` ${name}.json copiado`);
    } else {
      console.log(` No se encontró ${name}.json en artifacts`);
    }
  }

  // 9. Configurar parámetros iniciales
  console.log("\n Configurando parámetros iniciales...");
  
  // Token price: 0.001 ETH por token
  const tokenPrice = ethers.parseEther("0.001");
  console.log(" Configurando precio del token:", ethers.formatEther(tokenPrice), "ETH");
  let tx = await parameters.setTokenPrice(tokenPrice);
  await tx.wait();
  console.log(" Precio del token configurado");

  // Tokens per voting power: 1 token = 1 voto
  const tokensPerVotingPower = ethers.parseEther("1");
  console.log(" Configurando tokens por poder de voto:", ethers.formatEther(tokensPerVotingPower));
  tx = await parameters.setTokensPerVotingPower(tokensPerVotingPower);
  await tx.wait();
  console.log(" Tokens por poder de voto configurados");

  // Min stake for voting: 10 tokens
  const minStakeForVoting = ethers.parseEther("10");
  console.log(" Configurando stake mínimo para votar:", ethers.formatEther(minStakeForVoting), "tokens");
  tx = await parameters.setMinStakeForVoting(minStakeForVoting);
  await tx.wait();
  console.log(" Stake mínimo para votar configurado");

  // Min stake for proposing: 50 tokens
  const minStakeForProposing = ethers.parseEther("50");
  console.log(" Configurando stake mínimo para proponer:", ethers.formatEther(minStakeForProposing), "tokens");
  tx = await parameters.setMinStakeForProposing(minStakeForProposing);
  await tx.wait();
  console.log(" Stake mínimo para proponer configurado");

  // Staking lock time: 7 días (604800 segundos)
  const stakingLockTime = 604800;
  console.log(" Configurando tiempo de bloqueo de staking:", stakingLockTime, "segundos (7 días)");
  tx = await parameters.setStakingLockTime(stakingLockTime);
  await tx.wait();
  console.log(" Tiempo de bloqueo de staking configurado");

  // Proposal duration: 3 días (259200 segundos)
  const proposalDuration = 259200;
  console.log(" Configurando duración de propuestas:", proposalDuration, "segundos (3 días)");
  tx = await parameters.setProposalDuration(proposalDuration);
  await tx.wait();
  console.log(" Duración de propuestas configurada");

  // 10. Transferir ownership de ShaCoin al DAO
  console.log("\n Transfiriendo ownership de ShaCoin al DAO...");
  tx = await shaCoin.transferOwnership(daoAddress);
  await tx.wait();
  console.log(" Ownership transferido al DAO");

  console.log("\n Deploy completado");

  Object.entries(addresses).forEach(([key, value]) => {
    console.log(`${key.padEnd(25)}: ${value}`);
  });
  
  console.log("\n Variables de entorno para .env.local:");
  console.log("=====================================");
  console.log(`VITE_DAO_ADDRESS=${daoAddress}`);
  console.log(`VITE_SHA_COIN_ADDRESS=${shaCoindAddress}`);
  console.log(`VITE_PARAMETERS_ADDRESS=${parametersAddress}`);
  console.log(`VITE_STAKING_ADDRESS=${stakingAddress}`);
  console.log(`VITE_PROPOSAL_MANAGER_ADDRESS=${proposalManagerAddress}`);
  console.log(`VITE_STRATEGY_MANAGER_ADDRESS=${strategyManagerAddress}`);
  console.log(`VITE_SIMPLE_MAJORITY_STRATEGY_ADDRESS=${simpleMajorityStrategyAddress}`);
  console.log(`VITE_PANIC_MANAGER_ADDRESS=${panicManagerAddress}`);
}

main().catch(err => {
  console.error("❌ Error en el deploy:", err);
  process.exit(1);
});

