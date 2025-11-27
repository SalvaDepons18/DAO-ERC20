import { useState, useEffect } from 'react';
import { initWeb3, getSigner, initPhantomWallet, isPhantomWalletAvailable } from '../services/web3Service';

export default function WalletConnect() {
  const [account, setAccount] = useState(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [walletType, setWalletType] = useState(null); // 'metamask' or 'phantom'
  const [showWalletOptions, setShowWalletOptions] = useState(false);

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

  const connectMetaMask = async () => {
    if (!window.ethereum) {
      alert('Por favor instala MetaMask');
      return;
    }

    try {
      setIsConnecting(true);
      setShowWalletOptions(false);
      const signer = await initWeb3();
      const address = await signer.getAddress();
      setAccount(address);
      setWalletType('metamask');
    } catch (error) {
      console.error('❌ Error conectando MetaMask:', error);
      alert('Error al conectar MetaMask: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectPhantom = async () => {
    if (!isPhantomWalletAvailable()) {
      alert('Por favor instala Phantom Wallet');
      window.open('https://phantom.app/', '_blank');
      return;
    }

    try {
      setIsConnecting(true);
      setShowWalletOptions(false);
      const signer = await initPhantomWallet();
      const address = await signer.getAddress();
      setAccount(address);
      setWalletType('phantom');
    } catch (error) {
      console.error('❌ Error conectando Phantom:', error);
      alert('Error al conectar Phantom Wallet: ' + error.message);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setAccount(null);
  };

  return (
    <div className="wallet-connect">
      {!account ? (
        <div className="wallet-selector">
          <button 
            onClick={() => setShowWalletOptions(!showWalletOptions)} 
            className="btn btn-primary"
            disabled={isConnecting}
          >
            {isConnecting ? 'Conectando...' : 'Conectar Wallet'}
          </button>
          
          {showWalletOptions && (
            <div className="wallet-options">
              <button 
                onClick={connectMetaMask}
                className="wallet-option"
                disabled={isConnecting}
              >
                <span>MetaMask</span>
              </button>
              <button 
                onClick={connectPhantom}
                className="wallet-option"
                disabled={isConnecting}
              >
                <span>Phantom Wallet</span>
              </button>
            </div>
          )}
        </div>
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

