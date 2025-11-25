import { useCallback } from 'react';
import { ethers } from 'ethers';
import {
  getDAOContract,
  getSigner,
} from '../services/web3Service';
import { CONTRACT_ADDRESSES } from '../config/contracts';

/**
 * useStake(type): Centraliza allowance check + approve + stake via DAO
 * @param {'voting'|'proposing'} type
 * @returns { approve(amount: string|number): Promise<Receipt>, stake(amount: string|number): Promise<Receipt> }
 */
export default function useStake(type) {
  const approve = useCallback(async (amount) => {
    const amtStr = amount?.toString();
    if (!amtStr || parseFloat(amtStr) <= 0) {
      throw new Error('Cantidad inválida para aprobar');
    }
    // Validate DAO address
    const daoAddr = CONTRACT_ADDRESSES.dao;
    if (!ethers.isAddress(daoAddr)) {
      throw new Error('Dirección de DAO inválida');
    }
    // Approve DAO to spend user's tokens
    const dao = await getDAOContract();
    const amt = ethers.parseEther(amtStr);
    // Get token via DAO's getTokenBalance to find token address, or use ShaCoin address directly
    const shaCoinAddr = CONTRACT_ADDRESSES.shaCoin;
    const shaCoin = new ethers.Contract(shaCoinAddr, ['function approve(address,uint256) returns (bool)'], await getSigner());
    const tx = await shaCoin.approve(daoAddr, amt);
    return await tx.wait();
  }, []);

  const stake = useCallback(async (amount) => {
    const amtStr = amount?.toString();
    if (!amtStr || parseFloat(amtStr) <= 0) {
      throw new Error('Cantidad inválida para stake');
    }
    const amt = ethers.parseEther(amtStr);
    const dao = await getDAOContract();

    // Stake according to type via DAO facade
    let tx;
    if (type === 'voting') {
      tx = await dao.stakeForVoting(amt);
    } else if (type === 'proposing') {
      tx = await dao.stakeForProposing(amt);
    } else {
      throw new Error('Tipo de stake inválido');
    }
    return await tx.wait();
  }, [type]);

  return { approve, stake };
}
