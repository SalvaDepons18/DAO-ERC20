import { ethers } from "ethers";
import { CONTRACT_ADDRESSES, DEFAULT_CHAIN_ID } from "../config/contracts";

// Importar ABIs
import DAOAbi from "../abi/DAO.json";
import ShaCoinAbi from "../abi/ShaCoin.json";
import ParametersAbi from "../abi/Parameters.json";
import StrategyManagerAbi from "../abi/StrategyManager.json";
import PanicManagerAbi from "../abi/PanicManager.json";
import SimpleMajorityStrategyAbi from "../abi/SimpleMajorityStrategy.json"; // may be used elsewhere; voting power now via DAO

let provider;
let signer;

// ========= Helpers: Network, Contracts, Panic =========

const ZERO_ADDR = "0x0000000000000000000000000000000000000000";

const ensureReady = async () => {
  const s = await getSigner();
  if (!s) throw new Error("Wallet no conectada");

  const net = await (provider || getProvider()).getNetwork();
  const expected = BigInt(DEFAULT_CHAIN_ID);
  if (net.chainId !== expected) {
    throw new Error(`Red inválida: chainId=${net.chainId}, esperado=${expected}`);
  }
  // Basic address sanity check
  const addrs = Object.entries(CONTRACT_ADDRESSES);
  for (const [k, v] of addrs) {
    if (!v || v === ZERO_ADDR) {
      throw new Error(`Dirección de contrato inválida para ${k}`);
    }
  }
};

// Eliminado assertNotPanicked: la verificación de pánico se hace on-chain vía modifier notInPanic.

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
  await ensureReady();
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
  await ensureReady();
  const dao = await getDAOContract();
  const tx = await dao.createProposal(title, description);
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Votar en una propuesta
 */
