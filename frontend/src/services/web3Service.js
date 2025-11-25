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
 * Obtener el signer actual - lo reinicializa si es necesario
 */
export const getSigner = async () => {
  if (signer) {
    return signer;
  }
  
  // Si no hay signer pero hay window.ethereum, intentar recuperarlo
  if (typeof window.ethereum !== "undefined") {
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_accounts'
      });
      
      if (accounts.length > 0) {
        provider = new ethers.BrowserProvider(window.ethereum);
        signer = await provider.getSigner();
        return signer;
      }
    } catch (error) {
      console.warn('No se pudo recuperar el signer:', error);
    }
  }
  
  return null;
};

/**
 * Conectar a un contrato
 */
const getContract = async (address, abi, isReadOnly = false) => {
  if (isReadOnly) {
    return new ethers.Contract(address, abi, getProvider());
  }
  
  const signer = await getSigner();
  if (!signer) {
    console.warn("No hay signer disponible, usando solo lectura");
    return new ethers.Contract(address, abi, getProvider());
  }
  return new ethers.Contract(address, abi, signer);
};

/**
 * DAO Contract
 */
export const getDAOContract = async (isReadOnly = false) => {
  return await getContract(CONTRACT_ADDRESSES.dao, DAOAbi, isReadOnly);
};

/**
 * ShaCoin Contract
 */
export const getShaCoinContract = async (isReadOnly = false) => {
  return await getContract(CONTRACT_ADDRESSES.shaCoin, ShaCoinAbi, isReadOnly);
};

/**
 * Parameters Contract
 */
export const getParametersContract = async (isReadOnly = true) => {
  return await getContract(CONTRACT_ADDRESSES.parameters, ParametersAbi, isReadOnly);
};

/**
 * Staking Contract
 */
export const getStakingContract = async (isReadOnly = false) => {
  return await getContract(CONTRACT_ADDRESSES.staking, StakingAbi, isReadOnly);
};

/**
 * ProposalManager Contract
 */
export const getProposalManagerContract = async (isReadOnly = false) => {
  return await getContract(CONTRACT_ADDRESSES.proposalManager, ProposalManagerAbi, isReadOnly);
};

/**
 * StrategyManager Contract
 */
export const getStrategyManagerContract = async (isReadOnly = true) => {
  return await getContract(CONTRACT_ADDRESSES.strategyManager, StrategyManagerAbi, isReadOnly);
};

/**
 * PanicManager Contract
 */
export const getPanicManagerContract = async (isReadOnly = true) => {
  return await getContract(CONTRACT_ADDRESSES.panicManager, PanicManagerAbi, isReadOnly);
};

/**
 * SimpleMajorityStrategy Contract
 */
export const getSimpleMajorityStrategyContract = async (isReadOnly = true) => {
  return await getContract(
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
  const dao = await getDAOContract();
  console.log('Enviando transacción buyTokens...');
  const tx = await dao.buyTokens({
    value: ethers.parseEther(ethAmount.toString()),
  });
  console.log('Transacción enviada, esperando confirmación...');
  const receipt = await tx.wait();
  console.log('Transacción confirmada en bloque:', receipt.blockNumber);
  return receipt;
};

/**
 * Crear una propuesta
 */
export const createProposal = async (title, description) => {
  const dao = await getDAOContract();
  const tx = await dao.createProposal(title, description);
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Votar en una propuesta
 */
export const vote = async (proposalId, support) => {
  const dao = await getDAOContract();
  const tx = await dao.vote(proposalId, support);
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Cambiar voto en una propuesta (vía DAO)
 */
export const changeVote = async (proposalId, support) => {
  const dao = await getDAOContract();
  const tx = await dao.changeVote(proposalId, support);
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Hacer stake para votar
 */
export const stakeForVoting = async (amount) => {
  const dao = await getDAOContract();
  const tx = await dao.stakeForVoting(ethers.parseEther(amount.toString()));
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Hacer stake para proponer
 */
export const stakeForProposing = async (amount) => {
  const dao = await getDAOContract();
  const tx = await dao.stakeForProposing(ethers.parseEther(amount.toString()));
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Deshacer stake de votación
 */
export const unstakeVoting = async () => {
  const dao = await getDAOContract();
  const tx = await dao.unstakeVoting();
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Deshacer stake de proposición
 */
export const unstakeProposing = async () => {
  const dao = await getDAOContract();
  const tx = await dao.unstakeProposing();
  const receipt = await tx.wait();
  return receipt;
};

// ====== ShaCoin Functions ======

/**
 * Obtener el balance de tokens
 */
export const getTokenBalance = async (address) => {
  const shaCoin = await getShaCoinContract(true);
  console.log('Consultando balance de ShaCoin para:', address);
  console.log('Dirección del contrato ShaCoin:', CONTRACT_ADDRESSES.shaCoin);
  const balance = await shaCoin.balanceOf(address);
  console.log('Balance raw:', balance.toString());
  const formattedBalance = ethers.formatEther(balance);
  console.log('Balance formateado:', formattedBalance);
  return formattedBalance;
};

/**
 * Aprobar tokens para uso en otro contrato
 */
export const approveTokens = async (spenderAddress, amount) => {
  const shaCoin = await getShaCoinContract();
  const tx = await shaCoin.approve(spenderAddress, ethers.parseEther(amount.toString()));
  const receipt = await tx.wait();
  return receipt;
};

// ====== Staking Functions ======

/**
 * Obtener el stake para votar
 */
export const getVotingStake = async (address) => {
  const staking = await getStakingContract(true);
  const stake = await staking.getVotingStake(address);
  return ethers.formatEther(stake);
};

/**
 * Obtener el stake para proponer
 */
export const getProposingStake = async (address) => {
  const staking = await getStakingContract(true);
  const stake = await staking.getProposingStake(address);
  return ethers.formatEther(stake);
};

// ====== ProposalManager Functions ======

/**
 * Obtener los detalles de una propuesta
 */
export const getProposal = async (proposalId) => {
  const proposalManager = await getProposalManagerContract(true);
  const proposal = await proposalManager.getProposal(proposalId);
  return proposal;
};

/**
 * Obtener el estado de una propuesta
 */
export const getProposalState = async (proposalId) => {
  const proposalManager = await getProposalManagerContract(true);
  const state = await proposalManager.getProposalState(proposalId);
  const states = ["ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED"];
  return states[state];
};

/**
 * Obtener los resultados de votación
 */
export const getProposalResults = async (proposalId) => {
  const proposalManager = await getProposalManagerContract(true);
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
  const parameters = await getParametersContract(true);
  const price = await parameters.tokenPrice();
  return ethers.formatEther(price);
};

/**
 * Obtener el tiempo de bloqueo para staking
 */
export const getStakingLockTime = async () => {
  const parameters = await getParametersContract(true);
  const lockTime = await parameters.stakingLockTime();
  return lockTime.toString();
};

// ====== Panic Manager Functions ======

/**
 * Verificar si la DAO está en pánico
 */
export const isPanicked = async () => {
  const panicManager = await getPanicManagerContract(true);
  try {
    await panicManager.checkNotPanicked();
    return false;
  } catch {
    return true;
  }
};
