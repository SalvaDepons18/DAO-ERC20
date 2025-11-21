import { useState } from 'react';

export default function StakingSection() {
  const [votingStake, setVotingStake] = useState('');
  const [proposingStake, setProposingStake] = useState('');
  const [activeTab, setActiveTab] = useState('voting');

  const handleStakeVoting = async (e) => {
    e.preventDefault();
    console.log('Staking para votar:', votingStake);
  };

  const handleStakeProposing = async (e) => {
    e.preventDefault();
    console.log('Staking para proponer:', proposingStake);
  };

  const handleUnstake = async (type) => {
    console.log('Unstaking', type);
  };

  return (
    <div className="staking-section">
      <h2>Gestión de Staking</h2>
      
      <div className="tabs">
        <button 
          className={activeTab === 'voting' ? 'active' : ''} 
          onClick={() => setActiveTab('voting')}
        >
          Staking para Votar
        </button>
        <button 
          className={activeTab === 'proposing' ? 'active' : ''} 
          onClick={() => setActiveTab('proposing')}
        >
          Staking para Proponer
        </button>
      </div>

      {activeTab === 'voting' && (
        <div className="staking-form">
          <form onSubmit={handleStakeVoting}>
            <input
              type="number"
              value={votingStake}
              onChange={(e) => setVotingStake(e.target.value)}
              placeholder="Cantidad de tokens"
              min="0"
            />
            <button type="submit" className="btn btn-primary">
              Stake para Votar
            </button>
          </form>
          <div className="current-stake">
            <p>Stake actual: <strong>0 SHA</strong></p>
            <button className="btn btn-secondary" onClick={() => handleUnstake('voting')}>
              Retirar Stake
            </button>
          </div>
        </div>
      )}

      {activeTab === 'proposing' && (
        <div className="staking-form">
          <form onSubmit={handleStakeProposing}>
            <input
              type="number"
              value={proposingStake}
              onChange={(e) => setProposingStake(e.target.value)}
              placeholder="Cantidad de tokens"
              min="0"
            />
            <button type="submit" className="btn btn-primary">
              Stake para Proponer
            </button>
          </form>
          <div className="current-stake">
            <p>Stake actual: <strong>0 SHA</strong></p>
            <button className="btn btn-secondary" onClick={() => handleUnstake('proposing')}>
              Retirar Stake
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
