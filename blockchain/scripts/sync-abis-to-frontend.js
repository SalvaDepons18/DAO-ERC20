const fs = require("fs");
const path = require("path");

function copyAbis() {
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

  const artifactBase = path.join(__dirname, "..", "artifacts", "contracts");

  const dests = [
    // top-level frontend only
    path.join(__dirname, "..", "..", "frontend", "src", "abi"),
  ];

  for (const dest of dests) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  }

  for (const [name, rel] of Object.entries(contracts)) {
    const artifactPath = path.join(artifactBase, rel);
    if (!fs.existsSync(artifactPath)) {
      console.warn(`⚠️  No se encontró artifact para ${name} en ${artifactPath}`);
      continue;
    }
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    const abiOnly = { abi: artifact.abi };
    for (const dest of dests) {
      const file = path.join(dest, `${name}.json`);
      fs.writeFileSync(file, JSON.stringify(abiOnly, null, 2));
      console.log(`✅ ABI copiado: ${name}.json -> ${file}`);
    }
  }
}

function writeEnv() {
  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    console.warn("⚠️  No se encontró deployed-addresses.json; se omite .env.local");
    return;
  }
  const addr = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  const envContent = [
    `VITE_DAO_ADDRESS=${addr.dao || ""}`,
    `VITE_SHA_COIN_ADDRESS=${addr.shaCoin || ""}`,
    `VITE_PARAMETERS_ADDRESS=${addr.parameters || ""}`,
    `VITE_STAKING_ADDRESS=${addr.staking || ""}`,
    `VITE_PROPOSAL_MANAGER_ADDRESS=${addr.proposalManager || ""}`,
    `VITE_STRATEGY_MANAGER_ADDRESS=${addr.strategyManager || ""}`,
    `VITE_SIMPLE_MAJORITY_STRATEGY_ADDRESS=${addr.simpleMajorityStrategy || ""}`,
    `VITE_PANIC_MANAGER_ADDRESS=${addr.panicManager || ""}`,
  ].join("\n") + "\n";

  const frontendRoot = path.join(__dirname, "..", "..", "frontend");
  const envPath = path.join(frontendRoot, ".env.local");
  fs.writeFileSync(envPath, envContent);
  console.log(`✅ .env.local escrito en ${envPath}`);
}

function main() {
  copyAbis();
  writeEnv();
}

main();
