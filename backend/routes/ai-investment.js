const router = require('express').Router();
const AiInvestment = require('../models/AiInvestment');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');
const Setting = require('../models/Setting');
const { AI_PACKAGES } = require('../config/aiPackages');
const { pendingRoi, isCapped } = require('../services/aiAccrual');

// Merges admin-configured rate overrides (Setting: aiPackageRates) onto the base packages
async function getPackageRates() {
  const setting = await Setting.findOne({ key: 'aiPackageRates' });
  const overrides = setting?.value || {};
  return AI_PACKAGES.map(p => {
    const o = overrides[p._id];
    const rateMin = o?.min != null ? Number(o.min) : p.rateMin;
    const rateMax = o?.max != null ? Number(o.max) : p.rateMax;
    return { ...p, rateMin, rateMax, dailyRate: Number(((rateMin + rateMax) / 2).toFixed(4)) };
  });
}

// GET /api/ai-investment/packages
router.get('/packages', async (req, res) => {
  try {
    const packages = await getPackageRates();
    res.json({ success: true, data: packages });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
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

    const packages = await getPackageRates();
    const pkg = packages.find(p => p._id === packageId || p.id === Number(packageId));
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

    // Lock in a rate for this investment's lifetime, randomized within the package's band
    const minBps = Math.round(pkg.rateMin * 100);
    const maxBps = Math.round(pkg.rateMax * 100);
    const dailyRateBps = minBps >= maxBps ? minBps : minBps + Math.floor(Math.random() * (maxBps - minBps + 1));

    const investment = await AiInvestment.create({
      address: addr,
      packageId: pkg.id,
      packageName: pkg.name,
      amount,
      principal: amount,
      dailyRateBps,
      durationDays: pkg.durationDays, // informational only — accrual/completion is 3x-of-principal, not time-based
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
    if (investment.status !== 'active') return res.json({ success: false, error: 'Investment is not active' });

    const pending = pendingRoi(investment);
    if (pending <= 0) return res.json({ success: false, error: 'Nothing to claim yet' });

    investment.claimedEarnings += pending;
    investment.totalPaidOut = (investment.totalPaidOut || 0) + pending;
    const isComplete = isCapped(investment);
    if (isComplete) investment.status = 'completed';
    await investment.save();

    const balance = await Balance.findOne({ address: addr });
    if (balance) {
      balance.aiEarnings = (balance.aiEarnings || 0) + pending;
      balance.tradingBalance = (balance.tradingBalance || 0) + pending;
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

    const pending = pendingRoi(investment);
    if (pending <= 0) return res.json({ success: false, error: 'Nothing to compound yet' });

    // Reinvested, not paid out — totalPaidOut (the 3x cap basis) is untouched.
    const newAmount = investment.amount + pending;
    investment.amount = newAmount;
    investment.claimedEarnings = 0;
    investment.startDate = new Date();
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
