import { useState } from 'react';
import { createProposal } from '../services/web3Service';
import useParameters from '../hooks/useParameters';

export default function CreateProposal({ onTransactionSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { params, loading: paramsLoading, error: paramsError } = useParameters();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!title.trim() || !description.trim()) { setError('El título y descripción son requeridos'); return; }
    setLoading(true);
    try {
      const receipt = await createProposal(title, description);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Propuesta creada exitosamente! Hash: ${txHash}`);
      setTitle(''); setDescription('');
      if (onTransactionSuccess) onTransactionSuccess();
    } catch (e) {
      const m = e.message || e.toString(); const d = e.data || '';
      if (d.includes('0x90c0d696') || m.includes('DuplicateProposal') || (m.includes('unknown custom error') && d.includes('90c0d696'))) {
        setError('⚠️ Propuesta duplicada. Ya existe otra igual.');
      } else if (d.includes('0xcabeb655') || m.includes('InsufficientProposingStake') || m.includes('MinStakeNotMet') || (m.includes('unknown custom error') && d.includes('cabeb655'))) {
        const dyn = params ? params.minStakeProposing : 'cantidad mínima';
        setError(`⚠️ Stake insuficiente para proponer. Mínimo requerido: ${dyn} tokens (haz stake en la sección Staking).`);
      } else if (m.includes('user rejected') || m.includes('user denied')) {
        setError('Transacción rechazada por el usuario.');
      } else { setError(`Error: ${m}`); }
    } finally { setLoading(false); }
  };

  return (
    <div className="create-proposal">
      <h2>Crear Nueva Propuesta</h2>
      {(error || paramsError) && <div className="error-message">{error || paramsError}</div>}
      {success && <div className="success-message">{success}</div>}
      <p style={{ fontSize: '0.85em', color: '#666' }}>
        {paramsLoading && 'Cargando parámetros...'}
        {params && `Necesitas mínimo stake para proponer: ${params.minStakeProposing} tokens`}
      </p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Título</label>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título de la propuesta" disabled={loading} required />
        </div>
        <div className="form-group">
          <label>Descripción</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe tu propuesta en detalle" rows={5} disabled={loading} required />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creando...' : 'Crear Propuesta'}</button>
      </form>
    </div>
  );
}
import { useState } from 'react';
import { createProposal } from '../services/web3Service';

export default function CreateProposal({ onTransactionSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !description.trim()) {
      setError('El título y descripción son requeridos');
      return;
    }

    setLoading(true);
    try {
      console.log('Creando propuesta:', { title, description });
      const receipt = await createProposal(title, description);
      
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Propuesta creada exitosamente! Hash: ${txHash}`);
      setTitle('');
      setDescription('');
      
      // Notificar al componente padre inmediatamente después de la confirmación
      if (onTransactionSuccess) {
        onTransactionSuccess();
      }
    } catch (error) {
      console.error('Error creando propuesta:', error);
      
      const errorMessage = error.message || error.toString();
      const errorData = error.data || '';
      
      // Error 0x90c0d696 = DuplicateProposal
      if (errorData.includes('0x90c0d696') || 
          errorMessage.includes('DuplicateProposal') ||
          (errorMessage.includes('unknown custom error') && errorData.includes('90c0d696'))) {
        setError('⚠️ Propuesta ya creada. Ya existe una propuesta idéntica con el mismo título y descripción.');
      }
      // Error 0xcabeb655 = InsufficientProposingStake
      else if (errorData.includes('0xcabeb655') || 
          errorMessage.includes('InsufficientProposingStake') ||
          (errorMessage.includes('unknown custom error') && errorData.includes('cabeb655'))) {
        setError('⚠️ No tienes suficiente stake para proponer. Necesitas mínimo 50 tokens stakeados. Ve a "Staking" → "Staking para Proponer"');
      } else if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
        setError(' Transacción rechazada por el usuario.');
      } else {
        setError(` Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-proposal">
      <h2>Crear Nueva Propuesta</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la propuesta"
            disabled={loading}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe tu propuesta en detalle"
            rows={5}
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Creando...' : 'Crear Propuesta'}
        </button>
      </form>
    </div>
  );
}
