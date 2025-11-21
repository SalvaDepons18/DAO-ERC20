import { useState } from 'react';

export default function CreateProposal() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      console.log('Creando propuesta:', { title, description });
      // TODO: Crear propuesta en el contrato
      setTitle('');
      setDescription('');
    } catch (error) {
      console.error('Error creando propuesta:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-proposal">
      <h2>Crear Nueva Propuesta</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Título</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título de la propuesta"
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
