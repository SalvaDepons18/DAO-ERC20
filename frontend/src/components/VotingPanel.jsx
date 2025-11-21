import { useState } from 'react';

export default function VotingPanel({ proposalId }) {
  const [hasVoted, setHasVoted] = useState(false);
  const [userVote, setUserVote] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleVote = async (voteType) => {
    setLoading(true);
    try {
      console.log('Votando', voteType, 'en propuesta', proposalId);
      // TODO: Llamar al contrato
      setHasVoted(true);
      setUserVote(voteType);
    } catch (error) {
      console.error('Error votando:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangeVote = async (newVoteType) => {
    setLoading(true);
    try {
      console.log('Cambiando voto a', newVoteType);
      setUserVote(newVoteType);
    } catch (error) {
      console.error('Error cambiando voto:', error);
    } finally {
      setLoading(false);
    }
  };

  if (hasVoted) {
    return (
      <div className="voting-panel voted">
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
      <h3>Emite tu voto</h3>
      <div className="vote-buttons">
        <button 
          className="btn btn-success"
          onClick={() => handleVote('FOR')}
          disabled={loading}
        >
          ✅ Votar A Favor
        </button>
        <button 
          className="btn btn-danger"
          onClick={() => handleVote('AGAINST')}
          disabled={loading}
        >
          ❌ Votar En Contra
        </button>
      </div>
    </div>
  );
}
