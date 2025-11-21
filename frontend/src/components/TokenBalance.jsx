export default function TokenBalance({ balance, symbol = 'SHA' }) {
  return (
    <div className="token-balance">
      <h3>Tu Balance</h3>
      <div className="balance-amount">
        <span className="amount">{balance || '0'}</span>
        <span className="symbol">{symbol}</span>
      </div>
    </div>
  );
}
