import { useState, useEffect } from 'react';
import { vote, changeVote, isPanicked } from '../services/web3Service';
import useParameters from '../hooks/useParameters';

export default function VotingPanel({ proposalId }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [panicked, setPanicked] = useState(false);
  const { params, loading: paramsLoading, error: paramsError } = useParameters();

  useEffect(() => { isPanicked().then(setPanicked).catch(() => setPanicked(false)); }, []);

  const handleVote = async (voteType) => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const voteValue = voteType === 'FOR' ? true : false;
      const receipt = await vote(proposalId, voteValue);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Voto registrado! Hash: ${txHash}`);
      setHasVoted(true); setUserVote(voteType);
    } catch (e) { setError(`❌ Error: ${e.message}`); } finally { setLoading(false); }
  };

  const handleChangeVote = async (newVoteType) => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const voteValue = newVoteType === 'FOR' ? true : false;
      const receipt = await changeVote(proposalId, voteValue);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Voto actualizado! Hash: ${txHash}`);
      setUserVote(newVoteType);
    } catch (e) { setError(`❌ Error: ${e.message}`); } finally { setLoading(false); }
  };

  if (hasVoted) {
    return (
      <div className="voting-panel voted">
        {(error || paramsError) && <div className="error-message">{error || paramsError}</div>}
        {success && <div className="success-message">{success}</div>}
        <p className="vote-status">Ya has votado: <strong>{userVote === 'FOR' ? '✅ A Favor' : '❌ En Contra'}</strong></p>
        {params && <p style={{ fontSize: '0.75em', color: '#666' }}>Mínimo stake para votar: {params.minStakeVoting} tokens</p>}
        <div className="change-vote-buttons">
          <button className="btn btn-secondary" onClick={() => handleChangeVote('FOR')} disabled={loading || userVote === 'FOR'}>Cambiar a A Favor</button>
          <button className="btn btn-secondary" onClick={() => handleChangeVote('AGAINST')} disabled={loading || userVote === 'AGAINST'}>Cambiar a En Contra</button>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-panel">
      {(error || paramsError) && <div className="error-message">{error || paramsError}</div>}
      {success && <div className="success-message">{success}</div>}
      <h3>Emite tu voto</h3>
      {paramsLoading && <p style={{ fontSize: '0.75em', color: '#666' }}>Cargando parámetros...</p>}
      {params && <p style={{ fontSize: '0.75em', color: '#666', marginTop: '-4px' }}>Mínimo stake para votar: {params.minStakeVoting} tokens</p>}
      <div className="vote-buttons">
        <button className="btn btn-success" onClick={() => handleVote('FOR')} disabled={loading || panicked}>✅ Votar A Favor</button>
        <button className="btn btn-danger" onClick={() => handleVote('AGAINST')} disabled={loading || panicked}>❌ Votar En Contra</button>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { vote, changeVote, isPanicked } from '../services/web3Service';

export default function VotingPanel({ proposalId }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [panicked, setPanicked] = useState(false);

  useEffect(() => {
    isPanicked().then(setPanicked).catch(() => setPanicked(false));
  }, []);

  const handleVote = async (voteType) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      console.log('Votando', voteType, 'en propuesta', proposalId);
      // voteType: true para a favor, false para en contra
      const voteValue = voteType === 'FOR' ? true : false;
      const receipt = await vote(proposalId, voteValue);
      
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Voto registrado! Hash: ${txHash}`);
      setHasVoted(true);
      setUserVote(voteType);
    } catch (error) {
      console.error('Error votando:', error);
      setError(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeVote = async (newVoteType) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      console.log('Cambiando voto a', newVoteType);
      const voteValue = newVoteType === 'FOR' ? true : false;
      const receipt = await changeVote(proposalId, voteValue);
      
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Voto actualizado! Hash: ${txHash}`);
      setUserVote(newVoteType);
    } catch (error) {
      console.error('Error cambiando voto:', error);
      setError(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (hasVoted) {
    return (
      <div className="voting-panel voted">
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        <p className="vote-status">
          Ya has votado: <strong>{userVote === 'FOR' ? '✅ A Favor' : '❌ En Contra'}</strong>
        </p>
        <div className="change-vote-buttons">
          <button 
            className="btn btn-secondary"
            onClick={() => handleChangeVote('FOR')}
            disabled={loading || userVote === 'FOR'}
          >
            Cambiar a A Favor
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => handleChangeVote('AGAINST')}
            disabled={loading || userVote === 'AGAINST'}
          >
            Cambiar a En Contra
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="voting-panel">
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <h3>Emite tu voto</h3>
      <div className="vote-buttons">
        <button 
          className="btn btn-success"
          onClick={() => handleVote('FOR')}
          disabled={loading || panicked}
        >
          ✅ Votar A Favor
        </button>
        <button 
          className="btn btn-danger"
          onClick={() => handleVote('AGAINST')}
          disabled={loading || panicked}
        >
          ❌ Votar En Contra
        </button>
      </div>
    </div>
  );
}
