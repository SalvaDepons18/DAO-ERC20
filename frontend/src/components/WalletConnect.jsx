import { useState, useEffect } from 'react';
import { initWeb3, getSigner } from '../services/web3Service';

export default function WalletConnect() {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    // Verificar si ya hay cuenta conectada
    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_accounts'
          });
          if (accounts.length > 0) {
            setAccount(accounts[0]);
            // Inicializar web3
            try {
              await initWeb3();
            } catch (e) {
              console.warn('Error inicializando web3 en checkConnection:', e);
            }
          }
        } catch (error) {
          console.error('Error verificando conexión:', error);
        }
      }
    };

    checkConnection();

    // Escuchar cambios de cuenta
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length > 0) {
          setAccount(accounts[0]);
        } else {
          setAccount(null);
        }
      });
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Por favor instala MetaMask o similar');
      return;
    }

    try {
      setIsConnecting(true);
      const signer = await initWeb3();
      const address = await signer.getAddress();
      setAccount(address);
      console.log('✅ Wallet conectada:', address);
    } catch (error) {
      console.error('❌ Error conectando wallet:', error);
      alert('Error al conectar wallet: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
    console.log('Wallet desconectada');
  };

  return (
    <div className="wallet-connect">
      {!account ? (
        <button 
          onClick={connectWallet} 
          className="btn btn-primary"
          disabled={isConnecting}
        >
          {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
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

