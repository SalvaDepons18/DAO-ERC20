# 📝 DEPLOYMENT GUIDE - Guía de Despliegue

## 🎯 Objetivo

Desplegar todos los contratos inteligentes de la DAO en una red blockchain.

## 📋 Prerrequisitos

- Node.js v18+ instalado
- NPM o Yarn
- Git
- MetaMask u otro wallet Web3
- ETH en el wallet (para testnet o mainnet)

## 🚀 Paso 1: Preparar el Backend

### 1.1 Navegar al directorio blockchain

```bash
cd blockchain
```

### 1.2 Instalar dependencias

```bash
npm install
```

### 1.3 Compilar los contratos

```bash
npx hardhat compile
```

Este comando:
- Compila todos los archivos `.sol`
- Genera artifacts en `artifacts/contracts/`
- Genera ABIs que usaremos en el frontend

## 🌐 Paso 2: Desplegar en la Red Local (Hardhat)

### 2.1 En una terminal, iniciar el nodo local

```bash
npx hardhat node
```

Output esperado:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts (20 available) and start conditions in output...
Account #0: 0x1234... (10000 ETH)
Account #1: 0x5678... (10000 ETH)
...
```

**Nota**: Mantén esta terminal abierta mientras desarrollo.

### 2.2 En otra terminal, ejecutar el script de deploy

```bash
cd blockchain
npx hardhat run scripts/deploy.js --network localhost
```

Output esperado:
```
🚀 Iniciando deploy de la DAO...

📍 Desplegando con cuenta: 0x1234...

📝 Desplegando ShaCoin...
✅ ShaCoin desplegado en: 0xaaaa...

📝 Desplegando Parameters...
✅ Parameters desplegado en: 0xbbbb...

... (más contratos)

✨ Deploy completado exitosamente!

📊 Resumen:
=====================================
dao                 : 0xcccc...
shaCoin             : 0xaaaa...
parameters          : 0xbbbb...
staking             : 0xdddd...
proposalManager     : 0xeeee...
strategyManager     : 0xffff...
simpleMajorityStrategy: 0x1111...
panicManager        : 0x2222...
```

El script:
- Guarda las direcciones en `blockchain/deployed-addresses.json`
  
Nota: La copia de ABIs al frontend no se realiza automáticamente para mantener proyectos desacoplados. Si el frontend los requiere, toma los ABIs desde `blockchain/artifacts/contracts/` y colócalos en `frontend/src/abi/` manualmente.

## 🖼️ Paso 3: Configurar el Frontend

### 3.1 Copiar variables de entorno

```bash
cd frontend
cp .env.example .env.local
```

### 3.2 Actualizar `.env.local` con las direcciones desplegadas

Abre `frontend/.env.local` y reemplaza las direcciones:

```bash
# Copiar desde blockchain/deployed-addresses.json

REACT_APP_DAO_ADDRESS=0xcccc...
REACT_APP_SHA_COIN_ADDRESS=0xaaaa...
REACT_APP_PARAMETERS_ADDRESS=0xbbbb...
REACT_APP_STAKING_ADDRESS=0xdddd...
REACT_APP_PROPOSAL_MANAGER_ADDRESS=0xeeee...
REACT_APP_STRATEGY_MANAGER_ADDRESS=0xffff...
REACT_APP_SIMPLE_MAJORITY_STRATEGY_ADDRESS=0x1111...
REACT_APP_PANIC_MANAGER_ADDRESS=0x2222...
```

### 3.3 Instalar dependencias del frontend

```bash
npm install
```

### 3.4 Ejecutar el frontend

```bash
npm run dev
```

Output esperado:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  press h to show help
```

## 🔗 Paso 4: Conectar el Wallet

1. Abre `http://localhost:5173/` en tu navegador
2. Haz click en "Conectar Wallet"
3. Se abrirá MetaMask
4. Asegúrate de estar en la red Localhost 8545:
   - Click en el selector de red
   - Si no ves "Localhost 8545", agrega una red personalizada:
     - Network name: Localhost 8545
     - RPC URL: http://127.0.0.1:8545
     - Chain ID: 31337
5. Selecciona una de las cuentas desplegadas (tienen 10000 ETH cada una)
6. Conecta

## ✅ Paso 5: Probar la Aplicación

### Probar compra de tokens

1. Navega a "Tokens"
2. Ingresa un monto en ETH (ej: 0.1)
3. Click en "Comprar Tokens"
4. Confirma la transacción en MetaMask
5. Verifica que tu balance de tokens aumente

### Probar staking

1. Navega a "Staking"
2. Ingresa un monto para stake
3. Click en "Stake para Votar"
4. Confirma en MetaMask

### Crear una propuesta

1. Navega a "Crear Propuesta"
2. Ingresa título y descripción
3. Click en "Crear Propuesta"
4. Confirma en MetaMask

## 🔄 Paso 6 (Opcional): Desplegar en Testnet

### Configurar para Sepolia (testnet de Ethereum)

1. Actualiza `blockchain/hardhat.config.js`:

```javascript
require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

module.exports = {
  solidity: "0.8.20",
  networks: {
    sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_KEY}`,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
```

2. Crea `.env` en el directorio blockchain:

```bash
INFURA_KEY=your_infura_key_here
PRIVATE_KEY=your_private_key_here
```

⚠️ **NUNCA COMPARTAS TU PRIVATE KEY**

3. Obtén testnet ETH:
   - Ve a https://sepolia-faucet.pk910.de/
   - Solicita ETH gratuito

4. Desplega:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

5. Verifica tu contrato en Etherscan:
   - https://sepolia.etherscan.io/
   - Busca tu dirección de contrato

## 🐛 Troubleshooting

### Error: "Cannot connect to localhost:8545"
**Solución**: Asegúrate de ejecutar `npx hardhat node` antes de deployar

### Error: "Account lock" en MetaMask
**Solución**: Desbloquea MetaMask e intenta nuevamente

### Error: "Insufficient balance"
**Solución**: En local, las cuentas tienen 10000 ETH. En testnet, usa el faucet

### Error: "Contract address not found in .env"
**Solución**: Asegúrate de copiar todas las direcciones de `deployed-addresses.json` a `.env.local`

### Frontend no carga los contratos
**Solución**: 
1. Verifica que `.env.local` tenga las direcciones correctas
2. Revisa la consola del navegador (F12) para errores
3. Si el frontend los requiere, coloca los ABIs en `frontend/src/abi/`

## 📁 Archivos Importantes

- `blockchain/deployed-addresses.json` - Direcciones desplegadas
- `blockchain/artifacts/` - ABIs compilados
- `frontend/.env.local` - Variables de entorno (NO COMPARTIR)
- `frontend/src/abi/` - ABIs del frontend (se mantienen manualmente)

## 🎉 ¡Listo!

Tu DAO está desplegada y lista para usar. 

**Próximos pasos**:
- [ ] Crear propuestas
- [ ] Votar en propuestas
- [ ] Hacer stake
- [ ] Testear todas las funcionalidades

---

**¿Necesitas ayuda?** Revisa los archivos:
- `SETUP.md` - Guía de configuración
- `README.md` - Información general del proyecto
- `blockchain/scripts/deploy.js` - Script de deploy