export const vote = async (proposalId, support) => {
  await ensureReady();
  const dao = await getDAOContract();
  const tx = await dao.vote(proposalId, support);
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Cambiar voto en una propuesta (vía DAO)
 */
export const changeVote = async (proposalId, support) => {
  await ensureReady();
  const dao = await getDAOContract();
  const tx = await dao.changeVote(proposalId, support);
  const receipt = await tx.wait();
  return receipt;
};

/**
 * Hacer stake para votar
 */
export const stakeForVoting = async (amount) => {
  await ensureReady();
  const amt = ethers.parseEther(amount.toString());
  const sha = await getShaCoinContract();
  const s = await getSigner();
  const owner = await s.getAddress();
  const allowance = await sha.allowance(owner, CONTRACT_ADDRESSES.dao);
  if (allowance < amt) {
    const txA = await sha.approve(CONTRACT_ADDRESSES.dao, amt);
    await txA.wait();
  }
  const dao = await getDAOContract();
  const tx = await dao.stakeForVoting(amt);
  return await tx.wait();
};

/**
 * Hacer stake para proponer
 */
export const stakeForProposing = async (amount) => {
  await ensureReady();
  const amt = ethers.parseEther(amount.toString());
  const sha = await getShaCoinContract();
  const s = await getSigner();
  const owner = await s.getAddress();
  const allowance = await sha.allowance(owner, CONTRACT_ADDRESSES.dao);
  if (allowance < amt) {
    const txA = await sha.approve(CONTRACT_ADDRESSES.dao, amt);
    await txA.wait();
  }
  const dao = await getDAOContract();
  const tx = await dao.stakeForProposing(amt);
  return await tx.wait();
};

/**
 * Deshacer stake de votación
 */
export const unstakeVoting = async () => {
  await ensureReady();
  const dao = await getDAOContract();
  const tx = await dao.unstakeVoting();
  return await tx.wait();
};

/**
 * Deshacer stake de proposición
 */
export const unstakeProposing = async () => {
  await ensureReady();
  const dao = await getDAOContract();
  const tx = await dao.unstakeProposing();
  return await tx.wait();
};

// ====== ShaCoin Functions ======

/**
 * Obtener el balance de tokens
 */
export const getTokenBalance = async (address) => {
  const dao = await getDAOContract(true);
  const balance = await dao.getTokenBalance(address);
  console.log('Balance raw:', balance.toString());
  const formattedBalance = ethers.formatEther(balance);
  console.log('Balance formateado:', formattedBalance);
  return formattedBalance;
};

/**
 * Aprobar tokens para uso en otro contrato
 */
export const approveTokens = async (spenderAddress, amount) => {
  await ensureReady();
  if (!ethers.isAddress(spenderAddress)) {
    throw new Error("Dirección inválida");
  }
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
  const dao = await getDAOContract(true);
  const stake = await dao.getVotingStake(address);
  return ethers.formatEther(stake);
};

/**
 * Obtener el stake para proponer
 */
export const getProposingStake = async (address) => {
  const dao = await getDAOContract(true);
  const stake = await dao.getProposingStake(address);
  return ethers.formatEther(stake);
};

// ====== ProposalManager Functions ======

/**
 * Obtener los detalles de una propuesta
 */
export const getProposal = async (proposalId) => {
  const dao = await getDAOContract(true);
  const proposal = await dao.getProposal(proposalId);
  // Enhance with decoded state
  const rawState = Number(proposal.state);
  const states = ["ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED"];
  return {
    ...proposal,
    rawState,
    stateName: states[rawState] || "UNKNOWN"
  };
};

export const getProposalCount = async () => {
  const dao = await getDAOContract(true);
  return Number(await dao.getProposalCount());
};

/**
 * Obtener el estado de una propuesta
 */
export const getProposalState = async (proposalId) => {
  const dao = await getDAOContract(true);
  const state = await dao.getProposalState(proposalId);
  const states = ["ACTIVE", "ACCEPTED", "REJECTED", "EXPIRED"];
  return states[state];
};

/**
 * Obtener los resultados de votación
 */
export const getProposalResults = async (proposalId) => {
  const dao = await getDAOContract(true);
  const [votesFor, votesAgainst] = await dao.getProposalResults(proposalId);
  return {
    votesFor: votesFor.toString(),
    votesAgainst: votesAgainst.toString(),
  };
};

/**
 * Finalizar una propuesta (evalúa resultado) 
 */
export const finalizeProposal = async (proposalId) => {
  await ensureReady();
  const dao = await getDAOContract();
  const tx = await dao.finalizeProposal(proposalId);
  return await tx.wait();
};

/**
 * Expirar manualmente una propuesta vencida
 */
export const expireProposal = async (proposalId) => {
  await ensureReady();
  const dao = await getDAOContract();
  const tx = await dao.expireProposal(proposalId);
  return await tx.wait();
};

// ====== Parameters Functions ======

/**
 * Obtener el precio del token
 */
export const getTokenPrice = async () => {
  const dao = await getDAOContract(true);
  const price = await dao.getTokenPrice();
  return ethers.formatEther(price);
};

/**
 * Obtener el tiempo de bloqueo para staking
 */
export const getStakingLockTime = async () => {
  const dao = await getDAOContract(true);
  const lockTime = await dao.getStakingLockTime();
  return lockTime.toString();
};

// ====== Voting Power ======

export const getVotingPower = async (address) => {
  const dao = await getDAOContract(true);
  const vp = await dao.getVotingPower(address);
  return vp.toString();
};

// ====== User Vote State (on-chain) ======
export const getUserVote = async (proposalId, userAddress) => {
  const dao = await getDAOContract(true);
  const voteType = await dao.getUserVote(proposalId, userAddress);
  // Mapping enum to strings consistent with ProposalManager.VoteType
  const types = ["NONE", "FOR", "AGAINST"];
  return types[Number(voteType)] || "NONE";
};

export const hasUserVoted = async (proposalId, userAddress) => {
  const dao = await getDAOContract(true);
  return await dao.hasUserVoted(proposalId, userAddress);
};

// ====== Panic Manager Functions ======

/**
 * Verificar si la DAO está en pánico
 */
export const isPanicked = async () => {
  const dao = await getDAOContract(true);
  return await dao.isPanicked();
};

// Central helper: which actions are DAO-gated by panic
// isDAOAction helper ya no necesario; acciones confían en el modifier on-chain.
