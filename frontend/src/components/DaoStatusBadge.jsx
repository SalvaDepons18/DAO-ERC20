import { useState, useEffect } from "react";
import { getDaoStatus } from "../services/web3Service";

export default function DaoStatusBadge() {
  const [isPanicked, setIsPanicked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStatus();
    // Sin auto-refresh para evitar rate limiting
  }, []);

  const loadStatus = async () => {
    try {
      setError(null);
      const status = await getDaoStatus();
      setIsPanicked(status);
    } catch (err) {
      console.error("Error al cargar estado del DAO:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dao-status-badge loading">
        <span className="spinner">⏳</span>
        <span>Cargando estado...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dao-status-badge error">
        <span>⚠️</span>
        <span>Error al cargar estado</span>
      </div>
    );
  }

  return (
    <div className={`dao-status-badge ${isPanicked ? "panic" : "normal"}`}>
      <span className="status-icon">{isPanicked ? "🚨" : "✅"}</span>
      <span className="status-text">
        {isPanicked ? "Modo Pánico Activado" : "Sistema Operativo Normal"}
      </span>
    </div>
  );
}
