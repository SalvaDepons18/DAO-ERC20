import { useState, useEffect } from 'react';
import { 
  unstakeVoting, 
  unstakeProposing,
  getVotingStake,
  getProposingStake,
  getSigner,
  getVotingPower,
  isPanicked
} from '../services/web3Service';
import useStake from '../hooks/useStake';
import useParameters from '../hooks/useParameters';

export default function StakingSection({ onTransactionSuccess }) {
  const [votingStake, setVotingStake] = useState('');
  const [proposingStake, setProposingStake] = useState('');
  const [activeTab, setActiveTab] = useState('voting');
  const [currentVotingStake, setCurrentVotingStake] = useState('0');
  const [currentProposingStake, setCurrentProposingStake] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approving, setApproving] = useState(false);
  const [votingPower, setVotingPower] = useState('0');
  const [panicked, setPanicked] = useState(false);

  const votingStakeHook = useStake('voting');
  const proposingStakeHook = useStake('proposing');
  const { params, loading: paramsLoading, error: paramsError } = useParameters();

  useEffect(() => { loadStakes(); }, []);

  const loadStakes = async () => {
    try {
      const signer = await getSigner();
      if (!signer) return;
      const address = await signer.getAddress();
      const votingAmount = await getVotingStake(address);
      const proposingAmount = await getProposingStake(address);
      const vp = await getVotingPower(address);
      const p = await isPanicked();
      setCurrentVotingStake(votingAmount);
      setCurrentProposingStake(proposingAmount);
      setVotingPower(vp.toString());
      setPanicked(p);
    } catch (e) { console.error('Error cargando stakes:', e); }
  };

  const handleApprove = async (amount) => {
    setError(''); setSuccess(''); setApproving(true);
    try {
      const hook = activeTab === 'voting' ? votingStakeHook : proposingStakeHook;
      await hook.approve(amount);
      setSuccess('✅ Tokens aprobados! Ahora puedes hacer stake.');
    } catch (e) { setError(`❌ Error al aprobar: ${e.message}`); } finally { setApproving(false); }
  };

  const handleStakeVoting = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!votingStake || parseFloat(votingStake) <= 0) { setError('Ingresa una cantidad válida'); return; }
    setLoading(true);
    try {
      const receipt = await votingStakeHook.stake(votingStake);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Stake exitoso! Hash: ${txHash}`);
      setVotingStake(''); await loadStakes();
      if (onTransactionSuccess) setTimeout(() => onTransactionSuccess(), 1500);
    } catch (e) {
      const m = e.message || e.toString(); const d = e.data || '';
      if (m.includes('insufficient allowance') || m.includes('ERC20: insufficient allowance') || m.includes('transfer amount exceeds allowance') || d.includes('0xfb8f41b2') || m.includes('unknown custom error')) {
        setError('Debes aprobar los tokens primero. Haz clic en "1. Aprobar Tokens"');
      } else if (m.includes('insufficient balance') || m.includes('transfer amount exceeds balance')) {
        setError('No tienes suficientes tokens. Compra más tokens primero.');
      } else if (m.includes('user rejected') || m.includes('user denied')) {
        setError('Transacción rechazada por el usuario.');
      } else if (m.includes('MinStakeNotMet')) {
        setError(`Cantidad inferior al mínimo (${params?.minStakeVoting || 'mínimo'} tokens).`);
      } else { setError(`Error: ${m}`); }
    } finally { setLoading(false); }
  };

  const handleStakeProposing = async (e) => {
    e.preventDefault(); setError(''); setSuccess('');
    if (!proposingStake || parseFloat(proposingStake) <= 0) { setError('Ingresa una cantidad válida'); return; }
    setLoading(true);
    try {
      const receipt = await proposingStakeHook.stake(proposingStake);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Stake exitoso! Hash: ${txHash}`);
      setProposingStake(''); await loadStakes();
      if (onTransactionSuccess) setTimeout(() => onTransactionSuccess(), 1500);
    } catch (e) {
      const m = e.message || e.toString(); const d = e.data || '';
      if (m.includes('insufficient allowance') || m.includes('ERC20: insufficient allowance') || m.includes('transfer amount exceeds allowance') || d.includes('0xfb8f41b2') || m.includes('unknown custom error')) {
        setError('Debes aprobar los tokens primero. Haz clic en "1. Aprobar Tokens"');
      } else if (m.includes('insufficient balance') || m.includes('transfer amount exceeds balance')) {
        setError('No tienes suficientes tokens. Compra más tokens primero.');
      } else if (m.includes('user rejected') || m.includes('user denied')) {
        setError('Transacción rechazada por el usuario.');
      } else if (m.includes('MinStakeNotMet')) {
        setError(`Cantidad inferior al mínimo (${params?.minStakeProposing || 'mínimo'} tokens).`);
      } else { setError(`Error: ${m}`); }
    } finally { setLoading(false); }
  };

  const handleUnstake = async (type) => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const receipt = type === 'voting' ? await unstakeVoting() : await unstakeProposing();
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Unstake exitoso! Hash: ${txHash}`);
      await loadStakes();
      if (onTransactionSuccess) setTimeout(() => onTransactionSuccess(), 1500);
    } catch (e) {
      const m = e.message || e.toString(); const d = e.data || '';
      if (d.includes('0xf1bc94d2') || m.includes('StakeLocked') || (m.includes('unknown custom error') && d.includes('f1bc94d2'))) {
        const lockMsg = params ? (params.lockTimeDays > 0 ? `${params.lockTimeDays} días` : `${params.lockTimeSeconds} segundos`) : 'el periodo de bloqueo';
        setError(`⚠️ Tu stake todavía está bloqueado. Debes esperar ${lockMsg} para poder retirarlo.`);
      } else if (m.includes('user rejected') || m.includes('user denied')) {
        setError('❌ Transacción rechazada por el usuario.');
      } else { setError(`❌ Error: ${m}`); }
    } finally { setLoading(false); }
  };

  return (
    <div className="staking-section">
      <h2>Gestión de Staking</h2>
      {(error || paramsError) && <div className="error-message">{error || paramsError}</div>}
      {success && <div className="success-message">{success}</div>}
      <div className="tabs">
        <button className={activeTab === 'voting' ? 'active' : ''} onClick={() => setActiveTab('voting')}>Staking para Votar</button>
        <button className={activeTab === 'proposing' ? 'active' : ''} onClick={() => setActiveTab('proposing')}>Staking para Proponer</button>
      </div>
      {activeTab === 'voting' && (
        <div className="staking-form">
          <form onSubmit={handleStakeVoting}>
            <input type="number" value={votingStake} onChange={(e) => setVotingStake(e.target.value)} placeholder="Cantidad de tokens" min="0" disabled={loading || approving} required />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => handleApprove(votingStake)} disabled={loading || approving || !votingStake || parseFloat(votingStake) <= 0}>{approving ? 'Aprobando...' : '1. Aprobar Tokens (Staking)'}</button>
              <button type="submit" className="btn btn-primary" disabled={loading || approving}>{loading ? 'Procesando...' : '2. Stake para Votar'}</button>
            </div>
          </form>
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>{paramsLoading ? 'Cargando parámetros...' : (params && `ℹ️ Mínimo actual: ${params.minStakeVoting} tokens`)}</p>
          {params && <p style={{ fontSize: '0.75em', color: '#666', marginTop: '4px' }}>⏱️ Lock: {params.lockTimeDays > 0 ? `${params.lockTimeDays} días` : `${params.lockTimeSeconds} s`}</p>}
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>🗳️ Poder de voto actual: <strong>{votingPower}</strong></p>
          <div className="current-stake">
            <p>Stake actual: <strong>{currentVotingStake} SHA</strong></p>
            {parseFloat(currentVotingStake) > 0 && <button className="btn btn-secondary" onClick={() => handleUnstake('voting')} disabled={loading}>Retirar Stake</button>}
          </div>
        </div>
      )}
      {activeTab === 'proposing' && (
        <div className="staking-form">
          <form onSubmit={handleStakeProposing}>
            <input type="number" value={proposingStake} onChange={(e) => setProposingStake(e.target.value)} placeholder="Cantidad de tokens" min="0" disabled={loading || approving} required />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => handleApprove(proposingStake)} disabled={loading || approving || !proposingStake || parseFloat(proposingStake) <= 0}>{approving ? 'Aprobando...' : '1. Aprobar Tokens'}</button>
              <button type="submit" className="btn btn-primary" disabled={loading || approving}>{loading ? 'Procesando...' : '2. Stake para Proponer'}</button>
            </div>
          </form>
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>{paramsLoading ? 'Cargando parámetros...' : (params && `ℹ️ Mínimo actual: ${params.minStakeProposing} tokens`)}</p>
          {params && <p style={{ fontSize: '0.75em', color: '#666', marginTop: '4px' }}>⏱️ Lock: {params.lockTimeDays > 0 ? `${params.lockTimeDays} días` : `${params.lockTimeSeconds} s`}</p>}
          <div className="current-stake">
            <p>Stake actual: <strong>{currentProposingStake} SHA</strong></p>
            {parseFloat(currentProposingStake) > 0 && <button className="btn btn-secondary" onClick={() => handleUnstake('proposing')} disabled={loading}>Retirar Stake</button>}
          </div>
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from 'react';
import { 
  unstakeVoting, 
  unstakeProposing,
  getVotingStake,
  getProposingStake,
  getSigner,
  getVotingPower,
  isPanicked
} from '../services/web3Service';
import useStake from '../hooks/useStake';
import { CONTRACT_ADDRESSES } from '../config/contracts';

export default function StakingSection({ onTransactionSuccess }) {
  const [votingStake, setVotingStake] = useState('');
  const [proposingStake, setProposingStake] = useState('');
  const [activeTab, setActiveTab] = useState('voting');
  const [currentVotingStake, setCurrentVotingStake] = useState('0');
  const [currentProposingStake, setCurrentProposingStake] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [approving, setApproving] = useState(false);
  const [votingPower, setVotingPower] = useState('0');
  const [panicked, setPanicked] = useState(false);

  const votingStakeHook = useStake('voting');
  const proposingStakeHook = useStake('proposing');

  useEffect(() => {
    loadStakes();
  }, []);

  const loadStakes = async () => {
    try {
      const signer = await getSigner();
      if (!signer) return;

      const address = await signer.getAddress();
      const votingAmount = await getVotingStake(address);
      const proposingAmount = await getProposingStake(address);
      const vp = await getVotingPower(address);
      const p = await isPanicked();
      
      setCurrentVotingStake(votingAmount);
      setCurrentProposingStake(proposingAmount);
      setVotingPower(vp.toString());
      setPanicked(p);
    } catch (error) {
      console.error('Error cargando stakes:', error);
    }
  };

  const handleApprove = async (amount) => {
    setError('');
    setSuccess('');
    setApproving(true);
    try {
      console.log('Aprobando', amount, 'tokens al Staking...');
      // Decide hook based on active tab
      const hook = activeTab === 'voting' ? votingStakeHook : proposingStakeHook;
      await hook.approve(amount);
      setSuccess(`✅ Tokens aprobados! Ahora puedes hacer stake.`);
    } catch (error) {
      console.error('Error aprobando tokens:', error);
      setError(`❌ Error al aprobar: ${error.message}`);
    } finally {
      setApproving(false);
    }
  };

  const handleStakeVoting = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!votingStake || parseFloat(votingStake) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    setLoading(true);
    try {
      console.log('Staking', votingStake, 'para votar...');
      const receipt = await votingStakeHook.stake(votingStake);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Stake exitoso! Hash: ${txHash}`);
      setVotingStake('');
      await loadStakes();
      
      // Notificar al componente padre
      if (onTransactionSuccess) {
        setTimeout(() => {
          onTransactionSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error('Error en stake voting:', error);
      
      // Detectar errores comunes y mostrar mensajes amigables
      const errorMessage = error.message || error.toString();
      const errorData = error.data || '';
      
      // Error de aprobación insuficiente (custom error 0xfb8f41b2 = ERC20InsufficientAllowance)
      if (errorMessage.includes('insufficient allowance') || 
          errorMessage.includes('ERC20: insufficient allowance') ||
          errorMessage.includes('transfer amount exceeds allowance') ||
          errorData.includes('0xfb8f41b2') ||
          errorMessage.includes('unknown custom error')) {
        setError('Debes aprobar los tokens primero. Haz clic en "1. Aprobar Tokens"');
      } else if (errorMessage.includes('insufficient balance') || 
                 errorMessage.includes('transfer amount exceeds balance')) {
        setError(' No tienes suficientes tokens. Compra más tokens primero.');
      } else if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
        setError(' Transacción rechazada por el usuario.');
      } else {
        setError(` Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStakeProposing = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!proposingStake || parseFloat(proposingStake) <= 0) {
      setError('Ingresa una cantidad válida');
      return;
    }

    setLoading(true);
    try {
      console.log('Staking', proposingStake, 'para proponer...');
      const receipt = await proposingStakeHook.stake(proposingStake);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Stake exitoso! Hash: ${txHash}`);
      setProposingStake('');
      await loadStakes();
      
      // Notificar al componente padre
      if (onTransactionSuccess) {
        setTimeout(() => {
          onTransactionSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error('Error en stake proposing:', error);
      
      // Detectar errores comunes y mostrar mensajes amigables
      const errorMessage = error.message || error.toString();
      const errorData = error.data || '';
      
      // Error de aprobación insuficiente (custom error 0xfb8f41b2 = ERC20InsufficientAllowance)
      if (errorMessage.includes('insufficient allowance') || 
          errorMessage.includes('ERC20: insufficient allowance') ||
          errorMessage.includes('transfer amount exceeds allowance') ||
          errorData.includes('0xfb8f41b2') ||
          errorMessage.includes('unknown custom error')) {
        setError(' Debes aprobar los tokens primero. Haz clic en "1. Aprobar Tokens"');
      } else if (errorMessage.includes('insufficient balance') || 
                 errorMessage.includes('transfer amount exceeds balance')) {
        setError(' No tienes suficientes tokens. Compra más tokens primero.');
      } else if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
        setError(' Transacción rechazada por el usuario.');
      } else {
        setError(` Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (type) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      let receipt;
      if (type === 'voting') {
        receipt = await unstakeVoting();
      } else {
        receipt = await unstakeProposing();
      }
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`✅ Unstake exitoso! Hash: ${txHash}`);
      await loadStakes();
      
      // Notificar al componente padre
      if (onTransactionSuccess) {
        setTimeout(() => {
          onTransactionSuccess();
        }, 1500);
      }
    } catch (error) {
      console.error('Error en unstake:', error);
      
      const errorMessage = error.message || error.toString();
      const errorData = error.data || '';
      
      // Error 0xf1bc94d2 = StakeLocked
      if (errorData.includes('0xf1bc94d2') || 
          errorMessage.includes('StakeLocked') ||
          (errorMessage.includes('unknown custom error') && errorData.includes('f1bc94d2'))) {
        setError('⚠️ Tu stake todavía está bloqueado. Debes esperar 7 días desde que hiciste el stake para poder retirarlo.');
      } else if (errorMessage.includes('user rejected') || errorMessage.includes('user denied')) {
        setError('❌ Transacción rechazada por el usuario.');
      } else {
        setError(`❌ Error: ${errorMessage}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="staking-section">
      <h2>Gestión de Staking</h2>
      
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
      
      <div className="tabs">
        <button 
          className={activeTab === 'voting' ? 'active' : ''} 
          onClick={() => setActiveTab('voting')}
        >
          Staking para Votar
        </button>
        <button 
          className={activeTab === 'proposing' ? 'active' : ''} 
          onClick={() => setActiveTab('proposing')}
        >
          Staking para Proponer
        </button>
      </div>

      {activeTab === 'voting' && (
        <div className="staking-form">
          <form onSubmit={handleStakeVoting}>
            <input
              type="number"
              value={votingStake}
              onChange={(e) => setVotingStake(e.target.value)}
              placeholder="Cantidad de tokens"
              min="0"
              disabled={loading || approving}
              required
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleApprove(votingStake)}
                disabled={loading || approving || !votingStake || parseFloat(votingStake) <= 0}
              >
                {approving ? 'Aprobando...' : '1. Aprobar Tokens (Staking)'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || approving}>
                {loading ? 'Procesando...' : '2. Stake para Votar'}
              </button>
            </div>
          </form>
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>
            ℹ️ Mínimo: 10 tokens
          </p>
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
            🗳️ Poder de voto actual: <strong>{votingPower}</strong>
          </p>
          <div className="current-stake">
            <p>Stake actual: <strong>{currentVotingStake} SHA</strong></p>
            {parseFloat(currentVotingStake) > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={() => handleUnstake('voting')}
                disabled={loading}
              >
                Retirar Stake
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'proposing' && (
        <div className="staking-form">
          <form onSubmit={handleStakeProposing}>
            <input
              type="number"
              value={proposingStake}
              onChange={(e) => setProposingStake(e.target.value)}
              placeholder="Cantidad de tokens"
              min="0"
              disabled={loading || approving}
              required
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => handleApprove(proposingStake)}
                disabled={loading || approving || !proposingStake || parseFloat(proposingStake) <= 0}
              >
                {approving ? 'Aprobando...' : '1. Aprobar Tokens'}
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading || approving}>
                {loading ? 'Procesando...' : '2. Stake para Proponer'}
              </button>
            </div>
          </form>
          <p style={{ fontSize: '0.9em', color: '#666', marginTop: '8px' }}>
            ℹ️ Mínimo: 50 tokens
          </p>
          <div className="current-stake">
            <p>Stake actual: <strong>{currentProposingStake} SHA</strong></p>
            {parseFloat(currentProposingStake) > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={() => handleUnstake('proposing')}
                disabled={loading}
              >
                Retirar Stake
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
