import { useState, useEffect } from 'react';
import { vote, changeVote, getUserVote, hasUserVoted, getSigner, getVotingPower, getVotingStake } from '../services/web3Service';
import useParameters from '../hooks/useParameters';
import { decodeRevert } from '../utils/decodeRevert';

export default function VotingPanel({ proposalId, onVoteSuccess }) {
  const [userVote, setUserVote] = useState('NONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [userVotingPower, setUserVotingPower] = useState(null);
  const { params, loading: paramsLoading, error: paramsError } = useParameters();

  const refreshVoteState = async () => {
    try {
      const signer = await getSigner();
      if (!signer) return;
      const addr = await signer.getAddress();
      const voted = await hasUserVoted(proposalId, addr);
      if (voted) {
        const v = await getUserVote(proposalId, addr);
        setUserVote(v);
      } else {
        setUserVote('NOT_VOTED');
      }
      const vp = await getVotingPower(addr);
      const vs = await getVotingStake(addr);
      setUserVotingPower({ power: vp, stake: vs });
    } catch (e) {
    }
  };

  useEffect(() => { refreshVoteState(); }, [proposalId]);

  const handleVote = async (voteType) => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const support = voteType === 'FOR';
      const receipt = await vote(proposalId, support);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`Voto registrado. Tx: ${txHash}`);
      await refreshVoteState();
      if (onVoteSuccess) {
        setTimeout(() => onVoteSuccess(), 500);
      }
    } catch (e) {
      const decoded = decodeRevert(e);
      if (decoded === 'MinStakeNotMet' || decoded === 'InsufficientStake') {
        const minStake = params ? params.minStakeVoting : 'requerido';
        setError(`No tienes suficientes tokens stakeados para votar. Mínimo requerido: ${minStake} tokens. Ve a la sección de Staking para stakear más tokens.`);
      } else if (decoded === 'InvalidVoteType') {
        const minStake = params ? params.minStakeVoting : 'requerido';
        const currentStake = userVotingPower ? userVotingPower.stake : '0';
        const currentPower = userVotingPower ? userVotingPower.power : '0';
        setError(`No tienes poder de voto (actual: ${currentPower}). Tu stake de voting: ${currentStake} tokens. Mínimo requerido: ${minStake} tokens. Ve a la sección de Staking y stakea en "Staking para Votar".`);
      } else if (decoded === 'ProposalNotActive') {
        setError('No se puede votar en propuestas finalizadas. Esta propuesta ya no está activa.');
      } else if (decoded === 'ProposalDeadlinePassed') {
        setError('El plazo para votar ha expirado. Esta propuesta debe ser finalizada.');
      } else if (/user (rejected|denied)/i.test(e.message || '')) {
        setError('Transacción rechazada por el usuario.');
      } else {
        setError(decoded);
      }
    } finally { setLoading(false); }
  };

  const handleChangeVote = async (newVoteType) => {
    setError(''); setSuccess(''); setLoading(true);
    try {
      const support = newVoteType === 'FOR';
      const receipt = await changeVote(proposalId, support);
      const txHash = receipt.hash || receipt.transactionHash;
      setSuccess(`Voto actualizado. Tx: ${txHash}`);
      await refreshVoteState();
      if (onVoteSuccess) {
        setTimeout(() => onVoteSuccess(), 500);
      }
    } catch (e) {
      const decoded = decodeRevert(e);
      if (decoded === 'MinStakeNotMet' || decoded === 'InsufficientStake') {
        const minStake = params ? params.minStakeVoting : 'requerido';
        setError(`No tienes suficientes tokens stakeados para votar. Mínimo requerido: ${minStake} tokens. Ve a la sección de Staking para stakear más tokens.`);
      } else if (decoded === 'InvalidVoteType') {
        const minStake = params ? params.minStakeVoting : 'requerido';
        const currentStake = userVotingPower ? userVotingPower.stake : '0';
        const currentPower = userVotingPower ? userVotingPower.power : '0';
        setError(`No tienes poder de voto (actual: ${currentPower}). Tu stake de voting: ${currentStake} tokens. Mínimo requerido: ${minStake} tokens. Ve a la sección de Staking y stakea en "Staking para Votar".`);
      } else if (decoded === 'ProposalNotActive') {
        setError('No se puede cambiar el voto en propuestas finalizadas. Esta propuesta ya no está activa.');
      } else if (decoded === 'ProposalDeadlinePassed') {
        setError('El plazo para cambiar el voto ha expirado. Esta propuesta debe ser finalizada.');
      } else if (/user (rejected|denied)/i.test(e.message || '')) {
        setError('Transacción rechazada por el usuario.');
      } else {
        setError(decoded);
      }
    } finally { setLoading(false); }
  };

  const hasVoted = userVote !== 'NONE' && userVote !== 'NOT_VOTED';

  return (
    <div className={`voting-panel ${hasVoted ? 'voted' : ''}`}> 
      {(error || paramsError) && <div className="error-message">{error || paramsError}</div>}
      {success && <div className="success-message">{success}</div>}
      {!hasVoted && <h3>Emite tu voto</h3>}
      {paramsLoading && <p style={{ fontSize: '0.75em', color: '#666' }}>Cargando parámetros...</p>}
      {params && <p style={{ fontSize: '0.75em', color: '#666', marginTop: '-4px' }}>Mínimo stake para votar: {params.minStakeVoting} tokens</p>}
      {hasVoted ? (
        <>
          <p className="vote-status">Ya has votado: <strong>{userVote === 'FOR' ? 'A Favor' : 'En Contra'}</strong></p>
          <div className="change-vote-buttons">
            <button className="btn btn-secondary" onClick={() => handleChangeVote('FOR')} disabled={loading || userVote === 'FOR'}>Cambiar a A Favor</button>
            <button className="btn btn-secondary" onClick={() => handleChangeVote('AGAINST')} disabled={loading || userVote === 'AGAINST'}>Cambiar a En Contra</button>
          </div>
        </>
      ) : (
        <div className="vote-buttons">
          <button className="btn btn-success" onClick={() => handleVote('FOR')} disabled={loading}>Votar A Favor</button>
          <button className="btn btn-danger" onClick={() => handleVote('AGAINST')} disabled={loading}>Votar En Contra</button>
        </div>
      )}
    </div>
  );
}
