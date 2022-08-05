require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("dotenv").config();

const RINKEBY_RPC_URL = process.env.RINKEBY_RPC_URL || "https://eth-rinkeby.alchemyapi.io/v2/your-api-key";
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const DEPLOYER_ADDRESS = process.env.DEPLOYER_ADDRESS || "private key";
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY || "private key";

module.exports = {
  solidity: "0.8.9",
  defaultNetwork: "hardhat",
  networks: {
      hardhat: {
          chainId: 31337,
          blockConfirmations: 1
      },
      rinkeby: {
          chainId: 4,
          blockConfirmations: 6,
          url: RINKEBY_RPC_URL,
          accounts: [
            DEPLOYER_ADDRESS
          ]
      },
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    outputFile: "gas-report.txt",
    noColors: true,
    coinmarketcap: COINMARKETCAP_API_KEY,
    token: "ETH"
  },
  namedAccounts: {
    deployer: {
      default: 0
    },
    player: {
      default: 1
    }
  },
  etherscan: {
    apiKey: ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 500000, // 500 seconds max for running tests
  },
};
