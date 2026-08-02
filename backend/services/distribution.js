const { ethers } = require('ethers');

function getWallet() {
  const rpc = process.env.BSC_RPC || 'https://bsc-dataseed1.binance.org/';
  const provider = new ethers.JsonRpcProvider(rpc);
  return new ethers.Wallet(process.env.OWNER_PRIVATE_KEY, provider);
}

// Plain BNB transfers, not a contract call — separate from services/contract.js.
// Sent sequentially (not Promise.all): same signer for every send, so parallel
// transactions would race on nonce and fail.
async function sendDistribution(recipients) {
  const wallet = getWallet();
  const results = [];
  for (const r of recipients) {
    try {
      const tx = await wallet.sendTransaction({ to: r.address, value: ethers.parseEther(String(r.amount)) });
      const receipt = await tx.wait();
      results.push({ ...r, txHash: receipt.hash, status: 'sent' });
    } catch (err) {
      results.push({ ...r, status: 'failed', error: err.message });
    }
  }
  return results;
}

module.exports = { sendDistribution };
