import { useState, useEffect } from 'react';
import { getTokenBalance, getSigner } from '../services/web3Service';

export default function TokenBalance({ symbol = 'SHA', refreshTrigger = 0 }) {
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBalance();
  }, [refreshTrigger]);

  const loadBalance = async () => {
    try {
      setLoading(true);
      const signer = await getSigner();
      if (!signer) {
        setBalance('0');
        return;
      }

      const address = await signer.getAddress();
      const userBalance = await getTokenBalance(address);
      setBalance(parseFloat(userBalance).toFixed(4));
    } catch (error) {
      setBalance('0');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="token-balance">
      <h3>Tu Balance</h3>
      <div className="balance-amount">
        <span className="amount">{loading ? '...' : balance}</span>
        <span className="symbol">{symbol}</span>
      </div>
      <button 
        className="btn btn-small" 
        onClick={loadBalance}
        disabled={loading}
      >
        {loading ? 'Actualizando...' : 'Actualizar'}
      </button>
    </div>
  );
}
