import { useState, useEffect } from 'react';
import ProposalCard from './ProposalCard';
import { getProposalManagerContract, getSigner } from '../services/web3Service';

export default function ProposalList() {
  const [filter, setFilter] = useState('ALL');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const filters = [
    { value: 'ALL', label: 'Todas' },
    { value: 'ACTIVE', label: 'Activas' },
    { value: 'ACCEPTED', label: 'Aceptadas' },
    { value: 'REJECTED', label: 'Rechazadas' },
    { value: 'EXPIRED', label: 'Expiradas' }
  ];

  const stateNames = {
    0: 'ACTIVE',
    1: 'ACCEPTED',
    2: 'REJECTED',
    3: 'EXPIRED'
  };

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setLoading(true);
      setError('');

      const proposalManager = await getProposalManagerContract(true);
      
      // Obtener el número total de propuestas
      const totalProposals = await proposalManager.proposalCount();
      const total = parseInt(totalProposals.toString());

      const loadedProposals = [];
      
      for (let i = 0; i < total; i++) {
        try {
          const proposal = await proposalManager.getProposal(i);
          const state = await proposalManager.getProposalState(i);
          const [votesFor, votesAgainst] = await proposalManager.getProposalResults(i);

          loadedProposals.push({
            id: i,
            title: proposal.title,
            description: proposal.description,
            proposer: proposal.proposer,
            state: state,
            stateName: stateNames[state] || 'UNKNOWN',
            votesFor: parseInt(votesFor.toString()),
            votesAgainst: parseInt(votesAgainst.toString()),
            deadline: parseInt(proposal.deadline.toString()) * 1000,
            timestamp: parseInt(proposal.timestamp.toString()) * 1000
          });
        } catch (error) {
          console.warn(`Error cargando propuesta ${i}:`, error);
        }
      }

      setProposals(loadedProposals);
    } catch (error) {
      console.error('Error cargando propuestas:', error);
      setError(`Error al cargar propuestas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = proposals.filter(p => 
    filter === 'ALL' || p.stateName === filter
  );

  return (
    <div className="proposal-list">
      <h2>Propuestas de la DAO</h2>
      
      {error && <div className="error-message">{error}</div>}
      
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

      <button 
        className="btn btn-secondary" 
        onClick={loadProposals}
        disabled={loading}
        style={{ marginBottom: '1rem' }}
      >
        {loading ? 'Cargando...' : 'Actualizar'}
      </button>

      <div className="proposals">
        {loading ? (
          <p className="no-proposals">Cargando propuestas...</p>
        ) : filteredProposals.length === 0 ? (
          <p className="no-proposals">
            {proposals.length === 0 ? 'No hay propuestas disponibles' : 'No hay propuestas con este filtro'}
          </p>
        ) : (
          filteredProposals.map(proposal => (
            <ProposalCard key={proposal.id} proposal={proposal} />
          ))
        )}
      </div>
    </div>
  );
}
