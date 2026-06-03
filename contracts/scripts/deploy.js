import 'dotenv/config';
import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const NETWORKS = {
  bscTestnet: {
    url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    chainId: 97,
    explorer: 'https://testnet.bscscan.com/address/',
    name: 'BSC Testnet',
  },
  bscMainnet: {
    url: 'https://bsc-dataseed1.binance.org/',
    chainId: 56,
    explorer: 'https://bscscan.com/address/',
    name: 'BSC Mainnet',
  },
};

async function main() {
  const networkName = process.env.DEPLOY_NETWORK || 'bscTestnet';
  const net = NETWORKS[networkName];
  if (!net) throw new Error(`Unknown network: ${networkName}`);

  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) throw new Error('PRIVATE_KEY not set in .env');

  const artifact = JSON.parse(
    readFileSync('./artifacts/contracts/AlphaNodes.sol/AlphaNodes.json', 'utf8')
  );

  const provider = new ethers.JsonRpcProvider(net.url);
  const wallet = new ethers.Wallet(privateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(`\nDeploying AlphaNodes to ${net.name}...`);
  console.log(`Deployer: ${wallet.address}`);
  console.log(`Balance:  ${ethers.formatEther(balance)} BNB\n`);

  if (balance === 0n) {
    throw new Error('Deployer has no BNB. Get testnet BNB from https://testnet.bnbchain.org/faucet-smart');
  }

  const treasury = process.env.TREASURY || wallet.address;

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  console.log('Deploying...');
  const contract = await factory.deploy(treasury);
  await contract.waitForDeployment();

  const address = await contract.getAddress();
  console.log(`\n✓ AlphaNodes deployed!`);
  console.log(`  Contract: ${address}`);
  console.log(`  Treasury: ${treasury}`);
  console.log(`  Network:  ${net.name}`);
  console.log(`  Explorer: ${net.explorer}${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
