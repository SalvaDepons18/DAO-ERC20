import { useState } from 'react';

export default function BuyTokens() {
  const [ethAmount, setEthAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBuy = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // TODO: Implementar compra de tokens
      console.log('Comprando tokens con', ethAmount, 'ETH');
    } catch (error) {
      console.error('Error comprando tokens:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="buy-tokens">
      <h2>Comprar Tokens SHA</h2>
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
