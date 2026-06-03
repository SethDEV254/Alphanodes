import '@nomicfoundation/hardhat-ethers';
import 'dotenv/config';

export default {
  solidity: {
    version: '0.8.20',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    bscTestnet: {
      type: 'http',
      url: process.env.CHAINSTACK_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      chainId: 97,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000000,
    },
    bscMainnet: {
      type: 'http',
      url: 'https://bsc-dataseed1.binance.org/',
      chainId: 56,
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 3000000000,
    },
  },
};
