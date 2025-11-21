import { useState } from "react";
import "./App.css";
import WalletConnect from "./components/WalletConnect";
import TokenBalance from "./components/TokenBalance";
import BuyTokens from "./components/BuyTokens";
import StakingSection from "./components/StakingSection";
import CreateProposal from "./components/CreateProposal";
import ProposalList from "./components/ProposalList";

function App() {
  const [activeSection, setActiveSection] = useState('dashboard');

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🏛️ ShaCoin DAO</h1>
          <WalletConnect />
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
              <TokenBalance balance="0" />
              <div className="info-card">
                <h3>Poder de Voto</h3>
                <p className="big-number">0</p>
              </div>
              <div className="info-card">
                <h3>Propuestas Activas</h3>
                <p className="big-number">0</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'tokens' && (
          <div className="section">
            <BuyTokens />
          </div>
        )}

        {activeSection === 'staking' && (
          <div className="section">
            <StakingSection />
          </div>
        )}

        {activeSection === 'proposals' && (
          <div className="section">
            <ProposalList />
          </div>
        )}

        {activeSection === 'create' && (
          <div className="section">
            <CreateProposal />
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>ShaCoin DAO - Decentralized Autonomous Organization</p>
      </footer>
    </div>
  );
}

export default App;
