import { ethers } from "ethers";
import { CONTRACT_ADDRESSES } from "../config/contracts";

// Importar ABIs
import DAOAbi from "../abi/DAO.json";
import ShaCoinAbi from "../abi/ShaCoin.json";
import ParametersAbi from "../abi/Parameters.json";
import StakingAbi from "../abi/Staking.json";
import ProposalManagerAbi from "../abi/ProposalManager.json";
import StrategyManagerAbi from "../abi/StrategyManager.json";
import PanicManagerAbi from "../abi/PanicManager.json";
import SimpleMajorityStrategyAbi from "../abi/SimpleMajorityStrategy.json";

let provider;
let signer;

/**
 * Inicializar el proveedor y el signer
 */
export const initWeb3 = async () => {
  if (typeof window.ethereum !== "undefined") {
    try {
      // Solicitar conexión a MetaMask
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      
      // Verificar y cambiar a la red Hardhat si es necesario
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        // Hardhat usa chainId 0x7a69 (31337 en decimal)
        if (chainId !== '0x7a69') {
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: '0x7a69' }],
            });
          } catch (switchError) {
            // Si la red no está agregada, agregarla
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [
                  {
                    chainId: '0x7a69',
                    rpcUrls: ['http://127.0.0.1:8545/'],
                    chainName: 'Hardhat',
                    nativeCurrency: {
                      name: 'ETH',
                      symbol: 'ETH',
                      decimals: 18,
                    },
                  },
                ],
              });
            } else {
              throw switchError;
            }
          }
        }
      } catch (chainError) {
        console.warn('Error al cambiar red:', chainError);
      }

      provider = new ethers.BrowserProvider(window.ethereum);
      signer = await provider.getSigner();
      return signer;
    } catch (error) {
      console.error('Error en initWeb3:', error);
      throw error;
    }
  } else {
    throw new Error("MetaMask o similar no está instalado");
  }
};

/**
 * Obtener el proveedor actual
 */
export const getProvider = () => {
  if (!provider) {
    provider = new ethers.JsonRpcProvider("http://localhost:8545");
  }
  return provider;
};

/**
 * Obtener el signer actual
 */
export const getSigner = () => {
  return signer;
};

/**
 * Conectar a un contrato
 */
const getContract = (address, abi, isReadOnly = false) => {
  const provider_or_signer = isReadOnly ? getProvider() : getSigner();
  if (!provider_or_signer) {
    console.warn("No hay signer disponible, usando solo lectura");
    return new ethers.Contract(address, abi, getProvider());
  }
  return new ethers.Contract(address, abi, provider_or_signer);
};

/**
 * DAO Contract
 */
export const getDAOContract = (isReadOnly = false) => {
  return getContract(CONTRACT_ADDRESSES.dao, DAOAbi, isReadOnly);
};

/**
 * ShaCoin Contract
 */
export const getShaCoinContract = (isReadOnly = false) => {
  return getContract(CONTRACT_ADDRESSES.shaCoin, ShaCoinAbi, isReadOnly);
};

/**
 * Parameters Contract
 */
export const getParametersContract = (isReadOnly = true) => {
  return getContract(CONTRACT_ADDRESSES.parameters, ParametersAbi, isReadOnly);
};

/**
 * Staking Contract
 */
export const getStakingContract = (isReadOnly = false) => {
  return getContract(CONTRACT_ADDRESSES.staking, StakingAbi, isReadOnly);
};

/**
 * ProposalManager Contract
 */
export const getProposalManagerContract = (isReadOnly = false) => {
  return getContract(CONTRACT_ADDRESSES.proposalManager, ProposalManagerAbi, isReadOnly);
};

/**
 * StrategyManager Contract
 */
export const getStrategyManagerContract = (isReadOnly = true) => {
  return getContract(CONTRACT_ADDRESSES.strategyManager, StrategyManagerAbi, isReadOnly);
};

/**
 * PanicManager Contract
 */
export const getPanicManagerContract = (isReadOnly = true) => {
  return getContract(CONTRACT_ADDRESSES.panicManager, PanicManagerAbi, isReadOnly);
};

/**
 * SimpleMajorityStrategy Contract
 */
export const getSimpleMajorityStrategyContract = (isReadOnly = true) => {
  return getContract(
    CONTRACT_ADDRESSES.simpleMajorityStrategy,
    SimpleMajorityStrategyAbi,
    isReadOnly
  );
};

