# 🏛️ ShaCoin DAO - Backend to Frontend Connection Guide

## 📋 Resumen

Este documento explica cómo conectar el backend (contratos smart) con el frontend (React).

## 🚀 Pasos para conectar

### 1. **Compilar los contratos**

```bash
cd blockchain
npx hardhat compile
```

Esto genera los ABIs en `blockchain/artifacts/contracts/`

### 2. **ABIs para el frontend**

El frontend mantiene sus ABIs en `frontend/src/abi/` y no se sincronizan automáticamente desde `blockchain`. Cuando cambies contratos, exporta manualmente los ABIs que necesites desde `blockchain/artifacts/contracts/` y colócalos en `frontend/src/abi/`.

### 3. **Desplegar los contratos**

Opción A: En una red local (Hardhat)

```bash
cd blockchain
npx hardhat node
```

En otra terminal:

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

Opción B: En testnet (Sepolia, etc.)

Actualiza `hardhat.config.js` con tu proveedor RPC y despliegue.

### 4. **Configurar las direcciones en el frontend**

Copia `.env.example` a `.env.local`:

```bash
cp frontend/.env.example frontend/.env.local
```

Actualiza `frontend/.env.local` con las direcciones desplegadas:

```
REACT_APP_DAO_ADDRESS=0x1234...
REACT_APP_SHA_COIN_ADDRESS=0x5678...
# ... etc
```

### 5. **Instalar dependencias del frontend**

```bash
cd frontend
npm install
```

### 6. **Ejecutar el frontend**

```bash
npm run dev
```

## 📦 Estructura de Archivos

```
frontend/
├── src/
│   ├── abi/                    # ABIs de los contratos
│   │   ├── DAO.json
│   │   ├── ShaCoin.json
│   │   └── ...
│   ├── config/
│   │   └── contracts.js        # Configuración de direcciones
│   ├── services/
│   │   └── web3Service.js      # Funciones para interactuar con contratos
│   ├── components/
│   │   ├── WalletConnect.jsx
│   │   ├── BuyTokens.jsx
│   │   ├── StakingSection.jsx
│   │   ├── CreateProposal.jsx
│   │   ├── ProposalList.jsx
│   │   └── ...
│   └── App.jsx
├── .env.example                # Plantilla de variables de entorno
└── .env.local                  # Variables de entorno (NO COMPARTIR)
```

## 🔗 Funciones Disponibles en web3Service.js

### Inicialización
- `initWeb3()` - Conectar wallet
- `getProvider()` - Obtener proveedor
- `getSigner()` - Obtener signer

### DAO
- `buyTokens(ethAmount)` - Comprar tokens
- `createProposal(title, description)` - Crear propuesta
- `vote(proposalId, support)` - Votar
- `stakeForVoting(amount)` - Hacer stake para votar
- `stakeForProposing(amount)` - Hacer stake para proponer
- `unstakeVoting()` - Retirar stake de votación
- `unstakeProposing()` - Retirar stake de proposición

### ShaCoin (Token)
- `getTokenBalance(address)` - Obtener balance de tokens
- `approveTokens(spenderAddress, amount)` - Aprobar tokens

### Staking
- `getVotingStake(address)` - Obtener stake para votar
- `getProposingStake(address)` - Obtener stake para proponer

### ProposalManager
- `getProposal(proposalId)` - Obtener detalles de propuesta
- `getProposalState(proposalId)` - Obtener estado
- `getProposalResults(proposalId)` - Obtener resultados de votación

### Parameters
- `getTokenPrice()` - Obtener precio del token
- `getStakingLockTime()` - Obtener tiempo de bloqueo

### PanicManager
- `isPanicked()` - Verificar si está en pánico

## 💡 Ejemplo de uso en un componente

```jsx
import { useState } from 'react';
import { buyTokens, getTokenBalance } from '../services/web3Service';

export default function BuyTokensComponent() {
  const [loading, setLoading] = useState(false);

  const handleBuy = async () => {
    try {
      setLoading(true);
      const tx = await buyTokens(1); // Comprar 1 ETH de tokens
      console.log('✅ Transacción exitosa:', tx);
      // Actualizar balance, etc.
    } catch (error) {
      console.error('❌ Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleBuy} disabled={loading}>
      {loading ? 'Procesando...' : 'Comprar Tokens'}
    </button>
  );
}
```

## 🔐 Variables de Entorno

Nunca compartas tu `.env.local`. Contiene direcciones de contratos e información sensible.

```bash
# .env.local (NO COMPARTIR)
REACT_APP_DAO_ADDRESS=0x...
REACT_APP_SHA_COIN_ADDRESS=0x...
# ... etc
```

## 🐛 Troubleshooting

### "Cannot connect to the network localhost"
- Asegúrate de que `npx hardhat node` esté ejecutándose
- Verifica que `hardhat.config.js` tenga configurada la red localhost

### "window.ethereum is undefined"
- Instala MetaMask: https://metamask.io
- O usa otro wallet que soporte EIP-6902

### "Contrato no encontrado en esa dirección"
- Verifica que las direcciones en `.env.local` sean correctas
- Confirma que los contratos fueron desplegados en la red correcta

### "Insufficient balance"
- Asegúrate de tener ETH en tu wallet para pagar gas
- En Hardhat local, usa una de las cuentas generadas automaticamente

## 📚 Recursos

- [Ethers.js Documentation](https://docs.ethers.org/)
- [Hardhat Documentation](https://hardhat.org/)
- [MetaMask Documentation](https://docs.metamask.io/)

## ✅ Checklist

- [ ] Contratos compilados (`npm run compile` en blockchain)
- [ ] ABIs actualizados en `frontend/src/abi/` según necesidad
- [ ] Contratos desplegados
- [ ] `.env.local` configurado con direcciones
- [ ] Dependencias instaladas (`npm install` en frontend)
- [ ] Wallet conectada (MetaMask)
- [ ] Frontend ejecutándose (`npm run dev`)

---

¡Listo! Tu DAO debería estar conectada y funcionando. 🎉
