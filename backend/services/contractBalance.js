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

module.exports = { getContractBnbBalance };
