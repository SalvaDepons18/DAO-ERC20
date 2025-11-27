import { useState } from 'react';
import { createProposal } from '../services/web3Service';
import useParameters from '../hooks/useParameters';
import { decodeRevert } from '../utils/decodeRevert';

export default function CreateProposal({ onTransactionSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { params, loading: paramsLoading, error: paramsError } = useParameters();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!title.trim() || !description.trim()) { setError('El título y descripción son requeridos'); return; }
    setLoading(true);
    try {
      const receipt = await createProposal(title, description);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`Propuesta creada! Tx: ${txHash}`);
      setTitle(''); setDescription('');
      onTransactionSuccess && onTransactionSuccess();
    } catch (e) {
      const decoded = decodeRevert(e);
      if (decoded === 'DuplicateProposal') {
        setError('Propuesta duplicada. Ya existe otra igual.');
      } else if (decoded === 'InsufficientProposingStake' || decoded === 'MinStakeNotMet') {
        const minStake = params ? params.minStakeProposing : 'mínimo';
        setError(`No tienes suficientes tokens stakeados para crear propuestas. Mínimo requerido: ${minStake} tokens. Ve a la sección de Staking para stakear tokens.`);
      } else if (/user (rejected|denied)/i.test(e.message || '')) {
        setError('Transacción rechazada por el usuario.');
      } else {
        setError(decoded);
      }
    } finally { setLoading(false); }
  };

  return (
    <div className="create-proposal">
      <h2>Crear Nueva Propuesta</h2>
      {(error || paramsError) && <div className="error-message">{error || paramsError}</div>}
      {success && <div className="success-message">{success}</div>}
      <p style={{ fontSize: '0.8em', color: '#666' }}>
        {paramsLoading ? 'Cargando parámetros...' : (params && `Stake mínimo para proponer: ${params.minStakeProposing} tokens`)}
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" disabled={loading} required />
        </div>
        <div className="form-group">
          <label>Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalle de la propuesta" rows={5} disabled={loading} required />
        </div>
        <button className="btn btn-primary" disabled={loading}>{loading ? 'Creando...' : 'Crear Propuesta'}</button>
      </form>
    </div>
  );
}
