const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🔍 Verificando ownership de ShaCoin...\n");

  const [deployer] = await ethers.getSigners();
  console.log("📍 Cuenta actual:", deployer.address);

  // Cargar direcciones desplegadas
  const addressesPath = path.join(__dirname, "..", "deployed-addresses.json");
  if (!fs.existsSync(addressesPath)) {
    console.error("❌ No se encontró deployed-addresses.json");
    process.exit(1);
  }

  const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
  
  // Conectar al contrato ShaCoin
  console.log("\n📝 Conectando a ShaCoin:", addresses.shaCoin);
  const ShaCoin = await ethers.getContractFactory("ShaCoin");
  const shaCoin = ShaCoin.attach(addresses.shaCoin);

  try {
    const owner = await shaCoin.owner();
    console.log("👤 Owner actual de ShaCoin:", owner);
    console.log("🏛️  Dirección del DAO:", addresses.dao);
    console.log("📍 Deployer:", deployer.address);
    
    if (owner.toLowerCase() === addresses.dao.toLowerCase()) {
      console.log("\n✅ ShaCoin ya es propiedad del DAO");
    } else if (owner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("\n⚠️  ShaCoin es propiedad del deployer, transferir al DAO");
      const tx = await shaCoin.transferOwnership(addresses.dao);
      await tx.wait();
      console.log("✅ Ownership transferido al DAO");
    } else {
      console.log("\n❌ ShaCoin tiene un owner inesperado");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

main().catch(err => {
  console.error("❌ Error:", err);
  process.exit(1);
});
