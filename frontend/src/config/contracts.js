// Configuración de contratos
// Estas direcciones deben actualizarse después del deploy

export const CONTRACT_ADDRESSES = {
  dao: process.env.REACT_APP_DAO_ADDRESS || "0x0000000000000000000000000000000000000000",
  shaCoin: process.env.REACT_APP_SHA_COIN_ADDRESS || "0x0000000000000000000000000000000000000000",
  parameters: process.env.REACT_APP_PARAMETERS_ADDRESS || "0x0000000000000000000000000000000000000000",
  staking: process.env.REACT_APP_STAKING_ADDRESS || "0x0000000000000000000000000000000000000000",
  proposalManager: process.env.REACT_APP_PROPOSAL_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000",
  strategyManager: process.env.REACT_APP_STRATEGY_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000",
  simpleMajorityStrategy: process.env.REACT_APP_SIMPLE_MAJORITY_STRATEGY_ADDRESS || "0x0000000000000000000000000000000000000000",
  panicManager: process.env.REACT_APP_PANIC_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000",
};

// Red por defecto (Hardhat)
export const DEFAULT_CHAIN_ID = 31337;
export const NETWORKS = {
  31337: {
    name: "Hardhat",
    rpcUrl: "http://localhost:8545",
  },
  1: {
    name: "Ethereum",
    rpcUrl: "https://eth.llamarpc.com",
  },
  11155111: {
    name: "Sepolia",
    rpcUrl: "https://sepolia.infura.io/v3/",
  },
};
