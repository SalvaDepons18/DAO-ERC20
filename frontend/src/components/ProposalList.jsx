import { useState } from 'react';
import ProposalCard from './ProposalCard';

export default function ProposalList() {
  const [filter, setFilter] = useState('ALL');
  const [proposals] = useState([
    // Mock data
    {
      id: 1,
      title: 'Ejemplo de Propuesta 1',
      description: 'Esta es una propuesta de ejemplo',
      state: 0, // ACTIVE
      votesFor: 100,
      votesAgainst: 50,
      deadline: Date.now() + 86400000
    }
  ]);

  const filters = [
    { value: 'ALL', label: 'Todas' },
    { value: 'ACTIVE', label: 'Activas' },
    { value: 'ACCEPTED', label: 'Aceptadas' },
    { value: 'REJECTED', label: 'Rechazadas' },
    { value: 'EXPIRED', label: 'Expiradas' }
  ];

  return (
    <div className="proposal-list">
      <h2>Propuestas de la DAO</h2>
      
      <div className="filters">
        {filters.map(f => (
          <button
            key={f.value}
            className={filter === f.value ? 'active' : ''}
            onClick={() => setFilter(f.value)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="proposals">
        {proposals.length === 0 ? (
          <p className="no-proposals">No hay propuestas disponibles</p>
        ) : (
          proposals.map(proposal => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))
        )}
      </div>
    </div>
  );
}
