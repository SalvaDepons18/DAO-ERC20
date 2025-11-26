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
      console.log('📋 ProposalList: Cargando propuestas...');
      setLoading(true);
      setError('');

      const signer = await getSigner();
      if (signer) {
        const address = await signer.getAddress();
        setUserAddress(address.toLowerCase());
        console.log('👤 Usuario conectado:', address);
        console.log('👤 Usuario conectado (lowercase):', address.toLowerCase());
      } else {
        console.warn('No hay signer disponible');
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
          console.log(`   📍 Proposer: ${proposalData.proposer}`);
          console.log(`   📍 Proposer (lowercase): ${proposalData.proposer.toLowerCase()}`);
          loadedProposals.push(proposalData);
        } catch (error) {
          console.error(`❌ Error cargando propuesta ${i}:`, error);
        }
      }

      console.log('📝 Total propuestas cargadas:', loadedProposals.length);
      setProposals(loadedProposals);
    } catch (error) {
      console.error('Error cargando propuestas:', error);
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
      console.log('🔍 Comparando MINE:', { proposer, ua, match: proposer === ua });
      return proposer && ua && proposer === ua;
    }
    const matches = p.stateName === filter;
    if (filter === 'EXPIRED') {
      console.log(`🔍 Propuesta ${p.id}: stateName="${p.stateName}", matches=${matches}`);
    }
    return matches;
  });

  console.log('🔍 Filtro actual:', filter);
  console.log('📋 Propuestas totales:', proposals.length);
  console.log('👤 Usuario actual:', userAddress);
  console.log('✅ Propuestas filtradas:', filteredProposals.length);
  if (filter === 'MINE' && filteredProposals.length === 0 && proposals.length > 0) {
    console.warn('MINE está vacío. Propuestas disponibles:');
    proposals.forEach(p => {
      console.log(`   - ID ${p.id}: proposer=${p.proposer.toLowerCase()}, match=${p.proposer.toLowerCase() === userAddress}`);
    });
  }

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
