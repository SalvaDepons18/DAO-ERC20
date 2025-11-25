import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { getDAOContract } from '../services/web3Service';

export default function useParameters() {
  const [params, setParams] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchParams = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const dao = await getDAOContract(true);
      const [minStakeVotingRaw, minStakeProposingRaw, lockTimeRaw, tokensPerVPRaw, tokenPriceRaw] = await Promise.all([
        dao.getMinStakeForVoting(),
        dao.getMinStakeForProposing(),
        dao.getStakingLockTime(),
        dao.getTokensPerVotingPower(),
        dao.getTokenPrice()
      ]);
      const lockTimeSeconds = Number(lockTimeRaw);
      const lockTimeDays = lockTimeSeconds >= 86400 ? Math.floor(lockTimeSeconds / 86400) : 0;
      setParams({
        minStakeVoting: ethers.formatEther(minStakeVotingRaw),
        minStakeProposing: ethers.formatEther(minStakeProposingRaw),
        lockTimeSeconds,
        lockTimeDays,
        tokensPerVotingPower: ethers.formatEther(tokensPerVPRaw),
        tokenPriceEth: ethers.formatEther(tokenPriceRaw)
      });
    } catch (e) {
      setError(e.message || 'Error obteniendo parámetros');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchParams(); }, [fetchParams]);

  return { params, loading, error, refresh: fetchParams };
}
