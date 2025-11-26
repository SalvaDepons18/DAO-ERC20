import { useState } from 'react';
import ProposalDetail from './ProposalDetail';

export default function ProposalCard({ proposal, onProposalUpdated }) {
  const [showDetail, setShowDetail] = useState(false);

  const getStateLabel = (state) => {
    const states = {
      0: 'Activa',
      1: 'Aceptada',
      2: 'Rechazada',
      3: 'Expirada'
    };
    return states[state] || 'Desconocido';
  };

  const getStateClass = (state) => {
    const classes = {
      0: 'active',
      1: 'accepted',
      2: 'rejected',
      3: 'expired'
    };
    return classes[state] || '';
  };

  const totalVotes = proposal.votesFor + proposal.votesAgainst;
  const forPercentage = totalVotes > 0 ? ((proposal.votesFor / totalVotes) * 100).toFixed(1) : 0;

  return (
    <>
      <div className={`proposal-card ${getStateClass(proposal.state)}`}>
        <div className="proposal-header">
          <h3>{proposal.title}</h3>
          <span className={`badge ${getStateClass(proposal.state)}`}>
            {getStateLabel(proposal.state)}
          </span>
        </div>
        
        <p className="proposal-description">{proposal.description}</p>
        
        <div className="proposal-stats">
          <div className="stat">
            <span className="label">✅ A Favor</span>
            <span className="value">{proposal.votesFor}</span>
          </div>
          <div className="stat">
            <span className="label">❌ En Contra</span>
            <span className="value">{proposal.votesAgainst}</span>
          </div>
          <div className="stat">
            <span className="label">% A Favor</span>
            <span className="value">{forPercentage}%</span>
          </div>
        </div>

        <button 
          className="btn btn-primary" 
          onClick={() => setShowDetail(true)}
        >
          Ver Detalles y Votar
        </button>
      </div>

      {showDetail && (
        <ProposalDetail 
          proposal={proposal} 
          onClose={() => setShowDetail(false)}
          onProposalUpdated={() => {
            setShowDetail(false);
            if (onProposalUpdated) onProposalUpdated();
          }}
        />
      )}
    </>
  );
}
