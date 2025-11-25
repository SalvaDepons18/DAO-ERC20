import { useState } from 'react';
import VotingPanel from './VotingPanel';
import { finalizeProposal, expireProposal, isPanicked } from '../services/web3Service';

export default function ProposalDetail({ proposal, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [panicked, setPanicked] = useState(false);

  // quick check panic state (non-blocking UI init)
  isPanicked().then(setPanicked).catch(() => setPanicked(false));
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-ES');
  };

  const getTimeRemaining = (deadline) => {
    const now = Date.now();
    const diff = deadline - now;
    if (diff <= 0) return 'Finalizada';
    
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (days > 0) return `${days}d ${hours}h restantes`;
    if (hours > 0) return `${hours}h ${minutes}m restantes`;
    return `${minutes}m restantes`;
  };

  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0 ? ((proposal.votesFor / totalVotes) * 100).toFixed(1) : 0;
  const againstPercentage = totalVotes > 0 ? ((proposal.votesAgainst / totalVotes) * 100).toFixed(1) : 0;

  const canExpire = proposal.stateName === 'ACTIVE' && Date.now() > proposal.deadline;
  const canFinalize = proposal.stateName === 'ACTIVE' && Date.now() <= proposal.deadline;

  const onFinalize = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const receipt = await finalizeProposal(proposal.id, 0n);
      const hash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Propuesta finalizada. Tx: ${hash}`);
    } catch (e) {
      setError(`❌ Error finalizando: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onExpire = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const receipt = await expireProposal(proposal.id);
      const hash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Propuesta expirada. Tx: ${hash}`);
    } catch (e) {
      setError(`❌ Error expirando: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{proposal.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {error && <div className="error-message">{error}</div>}
          {success && <div className="success-message">{success}</div>}
          <div className="proposal-info">
            <p><strong>Descripción:</strong></p>
            <p>{proposal.description}</p>
            
            <div className="info-grid">
              <div>
                <strong>ID de Propuesta:</strong> #{proposal.id}
              </div>
              <div>
                <strong>Estado:</strong> <span className={`badge ${proposal.stateName?.toLowerCase()}`}>{proposal.stateName}</span>
              </div>
              <div>
                <strong>Tiempo restante:</strong> {getTimeRemaining(proposal.deadline)}
              </div>
              <div>
                <strong>Creada:</strong> {formatDate(proposal.timestamp)}
              </div>
              <div>
                <strong>Total de votos:</strong> {totalVotes}
              </div>
            </div>

            <div className="voting-stats">
              <div className="stat-bar">
                <div className="bar-label">
                  <span>✅ A Favor</span>
                  <span>{proposal.votesFor} votos ({forPercentage}%)</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress for" 
                    style={{ width: `${forPercentage}%` }}
                  />
                </div>
              </div>

              <div className="stat-bar">
                <div className="bar-label">
                  <span>❌ En Contra</span>
                  <span>{proposal.votesAgainst} votos ({againstPercentage}%)</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress against" 
                    style={{ width: `${againstPercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {proposal.stateName === 'ACTIVE' && (
            <VotingPanel proposalId={proposal.id} />
          )}

          {proposal.stateName !== 'ACTIVE' && (
            <div className="proposal-closed">
              <p className="text-muted">Esta propuesta ya no está activa</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
            {canFinalize && (
              <button className="btn btn-secondary" onClick={onFinalize} disabled={loading || panicked}>
                Finalizar Propuesta
              </button>
            )}
            {canExpire && (
              <button className="btn btn-secondary" onClick={onExpire} disabled={loading || panicked}>
                Expirar Propuesta
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