// ====== DAO Functions ======

/**
 * Comprar tokens
 */
export const buyTokens = async (ethAmount) => {
  const dao = getDAOContract();
  const tx = await dao.buyTokens({
    value: ethers.parseEther(ethAmount.toString()),
  });
  return tx.wait();
};

/**
 * Crear una propuesta
 */
export const createProposal = async (title, description) => {
  const dao = getDAOContract();
  const tx = await dao.createProposal(title, description);
  return tx.wait();
};

/**
 * Votar en una propuesta
 */
export const vote = async (proposalId, support) => {
  const dao = getDAOContract();
  const tx = await dao.vote(proposalId, support);
  return tx.wait();
};

/**
 * Hacer stake para votar
 */
export const stakeForVoting = async (amount) => {
  const dao = getDAOContract();
  const tx = await dao.stakeForVoting(ethers.parseEther(amount.toString()));
  return tx.wait();
};

/**
 * Hacer stake para proponer
 */
export const stakeForProposing = async (amount) => {
  const dao = getDAOContract();
  const tx = await dao.stakeForProposing(ethers.parseEther(amount.toString()));
  return tx.wait();
};

/**
 * Deshacer stake de votación
 */
export const unstakeVoting = async () => {
  const dao = getDAOContract();
  const tx = await dao.unstakeVoting();
  return tx.wait();
};

/**
 * Deshacer stake de proposición
 */
export const unstakeProposing = async () => {
  const dao = getDAOContract();
  const tx = await dao.unstakeProposing();
  return tx.wait();
};

// ====== ShaCoin Functions ======

/**
 * Obtener el balance de tokens
 */
export const getTokenBalance = async (address) => {
  const shaCoin = getShaCoinContract(true);
  const balance = await shaCoin.balanceOf(address);
  return ethers.formatEther(balance);
};

/**
 * Aprobar tokens para uso en otro contrato
 */
export const approveTokens = async (spenderAddress, amount) => {
  const shaCoin = getShaCoinContract();
  const tx = await shaCoin.approve(spenderAddress, ethers.parseEther(amount.toString()));
  return tx.wait();
};

// ====== Staking Functions ======

/**
 * Obtener el stake para votar
 */
export const getVotingStake = async (address) => {
  const staking = getStakingContract(true);
  const stake = await staking.getVotingStake(address);
  return ethers.formatEther(stake);
};

/**
 * Obtener el stake para proponer
 */
export const getProposingStake = async (address) => {
  const staking = getStakingContract(true);
  const stake = await staking.getProposingStake(address);
  return ethers.formatEther(stake);
};

// ====== ProposalManager Functions ======

/**
 * Obtener los detalles de una propuesta
 */
export const getProposal = async (proposalId) => {
  const proposalManager = getProposalManagerContract(true);
  const proposal = await proposalManager.getProposal(proposalId);
  return proposal;
};

/**
 * Obtener el estado de una propuesta
 */
export const getProposalState = async (proposalId) => {
  const proposalManager = getProposalManagerContract(true);
  const state = await proposalManager.getProposalState(proposalId);
  const states = ["ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED"];
  return states[state];
};

/**
 * Obtener los resultados de votación
 */
export const getProposalResults = async (proposalId) => {
  const proposalManager = getProposalManagerContract(true);
  const [votesFor, votesAgainst] = await proposalManager.getProposalResults(proposalId);
  return {
    votesFor: votesFor.toString(),
    votesAgainst: votesAgainst.toString(),
  };
};

// ====== Parameters Functions ======

/**
 * Obtener el precio del token
 */
export const getTokenPrice = async () => {
  const parameters = getParametersContract(true);
  const price = await parameters.tokenPrice();
  return ethers.formatEther(price);
};

/**
 * Obtener el tiempo de bloqueo para staking
 */
export const getStakingLockTime = async () => {
  const parameters = getParametersContract(true);
  const lockTime = await parameters.stakingLockTime();
  return lockTime.toString();
};

// ====== Panic Manager Functions ======

/**
 * Verificar si la DAO está en pánico
 */
export const isPanicked = async () => {
  const panicManager = getPanicManagerContract(true);
  try {
    await panicManager.checkNotPanicked();
    return false;
  } catch {
    return true;
  }
};
