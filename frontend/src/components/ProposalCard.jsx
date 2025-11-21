import { useState } from 'react';
import ProposalDetail from './ProposalDetail';

export default function ProposalCard({ proposal }) {
  const [showDetail, setShowDetail] = useState(false);

  const getStateLabel = (state) => {
    const states = ['Activa', 'Aceptada', 'Rechazada', 'Expirada'];
    return states[state] || 'Desconocido';
  };

  const getStateClass = (state) => {
    const classes = ['active', 'accepted', 'rejected', 'expired'];
    return classes[state] || '';
  };

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
            <span className="label">A Favor</span>
            <span className="value">{proposal.votesFor}</span>
          </div>
          <div className="stat">
            <span className="label">En Contra</span>
            <span className="value">{proposal.votesAgainst}</span>
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
        />
      )}
    </>
  );
}
