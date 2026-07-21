const router = require('express').Router();
const CopyTrade = require('../models/CopyTrade');
const Trader = require('../models/Trader');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');

const DEFAULT_TRADERS = [
  { name: 'Alpha Wolf', roiPercent: 18.4, winRate: 74, totalTrades: 1842, monthlyRoi: 18.4, description: 'Scalping BNB & BTC with tight risk management' },
  { name: 'Sigma Grid', roiPercent: 12.7, winRate: 68, totalTrades: 3210, monthlyRoi: 12.7, description: 'Grid strategy on major pairs, low drawdown' },
  { name: 'Nova Prime', roiPercent: 22.1, winRate: 61, totalTrades: 987, monthlyRoi: 22.1, description: 'Momentum swing trader, high reward plays' },
  { name: 'Zen Quant', roiPercent: 9.5, winRate: 81, totalTrades: 5430, monthlyRoi: 9.5, description: 'Conservative algo, consistent daily returns' },
];

// GET /api/copytrade/traders
router.get('/traders', async (req, res) => {
  try {
    let traders = await Trader.find({ active: true }).sort({ roiPercent: -1 });
    // Seed default traders if none exist
    if (traders.length === 0) {
      traders = await Trader.insertMany(DEFAULT_TRADERS.map(t => ({ ...t, active: true })));
    }
    res.json({ success: true, data: traders });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/copytrade?address=
router.get('/', async (req, res) => {
  try {
    const { address } = req.query;
    if (!address) return res.json({ success: false, error: 'address required' });
    const trades = await CopyTrade.find({ address: address.toLowerCase() }).sort({ createdAt: -1 });
    res.json({ success: true, data: trades });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/copytrade — start copy trade
router.post('/', async (req, res) => {
  try {
    const { address, traderId, amount } = req.body;
    if (!address || !traderId || !amount) {
      return res.json({ success: false, error: 'address, traderId and amount required' });
    }
    const addr = address.toLowerCase();

    const trader = await Trader.findById(traderId);
    if (!trader) return res.json({ success: false, error: 'Trader not found' });

    const balance = await Balance.findOne({ address: addr });
    if (!balance || (balance.tradingBalance || 0) < amount) {
      return res.json({ success: false, error: 'Insufficient trading balance' });
    }

    balance.tradingBalance -= amount;
    await balance.save();

    const ct = await CopyTrade.create({
      address: addr,
      traderId: trader._id,
      traderName: trader.name,
      amount,
      roiPercent: trader.roiPercent,
      status: 'active',
    });

    await Transaction.create({
      address: addr,
      type: 'copy_trade_start',
      amount,
      description: `Started copy trading with ${trader.name}`,
    });

    res.json({ success: true, data: ct });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/copytrade/:id/stop
router.post('/:id/stop', async (req, res) => {
  try {
    const { address } = req.body;
    const ct = await CopyTrade.findOne({ _id: req.params.id, address: address?.toLowerCase() });
    if (!ct) return res.json({ success: false, error: 'Copy trade not found' });
    if (ct.status !== 'active') return res.json({ success: false, error: 'Not active' });

    ct.status = 'stopped';
    ct.stoppedAt = new Date();
    await ct.save();

    res.json({ success: true, data: ct });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/copytrade/take-profit
router.post('/take-profit', async (req, res) => {
  try {
    const { address, copyTradeId } = req.body;
    const addr = address?.toLowerCase();
    const ct = await CopyTrade.findOne({ _id: copyTradeId, address: addr });
    if (!ct) return res.json({ success: false, error: 'Copy trade not found' });
    if ((ct.profit || 0) <= 0) return res.json({ success: false, error: 'No profit to claim' });

    const profit = ct.profit;
    ct.profit = 0;
    await ct.save();

    const balance = await Balance.findOne({ address: addr });
    if (balance) {
      balance.tradingBalance = (balance.tradingBalance || 0) + profit;
      balance.aiEarnings = (balance.aiEarnings || 0) + profit;
      await balance.save();
    }

    await Transaction.create({
      address: addr,
      type: 'copy_trade_profit',
      amount: profit,
      description: `Claimed copy trade profit from ${ct.traderName}`,
    });

    res.json({ success: true, data: { profit } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/copytrade/take-capital
router.post('/take-capital', async (req, res) => {
  try {
    const { address, copyTradeId } = req.body;
    const addr = address?.toLowerCase();
    const ct = await CopyTrade.findOne({ _id: copyTradeId, address: addr });
    if (!ct) return res.json({ success: false, error: 'Copy trade not found' });
    if (ct.status !== 'stopped') return res.json({ success: false, error: 'Stop the trade first' });
    if (ct.capitalReturned) return res.json({ success: false, error: 'Capital already returned' });

    const capital = ct.amount;
    ct.capitalReturned = true;
    ct.amount = 0;
    await ct.save();

    const balance = await Balance.findOne({ address: addr });
    if (balance) {
      balance.tradingBalance = (balance.tradingBalance || 0) + capital;
      await balance.save();
    }

    await Transaction.create({
      address: addr,
      type: 'copy_trade_capital',
      amount: capital,
      description: `Returned capital from ${ct.traderName} copy trade`,
    });

    res.json({ success: true, data: { capital } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
