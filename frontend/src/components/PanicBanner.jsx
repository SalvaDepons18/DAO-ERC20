import { useEffect, useState } from 'react';
import { isPanicked } from '../services/web3Service';

export default function PanicBanner() {
  const [panicked, setPanicked] = useState(false);
  useEffect(() => {
    let mounted = true;
    const check = async () => {
      try { const p = await isPanicked(); if (mounted) setPanicked(p); } catch { if (mounted) setPanicked(false); }
    };
    check();
    return () => { mounted = false; };
  }, []);
  if (!panicked) return null;
  return (
    <div style={{
      background: '#ff4d4f',
      color: 'white',
      padding: '10px 16px',
      borderRadius: '6px',
      marginBottom: '16px',
      fontWeight: '500',
      boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
    }}>
      La DAO está en estado de PÁNICO. Las operaciones están bloqueadas.
    </div>
  );
}
