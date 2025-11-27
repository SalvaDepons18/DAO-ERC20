import { useState, useEffect } from 'react';
import ProposalCard from './ProposalCard';
import { 
  getSigner,
  getProposalCount,
  getProposal,
  getProposalResults
} from '../services/web3Service';
import { decodeRevert } from '../utils/decodeRevert';

export default function ProposalList({ refreshTrigger = 0 }) {
  const [filter, setFilter] = useState('ALL');
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userAddress, setUserAddress] = useState('');

  const filters = [
    { value: 'ALL', label: 'Todas' },
    { value: 'MINE', label: 'Mis Propuestas' },
    { value: 'ACTIVE', label: 'Activas' },
    { value: 'ACCEPTED', label: 'Aceptadas' },
    { value: 'REJECTED', label: 'Rechazadas' },
    { value: 'EXPIRED', label: 'Expiradas' }
  ];

  // State names now returned by getProposal (stateName, rawState)

  useEffect(() => {
    loadProposals();
  }, [refreshTrigger]);

  const loadProposals = async () => {
    try {
      setLoading(true);
      setError('');

      const signer = await getSigner();
      if (signer) {
        const address = await signer.getAddress();
        setUserAddress(address.toLowerCase());
      }

      // Obtener el número total de propuestas vía DAO facade
      const total = await getProposalCount();

      const loadedProposals = [];
      
      for (let i = 0; i < total; i++) {
        try {
          const proposal = await getProposal(i); // enhanced
          const { votesFor, votesAgainst } = await getProposalResults(i);
          const stateNum = proposal.rawState;
          const proposalData = {
            id: i,
            title: proposal.title,
            description: proposal.description,
            proposer: proposal.proposer,
            state: stateNum,
            stateName: proposal.stateName,
            votesFor: parseInt(votesFor),
            votesAgainst: parseInt(votesAgainst),
            deadline: parseInt(proposal.deadline.toString()) * 1000,
            timestamp: parseInt(proposal.createdAt.toString()) * 1000
          };
          loadedProposals.push(proposalData);
        } catch (error) {
        }
      }

      setProposals(loadedProposals);
    } catch (error) {
      const d = decodeRevert(error);
      setError(`Error al cargar propuestas: ${d}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = proposals.filter(p => {
    if (filter === 'ALL') return true;
    if (filter === 'MINE') {
      const proposer = (p?.proposer || '').toLowerCase();
      const ua = (userAddress || '').toLowerCase();
      return proposer && ua && proposer === ua;
    }
    return p.stateName === filter;
  });

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
            {filter === 'MINE'
              ? (!userAddress
                  ? 'Conecta tu wallet para ver tus propuestas'
                  : proposals.length === 0
                    ? 'No hay propuestas disponibles'
                    : 'No tienes propuestas creadas con la cuenta conectada')
              : (proposals.length === 0
                  ? 'No hay propuestas disponibles'
                  : 'No hay propuestas con este filtro')}
          </p>
        ) : (
          filteredProposals.map(proposal => (
            <ProposalCard 
              key={proposal.id} 
              proposal={proposal} 
              onProposalUpdated={loadProposals}
            />
          ))
        )}
      </div>
    </div>
  );
}
