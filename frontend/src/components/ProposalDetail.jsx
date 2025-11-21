import VotingPanel from './VotingPanel';

export default function ProposalDetail({ proposal, onClose }) {
  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('es-ES');
  };

  const getTimeRemaining = (deadline) => {
    const now = Date.now();
    const diff = deadline - now;
    if (diff <= 0) return 'Finalizada';
    
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    return `${days}d ${hours}h restantes`;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{proposal.title}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="proposal-info">
            <p><strong>Descripción:</strong></p>
            <p>{proposal.description}</p>
            
            <div className="info-grid">
              <div>
                <strong>ID:</strong> #{proposal.id}
              </div>
              <div>
                <strong>Estado:</strong> {proposal.state}
              </div>
              <div>
                <strong>Tiempo restante:</strong> {getTimeRemaining(proposal.deadline)}
              </div>
            </div>

            <div className="voting-stats">
              <div className="stat-bar">
                <div className="bar-label">
                  <span>A Favor</span>
                  <span>{proposal.votesFor} votos</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress for" 
                    style={{ width: `${(proposal.votesFor / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                  />
                </div>
              </div>

              <div className="stat-bar">
                <div className="bar-label">
                  <span>En Contra</span>
                  <span>{proposal.votesAgainst} votos</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress against" 
                    style={{ width: `${(proposal.votesAgainst / (proposal.votesFor + proposal.votesAgainst)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {proposal.state === 0 && (
            <VotingPanel proposalId={proposal.id} />
          )}

          <div className="voters-section">
            <h3>Votantes</h3>
            <p className="text-muted">Aquí se mostrarán los votantes y sus votos</p>
          </div>
        </div>
      </div>
    </div>
  );
}
