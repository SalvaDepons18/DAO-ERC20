import { useState, useEffect } from "react";
import "./App.css";
import WalletConnect from "./components/WalletConnect";
import TokenBalance from "./components/TokenBalance";
import BuyTokens from "./components/BuyTokens";
import StakingSection from "./components/StakingSection";
import CreateProposal from "./components/CreateProposal";
import ProposalList from "./components/ProposalList";
import PanicBanner from './components/PanicBanner';
import DaoStatusBadge from './components/DaoStatusBadge';
import {
  getVotingPower,
  getProposalCount,
  getProposalState,
  getSigner
} from './services/web3Service';

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState({
    votingPower: '0',
    activeProposals: 0,
    loading: true
  });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    loadDashboardData();
    let detachBlockListener;
    if (window.ethereum && window.ethers) {
      try {
        const provider = new window.ethers.BrowserProvider(window.ethereum);
        provider.on('block', () => { loadDashboardData(); });
        detachBlockListener = () => provider.removeAllListeners('block');
      } catch (e) {
        const interval = setInterval(loadDashboardData, 15000);
        detachBlockListener = () => clearInterval(interval);
      }
    } else {
      const interval = setInterval(loadDashboardData, 15000);
      detachBlockListener = () => clearInterval(interval);
    }

    // Escuchar cambios de cuenta y red
    const handleAccountsChanged = (accounts) => {
      setRefreshTrigger(prev => prev + 1);
    };    
    const handleChainChanged = () => {
      window.location.reload();
    };
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      detachBlockListener && detachBlockListener();
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [refreshTrigger]);

  const loadDashboardData = async () => {
    try {
      const signer = await getSigner();
      if (!signer) {
        setDashboardData({
          votingPower: '0',
          activeProposals: 0,
          loading: false
        });
        return;
      }

      const address = await signer.getAddress();
      
      // Poder de voto efectivo vía estrategia (facade DAO)
      const vp = await getVotingPower(address);

      // Contar propuestas activas vía DAO
      const totalProposals = await getProposalCount();
      let activeCount = 0;
      for (let i = 0; i < totalProposals; i++) {
        try {
          const state = await getProposalState(i);
          if (state === 'ACTIVE') activeCount++;
        } catch (e) {
        }
      }

      setDashboardData({
        votingPower: vp.toString(),
        activeProposals: activeCount,
        loading: false
      });
    } catch (error) {
      setDashboardData({
        votingPower: '0',
        activeProposals: 0,
        loading: false
      });
    }
  };

  const handleTransactionSuccess = () => {
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 500);
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>ShaCoin DAO</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <DaoStatusBadge />
            <WalletConnect />
          </div>
        </div>
      </header>

      <nav className="app-nav">
        <button 
          className={activeSection === 'dashboard' ? 'active' : ''}
          onClick={() => setActiveSection('dashboard')}
        >
          Dashboard
        </button>
        <button 
          className={activeSection === 'tokens' ? 'active' : ''}
          onClick={() => setActiveSection('tokens')}
        >
          Tokens
        </button>
        <button 
          className={activeSection === 'staking' ? 'active' : ''}
          onClick={() => setActiveSection('staking')}
        >
          Staking
        </button>
        <button 
          className={activeSection === 'proposals' ? 'active' : ''}
          onClick={() => setActiveSection('proposals')}
        >
          Propuestas
        </button>
        <button 
          className={activeSection === 'create' ? 'active' : ''}
          onClick={() => setActiveSection('create')}
        >
          Crear Propuesta
        </button>
      </nav>

      <main className="app-main">
        {activeSection === 'dashboard' && (
          <div className="dashboard">
            <h2>Dashboard</h2>
            <div className="cards-grid">
              <TokenBalance refreshTrigger={refreshTrigger} />
              <div className="info-card">
                <h3>Poder de Voto</h3>
                <p className="big-number">{dashboardData.votingPower}</p>
                <p style={{ fontSize: '0.8em', color: '#999' }}>Poder efectivo (estrategia)</p>
              </div>
              <div className="info-card">
                <h3>Propuestas Activas</h3>
                <p className="big-number">{dashboardData.activeProposals}</p>
              </div>
            </div>
            <button 
              className="btn btn-secondary" 
              onClick={loadDashboardData}
              disabled={dashboardData.loading}
              style={{ marginTop: '1rem' }}
            >
              {dashboardData.loading ? 'Actualizando...' : 'Actualizar datos'}
            </button>
          </div>
        )}

        {activeSection === 'tokens' && (
          <div className="section">
            <BuyTokens onTransactionSuccess={handleTransactionSuccess} />
          </div>
        )}

        {activeSection === 'staking' && (
          <div className="section">
            <StakingSection onTransactionSuccess={handleTransactionSuccess} />
          </div>
        )}

        {activeSection === 'proposals' && (
          <div className="section">
            <ProposalList refreshTrigger={refreshTrigger} />
          </div>
        )}

        {activeSection === 'create' && (
          <div className="section">
            <CreateProposal onTransactionSuccess={handleTransactionSuccess} />
          </div>
        )}
      </main>

      <PanicBanner />

      <footer className="app-footer">
        <p>ShaCoin DAO - Decentralized Autonomous Organization</p>
      </footer>
    </div>
  );
}

export default App;
