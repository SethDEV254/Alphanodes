const { ethers } = require('ethers');

// Real on-chain BNB balance of the deployed contract — the actual ceiling on what
// can ever be paid out for real, independent of any off-chain bookkeeping.
async function getContractBnbBalance() {
  if (!process.env.CONTRACT_ADDRESS || !process.env.BSC_RPC) return null;
  try {
    const rpcRes = await fetch(process.env.BSC_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [process.env.CONTRACT_ADDRESS, 'latest'], id: 1 }),
    });
    const json = await rpcRes.json();
    return json.result ? parseInt(json.result, 16) / 1e18 : null;
  } catch {
    return null;
  }
}

// Real on-chain BNB balance of the owner wallet — what the distribution feature
// can safely send from. Deliberately independent of CONTRACT_ADDRESS so it still
// works if the contract env vars aren't set.
async function getOwnerWalletBalance() {
  if (!process.env.OWNER_PRIVATE_KEY || !process.env.BSC_RPC) return null;
  try {
    const address = new ethers.Wallet(process.env.OWNER_PRIVATE_KEY).address;
    const rpcRes = await fetch(process.env.BSC_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 1 }),
    });
    const json = await rpcRes.json();
    return json.result ? { address, balance: parseInt(json.result, 16) / 1e18 } : null;
  } catch {
    return null;
  }
}

module.exports = { getContractBnbBalance, getOwnerWalletBalance };
