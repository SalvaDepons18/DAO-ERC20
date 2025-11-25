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
      
      // Notificar al componente padre
      if (onTransactionSuccess) {
        setTimeout(() => {
          onTransactionSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error('Error creando propuesta:', error);
      setError(`❌ Error: ${error.message}`);
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
