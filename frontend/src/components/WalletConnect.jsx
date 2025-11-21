import { useState } from 'react';

export default function WalletConnect() {
  const [account, setAccount] = useState(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Por favor instala Metamask');
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      setAccount(accounts[0]);
    } catch (error) {
      console.error('Error conectando wallet:', error);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  return (
    <div className="wallet-connect">
      {!account ? (
        <button onClick={connectWallet} className="btn btn-primary">
          Conectar Wallet
        </button>
      ) : (
        <div className="wallet-info">
          <span className="address">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>
          <button onClick={disconnectWallet} className="btn btn-secondary">
            Desconectar
          </button>
        </div>
      )}
    </div>
  );
}
