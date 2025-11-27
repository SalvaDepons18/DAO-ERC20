import { useState } from 'react';
import { buyTokens, getTokenBalance, getSigner } from '../services/web3Service';
import { decodeRevert } from '../utils/decodeRevert';

export default function BuyTokens({ onTransactionSuccess }) {
  const [ethAmount, setEthAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleBuy = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!ethAmount || parseFloat(ethAmount) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    setLoading(true);
    try {
      const signer = await getSigner();
      if (!signer) {
        throw new Error('Wallet no conectada');
      }

      const address = await signer.getAddress();
      
      const receipt = await buyTokens(ethAmount);
      
      // El hash puede venir del receipt
      const txHash = receipt.hash || receipt.transactionHash;
      
      setSuccess(`Compra exitosa! Hash: ${txHash}`);
      setEthAmount('');
      
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
      
    } catch (error) {
      const d = decodeRevert(error);
      if (/user (rejected|denied)/i.test(error.message||'')) setError('Transacción rechazada por el usuario.');
      else if (d === 'InsufficientETH') setError('ETH insuficiente para la compra.');
      else setError(`Error: ${d}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buy-tokens">
      <h2>Comprar Tokens SHA</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleBuy}>
        <div className="form-group">
          <label>Cantidad en ETH</label>
          <input
            type="number"
            step="0.001"
            min="0"
            value={ethAmount}
            onChange={(e) => setEthAmount(e.target.value)}
            placeholder="0.0"
            disabled={loading}
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Comprando...' : 'Comprar Tokens'}
        </button>
      </form>
    </div>
  );
}
