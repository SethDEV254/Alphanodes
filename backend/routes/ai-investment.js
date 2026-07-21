const router = require('express').Router();
const AiInvestment = require('../models/AiInvestment');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');

const AI_PACKAGES = [
  { _id: 'alpha-x', id: 0, name: 'Alpha X', dailyRate: 1.0, dailyRateBps: 100, minAmount: 0,    maxAmount: 100,   duration: 30, durationDays: 30 },
  { _id: 'core',    id: 1, name: 'Core',    dailyRate: 1.5, dailyRateBps: 150, minAmount: 100,  maxAmount: 1000,  duration: 60, durationDays: 60 },
  { _id: 'max',     id: 2, name: 'Max',     dailyRate: 2.0, dailyRateBps: 200, minAmount: 1000, maxAmount: 10000, duration: 90, durationDays: 90 },
];

// GET /api/ai-investment/packages
router.get('/packages', (req, res) => {
  res.json({ success: true, data: AI_PACKAGES });
});

// GET /api/ai-investment?address=
router.get('/', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'Address required' });

    const investments = await AiInvestment.find({ address }).sort({ createdAt: -1 });
    res.json({ success: true, data: investments });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/ai-investment
router.post('/', async (req, res) => {
  try {
    const { address, packageId, amount, txHash, coin } = req.body;
    if (address === undefined || packageId === undefined || !amount) {
      return res.json({ success: false, error: 'address, packageId and amount required' });
    }
    if (amount <= 0) return res.json({ success: false, error: 'Amount must be greater than 0' });

    const pkg = AI_PACKAGES.find(p => p._id === packageId || p.id === Number(packageId));
    if (!pkg) return res.json({ success: false, error: 'Invalid package' });
    if (amount < pkg.minAmount) {
      return res.json({ success: false, error: `Minimum amount is ${pkg.minAmount} BNB` });
    }
    if (amount > pkg.maxAmount) {
      return res.json({ success: false, error: `Maximum amount is ${pkg.maxAmount} BNB` });
    }

    const addr = address.toLowerCase();
    const [balance, pausedSetting] = await Promise.all([
      Balance.findOne({ address: addr }),
      Setting.findOne({ key: 'platformPaused' }),
    ]);
    if (pausedSetting?.value === true) {
      return res.json({ success: false, error: 'Platform is under maintenance' });
    }
    if (!balance) return res.json({ success: false, error: 'User not registered' });
    if ((balance.tradingBalance || 0) < amount) {
      return res.json({ success: false, error: 'Insufficient trading balance' });
    }

    const endDate = new Date(Date.now() + pkg.durationDays * 24 * 60 * 60 * 1000);
    const investment = await AiInvestment.create({
      address: addr,
      packageId: pkg.id,
      packageName: pkg.name,
      amount,
      dailyRateBps: pkg.dailyRateBps,
      durationDays: pkg.durationDays,
      endDate,
      coin: coin || 'BNB',
      txHash: txHash || '',
    });

    balance.tradingBalance = Math.max(0, (balance.tradingBalance || 0) - amount);
    balance.totalAiInvested = (balance.totalAiInvested || 0) + amount;
    await balance.save();

    await Transaction.create({
      address: addr,
      type: 'ai_investment',
      amount,
      txHash: txHash || '',
      description: `AI Investment — ${pkg.name} package`,
    });

    res.json({ success: true, data: investment });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/ai-investment/claim
router.post('/claim', async (req, res) => {
  try {
    const { address, investmentId, txHash } = req.body;
    if (!address || !investmentId) return res.json({ success: false, error: 'address and investmentId required' });

    const addr = address.toLowerCase();
    const investment = await AiInvestment.findOne({ _id: investmentId, address: addr });
    if (!investment) return res.json({ success: false, error: 'Investment not found' });
    if (investment.status === 'claimed') return res.json({ success: false, error: 'Already claimed' });

    const now = Math.min(Date.now(), investment.endDate.getTime());
    const elapsed = now - investment.startDate.getTime();
    const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
    const accrued = (investment.amount * investment.dailyRateBps * days) / 10000;
    const pending = Math.max(0, accrued - investment.claimedEarnings);

    if (pending <= 0) return res.json({ success: false, error: 'Nothing to claim yet' });

    investment.claimedEarnings += pending;
    const isComplete = Date.now() >= investment.endDate.getTime();
    if (isComplete) investment.status = 'claimed';
    await investment.save();

    const balance = await Balance.findOne({ address: addr });
    if (balance) {
      balance.aiEarnings = (balance.aiEarnings || 0) + pending;
      balance.tradingBalance = (balance.tradingBalance || 0) + pending;
      if (isComplete) {
        balance.tradingBalance += investment.amount; // return principal
      }
      await balance.save();
    }

    await Transaction.create({
      address: addr,
      type: 'ai_claim',
      amount: pending,
      txHash: txHash || '',
      description: 'AI earnings claimed',
    });

    res.json({ success: true, data: { claimed: pending, investmentComplete: isComplete } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/ai-investment/compound
router.post('/compound', async (req, res) => {
  try {
    const { address, investmentId } = req.body;
    if (!address || !investmentId) return res.json({ success: false, error: 'address and investmentId required' });

    const addr = address.toLowerCase();
    const investment = await AiInvestment.findOne({ _id: investmentId, address: addr });
    if (!investment) return res.json({ success: false, error: 'Investment not found' });
    if (investment.status !== 'active') return res.json({ success: false, error: 'Investment not active' });

    const now = Math.min(Date.now(), investment.endDate.getTime());
    const elapsed = now - investment.startDate.getTime();
    const days = elapsed / (1000 * 60 * 60 * 24);
    const accrued = (investment.amount * investment.dailyRateBps * days) / 10000;
    const pending = Math.max(0, accrued - investment.claimedEarnings);

    if (pending <= 0) return res.json({ success: false, error: 'Nothing to compound yet' });

    const newAmount = investment.amount + pending;
    investment.amount = newAmount;
    investment.claimedEarnings = 0;
    investment.startDate = new Date();
    investment.endDate = new Date(Date.now() + investment.durationDays * 24 * 60 * 60 * 1000);
    await investment.save();

    const balance = await Balance.findOne({ address: addr });
    if (balance) {
      balance.aiEarnings = (balance.aiEarnings || 0) + pending;
      balance.totalAiInvested = (balance.totalAiInvested || 0) + pending;
      await balance.save();
    }

    await Transaction.create({
      address: addr,
      type: 'ai_compound',
      amount: pending,
      txHash: '',
      description: `Compounded ${pending.toFixed(6)} BNB into ${investment.packageName}`,
    });

    res.json({ success: true, data: { compounded: pending, newAmount } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
