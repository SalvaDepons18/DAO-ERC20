import { useState, useEffect } from 'react';
import ProposalCard from './ProposalCard';
import { 
  getSigner,
  getProposalCount,
  getProposal,
  getProposalResults
} from '../services/web3Service';

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
      console.log('📋 ProposalList: Cargando propuestas...');
      setLoading(true);
      setError('');

      const signer = await getSigner();
      if (signer) {
        const address = await signer.getAddress();
        setUserAddress(address.toLowerCase());
        console.log('👤 Usuario conectado:', address);
      }

      // Obtener el número total de propuestas vía DAO facade
      const total = await getProposalCount();
      console.log('📊 Total de propuestas a cargar:', total);

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
          console.log(`✅ Propuesta ${i} cargada:`, proposalData.title, `(${proposalData.stateName})`);
          loadedProposals.push(proposalData);
        } catch (error) {
          console.error(`❌ Error cargando propuesta ${i}:`, error);
        }
      }

      console.log('📝 Total propuestas cargadas:', loadedProposals.length);
      setProposals(loadedProposals);
    } catch (error) {
      console.error('Error cargando propuestas:', error);
      setError(`Error al cargar propuestas: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = proposals.filter(p => {
    if (filter === 'ALL') return true;
    if (filter === 'MINE') return p.proposer.toLowerCase() === userAddress;
    return p.stateName === filter;
  });

  console.log('🔍 Filtro actual:', filter);
  console.log('📋 Propuestas totales:', proposals.length);
  console.log('✅ Propuestas filtradas:', filteredProposals.length);

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
