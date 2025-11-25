const fs = require('fs');
const path = require('path');

async function main() {
  console.log('🔍 Verificando sistema de tokens...\n');
  
  const [deployer, user1] = await ethers.getSigners();
  const addressesPath = path.join(__dirname, '..', 'deployed-addresses.json');
  const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
  
  // Conectar contratos
  const DAO = await ethers.getContractFactory('DAO');
  const dao = DAO.attach(addresses.dao);
  
  const ShaCoin = await ethers.getContractFactory('ShaCoin');
  const shaCoin = ShaCoin.attach(addresses.shaCoin);
  
  console.log('📍 Usuario:', user1.address);
  console.log('📍 Contrato DAO:', addresses.dao);
  console.log('📍 Contrato ShaCoin:', addresses.shaCoin);
  
  // Ver balance inicial
  let balance = await shaCoin.balanceOf(user1.address);
  console.log('\n💰 Balance inicial:', ethers.formatEther(balance), 'SHA');
  
  // Comprar tokens
  console.log('\n🛒 Comprando tokens con 0.01 ETH...');
  const tx = await dao.connect(user1).buyTokens({ value: ethers.parseEther('0.01') });
  await tx.wait();
  console.log('✅ Compra completada');
  
  // Ver balance después
  balance = await shaCoin.balanceOf(user1.address);
  console.log('💰 Balance después:', ethers.formatEther(balance), 'SHA');
  
  console.log('\n✨ Verificación completada!');
}

main().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
