const router = require('express').Router();
const axios = require('axios');
const Trade = require('../models/Trade');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');

const ASSET_IDS = {
  'BTC/USDT': 'bitcoin',
  'ETH/USDT': 'ethereum',
  'BNB/USDT': 'binancecoin',
  'SOL/USDT': 'solana',
  'XRP/USDT': 'ripple',
  'DOGE/USDT': 'dogecoin',
  'ADA/USDT': 'cardano',
  'AVAX/USDT': 'avalanche-2',
  'DOT/USDT': 'polkadot',
  'LINK/USDT': 'chainlink',
  'UNI/USDT': 'uniswap',
  'MATIC/USDT': 'matic-network',
  'ARB/USDT': 'arbitrum',
  'OP/USDT': 'optimism',
  'ATOM/USDT': 'cosmos',
  'NEAR/USDT': 'near',
  'APT/USDT': 'aptos',
  'SUI/USDT': 'sui',
  'TRX/USDT': 'tron',
  'TON/USDT': 'the-open-network',
  'LTC/USDT': 'litecoin',
  'BCH/USDT': 'bitcoin-cash',
  'INJ/USDT': 'injective-protocol',
  'JUP/USDT': 'jupiter-exchange-solana',
  'TIA/USDT': 'celestia',
  'SEI/USDT': 'sei-network',
  'SHIB/USDT': 'shiba-inu',
  'PEPE/USDT': 'pepe',
  'WIF/USDT': 'dogwifcoin',
  'BONK/USDT': 'bonk',
  'FET/USDT': 'fetch-ai',
  'RENDER/USDT': 'render-token',
  'WLD/USDT': 'worldcoin-wld',
  'AAVE/USDT': 'aave',
  'MKR/USDT': 'maker',
};

// House edge — 0.6% spread per side (1.2% round-trip). Amplified by leverage.
const SPREAD = 0.006;

// Maker fee — 0.1% of notional position value (amount × leverage), charged on open
const MAKER_FEE_RATE = 0.001;

// Additional platform fee on profitable closes (25% of gross profit)
const PROFIT_FEE = 0.25;

function applySpread(price, direction, side) {
  // side: 'entry' or 'exit'
  // Long entry: fill at higher price. Long exit: fill at lower price.
  // Short entry: fill at lower price. Short exit: fill at higher price.
  if (direction === 'long') {
    return side === 'entry' ? price * (1 + SPREAD) : price * (1 - SPREAD);
  }
  return side === 'entry' ? price * (1 - SPREAD) : price * (1 + SPREAD);
}

async function getPrice(asset) {
  try {
    const id = ASSET_IDS[asset] || 'binancecoin';
    const r = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`,
      { timeout: 6000 }
    );
    return r.data?.[id]?.usd || 0;
  } catch {
    return 0;
  }
}

// GET /api/trade?address=
router.get('/', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return res.json({ success: false, error: 'address required' });

    const trades = await Trade.find({ address: address.toLowerCase() }).sort({ createdAt: -1 }).limit(50);

    const open = trades.filter(t => t.status === 'open');
    if (open.length > 0) {
      const assets = [...new Set(open.map(t => t.asset))];
      const prices = {};
      await Promise.all(assets.map(async (a) => { prices[a] = await getPrice(a); }));

      for (const t of open) {
        const currentPrice = prices[t.asset] || t.entryPrice;
        const effectiveClose = applySpread(currentPrice, t.direction, 'exit');
        const priceChange = (effectiveClose - t.entryPrice) / t.entryPrice;
        const dir = t.direction === 'long' ? 1 : -1;
        const rawPnl = t.amount * t.leverage * priceChange * dir;
        t.pnl = parseFloat((rawPnl > 0 ? rawPnl * (1 - PROFIT_FEE) : rawPnl).toFixed(6));
      }
    }

    res.json({ success: true, data: trades });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/trade — open trade
router.post('/', async (req, res) => {
  try {
    const { address, asset, direction, amount, leverage } = req.body;
    if (!address || !asset || !direction || !amount) {
      return res.json({ success: false, error: 'address, asset, direction and amount required' });
    }
    const addr = address.toLowerCase();
    const lev = Math.min(Math.max(parseInt(leverage) || 1, 1), 100);

    const balance = await Balance.findOne({ address: addr });
    if (!balance || (balance.tradingBalance || 0) < amount) {
      return res.json({ success: false, error: 'Insufficient trading balance' });
    }

    const marketPrice = await getPrice(asset);
    if (!marketPrice) return res.json({ success: false, error: 'Could not fetch price' });

    // Maker fee on notional (amount × leverage)
    const makerFee = parseFloat((amount * lev * MAKER_FEE_RATE).toFixed(6));
    const totalDeducted = amount + makerFee;

    if ((balance.tradingBalance || 0) < totalDeducted) {
      return res.json({ success: false, error: 'Insufficient balance (includes maker fee)' });
    }

    // Store the spread-adjusted entry price (user's fill price)
    const entryPrice = applySpread(marketPrice, direction, 'entry');

    balance.tradingBalance -= totalDeducted;
    await balance.save();

    const trade = await Trade.create({
      address: addr, asset, direction, amount, leverage: lev, entryPrice, status: 'open',
    });

    await Transaction.create({
      address: addr, type: 'trade_open', amount: totalDeducted,
      description: `Opened ${direction.toUpperCase()} ${asset} ${lev}x @ $${entryPrice.toFixed(2)} · maker fee ${makerFee.toFixed(4)} BNB`,
    });

    res.json({ success: true, data: trade });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/trade/:id/close
router.post('/:id/close', async (req, res) => {
  try {
    const { address } = req.body;
    const addr = address?.toLowerCase();
    const trade = await Trade.findOne({ _id: req.params.id, address: addr, status: 'open' });
    if (!trade) return res.json({ success: false, error: 'Open trade not found' });

    const marketPrice = await getPrice(trade.asset);
    const closePrice = applySpread(marketPrice, trade.direction, 'exit');

    const priceChange = (closePrice - trade.entryPrice) / trade.entryPrice;
    const dir = trade.direction === 'long' ? 1 : -1;
    const rawPnl = trade.amount * trade.leverage * priceChange * dir;

    // Apply platform fee only on wins
    const pnl = parseFloat((rawPnl > 0 ? rawPnl * (1 - PROFIT_FEE) : rawPnl).toFixed(6));
    const returned = Math.max(0, trade.amount + pnl);

    trade.closePrice = marketPrice; // show real market price to user
    trade.pnl = pnl;
    trade.status = 'closed';
    trade.closedAt = new Date();
    await trade.save();

    const balance = await Balance.findOne({ address: addr });
    if (balance) {
      balance.tradingBalance = (balance.tradingBalance || 0) + returned;
      await balance.save();
    }

    await Transaction.create({
      address: addr, type: 'trade_close', amount: Math.abs(pnl),
      description: `Closed ${trade.direction.toUpperCase()} ${trade.asset} — PnL: ${pnl >= 0 ? '+' : ''}${pnl.toFixed(4)} BNB`,
    });

    res.json({ success: true, data: { pnl, returned, closePrice: marketPrice } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
