const { ethers } = require('ethers');
const ABI = require('../contracts/AlphaNodes.json');

let _contract = null;

function getContract() {
  if (_contract) return _contract;

  const rpc = process.env.BSC_RPC || 'https://bsc-dataseed1.binance.org/';
  const provider = new ethers.JsonRpcProvider(rpc);
  const wallet = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);
  _contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, ABI, wallet);
  return _contract;
}

async function approveWithdrawal(withdrawalId) {
  const contract = getContract();
  const tx = await contract.approveWithdrawal(BigInt(withdrawalId));
  const receipt = await tx.wait();
  return receipt.hash;
}

async function fundContract(amountEth) {
  const contract = getContract();
  const tx = await contract.fundContract({ value: ethers.parseEther(String(amountEth)) });
  const receipt = await tx.wait();
  return receipt.hash;
}

async function setPaused(paused) {
  const contract = getContract();
  const tx = await contract.setPaused(Boolean(paused));
  const receipt = await tx.wait();
  return receipt.hash;
}

async function emergencyWithdraw() {
  const contract = getContract();
  const tx = await contract.emergencyWithdraw();
  const receipt = await tx.wait();
  return receipt.hash;
}

async function setTreasury(address) {
  const contract = getContract();
  const tx = await contract.setTreasury(address);
  const receipt = await tx.wait();
  return receipt.hash;
}

module.exports = { approveWithdrawal, fundContract, setPaused, emergencyWithdraw, setTreasury };
