import { useState, useEffect } from 'react';
import { 
  stakeForVoting, 
  stakeForProposing, 
  unstakeVoting, 
  unstakeProposing,
  getVotingStake,
  getProposingStake,
  getSigner
} from '../services/web3Service';

export default function StakingSection({ onTransactionSuccess }) {
  const [votingStake, setVotingStake] = useState('');
  const [proposingStake, setProposingStake] = useState('');
  const [activeTab, setActiveTab] = useState('voting');
  const [currentVotingStake, setCurrentVotingStake] = useState('0');
  const [currentProposingStake, setCurrentProposingStake] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadStakes();
  }, []);

  const loadStakes = async () => {
    try {
      const signer = await getSigner();
      if (!signer) return;

      const address = await signer.getAddress();
      const votingAmount = await getVotingStake(address);
      const proposingAmount = await getProposingStake(address);
      
      setCurrentVotingStake(votingAmount);
      setCurrentProposingStake(proposingAmount);
    } catch (error) {
      console.error('Error cargando stakes:', error);
    }
  };

  const handleStakeVoting = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!votingStake || parseFloat(votingStake) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    setLoading(true);
    try {
      console.log('Staking', votingStake, 'para votar...');
      const receipt = await stakeForVoting(votingStake);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Stake exitoso! Hash: ${txHash}`);
      setVotingStake('');
      await loadStakes();
      
      // Notificar al componente padre
      if (onTransactionSuccess) {
        setTimeout(() => {
          onTransactionSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error('Error en stake voting:', error);
      setError(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStakeProposing = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!proposingStake || parseFloat(proposingStake) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    setLoading(true);
    try {
      console.log('Staking', proposingStake, 'para proponer...');
      const receipt = await stakeForProposing(proposingStake);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Stake exitoso! Hash: ${txHash}`);
      setProposingStake('');
      await loadStakes();
      
      // Notificar al componente padre
      if (onTransactionSuccess) {
        setTimeout(() => {
          onTransactionSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error('Error en stake proposing:', error);
      setError(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (type) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      let receipt;
      if (type === 'voting') {
        receipt = await unstakeVoting();
      } else {
        receipt = await unstakeProposing();
      }
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Unstake exitoso! Hash: ${txHash}`);
      await loadStakes();
      
      // Notificar al componente padre
      if (onTransactionSuccess) {
        setTimeout(() => {
          onTransactionSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error('Error en unstake:', error);
      setError(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staking-section">
      <h2>Gestión de Staking</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
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
              disabled={loading}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Procesando...' : 'Stake para Votar'}
            </button>
          </form>
          <div className="current-stake">
            <p>Stake actual: <strong>{currentVotingStake} SHA</strong></p>
            {parseFloat(currentVotingStake) > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={() => handleUnstake('voting')}
                disabled={loading}
              >
                Retirar Stake
              </button>
            )}
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
              disabled={loading}
              required
            />
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Procesando...' : 'Stake para Proponer'}
            </button>
          </form>
          <div className="current-stake">
            <p>Stake actual: <strong>{currentProposingStake} SHA</strong></p>
            {parseFloat(currentProposingStake) > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={() => handleUnstake('proposing')}
                disabled={loading}
              >
                Retirar Stake
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
