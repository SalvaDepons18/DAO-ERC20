import { useState, useEffect } from 'react';
import VotingPanel from './VotingPanel';
import { finalizeProposal, expireProposal, isPanicked, getProposal, getSigner } from '../services/web3Service';
import { decodeRevert } from '../utils/decodeRevert';

export default function ProposalDetail({ proposal: initialProposal, onClose, onProposalUpdated }) {
  const [proposal, setProposal] = useState(initialProposal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [panicked, setPanicked] = useState(false);
  const [currentUserAddress, setCurrentUserAddress] = useState(null);

  // quick check panic state and get current user (non-blocking UI init)
  useEffect(() => {
    isPanicked().then(setPanicked).catch(() => setPanicked(false));
    getSigner().then(async (signer) => {
      if (signer) {
        const addr = await signer.getAddress();
        setCurrentUserAddress(addr.toLowerCase());
      }
    }).catch(() => setCurrentUserAddress(null));
  }, []);

  const refreshProposal = async () => {
    try {
      const updated = await getProposal(proposal.id);
      setProposal(updated);
    } catch (e) {
      console.error('Error refreshing proposal:', e);
    }
  };

  // Normalize seconds/ms to milliseconds
  const toMs = (val) => {
    const n = typeof val === 'bigint' ? Number(val) : Number(val);
    return n < 1e12 ? n * 1000 : n;
  };

  const formatDate = (timestamp) => {
    return new Date(toMs(timestamp)).toLocaleString('es-ES');
  };

  const getTimeRemaining = (deadlineSecOrMs) => {
    const now = Date.now();
    const deadlineMs = toMs(deadlineSecOrMs);
    const diff = deadlineMs - now;
    if (diff <= 0) return 'Finalizada';
    
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    
    if (days > 0) return `${days}d ${hours}h restantes`;
    if (hours > 0) return `${hours}h ${minutes}m restantes`;
    return `${minutes}m restantes`;
  };

  // Convertir bigints a números para cálculos
  const votesForNum = Number(proposal.votesFor || 0);
  const votesAgainstNum = Number(proposal.votesAgainst || 0);
  const totalVotes = votesForNum + votesAgainstNum;
  const forPercentage = totalVotes > 0 ? ((votesForNum / totalVotes) * 100).toFixed(1) : 0;
  const againstPercentage = totalVotes > 0 ? ((votesAgainstNum / totalVotes) * 100).toFixed(1) : 0;

  const deadlineMs = toMs(proposal.deadline);
  const isProposer = currentUserAddress && proposal.proposer && 
                     currentUserAddress === proposal.proposer.toLowerCase();
  const canExpire = proposal.stateName === 'ACTIVE' && Date.now() > deadlineMs;
  const canFinalize = proposal.stateName === 'ACTIVE' && Date.now() <= deadlineMs && isProposer;

  const onFinalize = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const receipt = await finalizeProposal(proposal.id);
      const hash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Propuesta finalizada. Tx: ${hash}`);
      // Notificar al padre para actualizar la lista
      if (onProposalUpdated) {
        setTimeout(() => onProposalUpdated(), 1500);
      }
    } catch (e) {
      setError(`❌ ${decodeRevert(e)}`);
    } finally { setLoading(false); }
  };

  const onExpire = async () => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const receipt = await expireProposal(proposal.id);
      const hash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Propuesta expirada. Tx: ${hash}`);
      // Notificar al padre para actualizar la lista
      if (onProposalUpdated) {
        setTimeout(() => onProposalUpdated(), 1500);
      }
    } catch (e) {
      setError(`❌ ${decodeRevert(e)}`);
    } finally { setLoading(false); }
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
                <strong>Proponente:</strong> {proposal.proposer ? `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}` : 'N/A'}
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
                  <span>{votesForNum} votos ({forPercentage}%)</span>
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
                  <span>{votesAgainstNum} votos ({againstPercentage}%)</span>
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
            <VotingPanel 
              key={`${proposal.id}-${votesForNum}-${votesAgainstNum}`}
              proposalId={proposal.id} 
              onVoteSuccess={refreshProposal} 
            />
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
