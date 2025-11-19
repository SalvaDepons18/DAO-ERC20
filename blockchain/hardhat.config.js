require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();
require("hardhat-coverage");

module.exports = {
  solidity: "0.8.20",
  networks: {
<<<<<<< Updated upstream
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
=======
    localhost: {
      url: "http://127.0.0.1:8545/",
    },
>>>>>>> Stashed changes
  }
};
