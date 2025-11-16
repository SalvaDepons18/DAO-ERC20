import { useState } from "react";
import { ethers } from "ethers";
// import DAO from "../abi/DAO.json";

function App() {
  const [account, setAccount] = useState(null);
  const daoAddress = import.meta.env.VITE_DAO_ADDRESS;

  const connect = async () => {
    const accounts = await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    setAccount(accounts[0]);
  };

  const panic = async () => {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const dao = new ethers.Contract(daoAddress, DAO.abi, signer);
    await dao.panic();
  };

  return (
    <>
      {!account && <button onClick={connect}>Conectar Wallet</button>}
      {account && (
        <>
          <p>Conectado: {account}</p>
          <button onClick={panic}>Activar Pánico</button>
        </>
      )}
    </>
  );
}

export default App;
