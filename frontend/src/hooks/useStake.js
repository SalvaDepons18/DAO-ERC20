import { useCallback } from 'react';
import { ethers } from 'ethers';
import {
  getShaCoinContract,
  getStakingContract,
  getSigner,
  approveTokens,
} from '../services/web3Service';
import { CONTRACT_ADDRESSES } from '../config/contracts';

/**
 * useStake(type): Centraliza allowance check + approve + stake
 * @param {'voting'|'proposing'} type
 * @returns { approve(amount: string|number): Promise<Receipt>, stake(amount: string|number): Promise<Receipt> }
 */
export default function useStake(type) {
  const approve = useCallback(async (amount) => {
    const amtStr = amount?.toString();
    if (!amtStr || parseFloat(amtStr) <= 0) {
      throw new Error('Cantidad inválida para aprobar');
    }
    // Validate staking address
    const stakingAddr = CONTRACT_ADDRESSES.staking;
    if (!ethers.isAddress(stakingAddr)) {
      throw new Error('Dirección de Staking inválida');
    }
    return await approveTokens(stakingAddr, amtStr);
  }, []);

  const stake = useCallback(async (amount) => {
    const amtStr = amount?.toString();
    if (!amtStr || parseFloat(amtStr) <= 0) {
      throw new Error('Cantidad inválida para stake');
    }
    const amt = ethers.parseEther(amtStr);
    const [sha, staking, s] = [await getShaCoinContract(), await getStakingContract(), await getSigner()];
    const owner = await s.getAddress();

    // Pre-check allowance
    const allowance = await sha.allowance(owner, CONTRACT_ADDRESSES.staking);
    if (allowance < amt) {
      const txA = await sha.approve(CONTRACT_ADDRESSES.staking, amt);
      await txA.wait();
    }

    // Stake according to type
    let tx;
    if (type === 'voting') {
      tx = await staking.stakeForVoting(amt);
    } else if (type === 'proposing') {
      tx = await staking.stakeForProposing(amt);
    } else {
      throw new Error('Tipo de stake inválido');
    }
    return await tx.wait();
  }, [type]);

  return { approve, stake };
}
