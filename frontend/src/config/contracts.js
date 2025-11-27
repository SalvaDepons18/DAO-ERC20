// Configuración de contratos
// Estas direcciones deben actualizarse después del deploy

export const CONTRACT_ADDRESSES = {
  dao: import.meta.env.VITE_DAO_ADDRESS || "0x0000000000000000000000000000000000000000",
  shaCoin: import.meta.env.VITE_SHA_COIN_ADDRESS || "0x0000000000000000000000000000000000000000",
  parameters: import.meta.env.VITE_PARAMETERS_ADDRESS || "0x0000000000000000000000000000000000000000",
  staking: import.meta.env.VITE_STAKING_ADDRESS || "0x0000000000000000000000000000000000000000",
  proposalManager: import.meta.env.VITE_PROPOSAL_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000",
  strategyManager: import.meta.env.VITE_STRATEGY_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000",
  simpleMajorityStrategy: import.meta.env.VITE_SIMPLE_MAJORITY_STRATEGY_ADDRESS || "0x0000000000000000000000000000000000000000",
  panicManager: import.meta.env.VITE_PANIC_MANAGER_ADDRESS || "0x0000000000000000000000000000000000000000",
};

// Red por defecto configurable
export const DEFAULT_CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || 31337);
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
    rpcUrl: import.meta.env.VITE_RPC_URL || "https://sepolia.infura.io/v3/YOUR_KEY",
  },
};
