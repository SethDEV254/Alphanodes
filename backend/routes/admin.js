const router = require('express').Router();
const User = require('../models/User');
const Balance = require('../models/Balance');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const AiInvestment = require('../models/AiInvestment');
const Setting = require('../models/Setting');
const Trader = require('../models/Trader');

let contractService = null;
function getContractService() {
  if (!contractService && process.env.CONTRACT_ADDRESS && process.env.OWNER_PRIVATE_KEY) {
    try {
      contractService = require('../services/contract');
    } catch (e) {
      console.error('Contract service unavailable:', e.message);
    }
  }
  return contractService;
}

const auth = (req, res, next) => {
  const pw = req.query.password || req.body.password;
  if (pw !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

// POST /api/admin/verify
router.post('/verify', (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.json({ success: false, error: 'Invalid password' });
  }
  res.json({ success: true });
});

// GET /api/admin/stats?password=
router.get('/stats', auth, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const balances = await Balance.find();

    const totalDeposited = balances.reduce((s, b) => s + (b.totalDeposited || 0), 0);
    const totalWithdrawn = balances.reduce((s, b) => s + (b.totalWithdrawn || 0), 0);
    const totalAiEarnings = balances.reduce((s, b) => s + (b.aiEarnings || 0), 0);
    const totalStakingEarnings = balances.reduce((s, b) => s + (b.stakingEarnings || 0), 0);
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: 'pending' });
    const platformSetting = await Setting.findOne({ key: 'platformPaused' });
    const platformPaused = platformSetting?.value === true;

    res.json({
      success: true,
      data: {
        totalUsers,
        totalDeposited,
        totalWithdrawn,
        totalAiEarnings,
        totalStakingEarnings,
        pendingWithdrawals,
        platformPaused,
      },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/admin/platform?password=
router.get('/platform', auth, async (req, res) => {
  try {
    const [pausedSetting, msgSetting] = await Promise.all([
      Setting.findOne({ key: 'platformPaused' }),
      Setting.findOne({ key: 'maintenanceMessage' }),
    ]);
    res.json({
      success: true,
      data: {
        paused: pausedSetting?.value === true,
        message: msgSetting?.value || '',
      },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/platform
router.post('/platform', auth, async (req, res) => {
  try {
    const { paused, message } = req.body;

    if (paused !== undefined) {
      await Setting.findOneAndUpdate(
        { key: 'platformPaused' },
        { value: Boolean(paused) },
        { upsert: true, new: true }
      );
    }

    if (message !== undefined) {
      await Setting.findOneAndUpdate(
        { key: 'maintenanceMessage' },
        { value: message },
        { upsert: true, new: true }
      );
    }

    res.json({ success: true, data: { paused, message } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/admin/accounts?password=&page=&limit=
router.get('/accounts', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);

    const users = await User.find().sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    const total = await User.countDocuments();

    const addresses = users.map(u => u.address);
    const balances = await Balance.find({ address: { $in: addresses } });
    const balanceMap = Object.fromEntries(balances.map(b => [b.address, b]));

    const accounts = users.map(u => ({
      ...u.toObject(),
      balance: balanceMap[u.address] || {},
    }));

    res.json({ success: true, data: accounts, total, page, limit });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/accounts/:address?password=
router.patch('/accounts/:address', auth, async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    const { isSuspended, withdrawalsBlocked, username, adminEarningsOverride } = req.body;

    const user = await User.findOne({ address });
    if (!user) return res.json({ success: false, error: 'User not found' });

    if (isSuspended !== undefined) user.isSuspended = isSuspended;
    if (withdrawalsBlocked !== undefined) user.withdrawalsBlocked = withdrawalsBlocked;
    if (username !== undefined) user.username = username;
    await user.save();

    if (adminEarningsOverride !== undefined) {
      const balance = await Balance.findOne({ address });
      if (balance) {
        balance.adminEarningsOverride = adminEarningsOverride;
        await balance.save();
      }
    }

    res.json({ success: true, data: user });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/accounts/:address?password=
router.delete('/accounts/:address', auth, async (req, res) => {
  try {
    const address = req.params.address.toLowerCase();
    await Promise.all([
      User.deleteOne({ address }),
      Balance.deleteOne({ address }),
      Withdrawal.deleteMany({ address }),
      AiInvestment.deleteMany({ address }),
      Transaction.deleteMany({ address }),
    ]);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/admin/withdrawals?password=&status=
router.get('/withdrawals', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const withdrawals = await Withdrawal.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/withdrawals/:id?password=
router.patch('/withdrawals/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return res.json({ success: false, error: 'Status must be approved or rejected' });
    }

    const withdrawal = await Withdrawal.findById(req.params.id);
    if (!withdrawal) return res.json({ success: false, error: 'Withdrawal not found' });

    if (status === 'approved') {
      if (withdrawal.contractWithdrawalId == null) {
        return res.json({ success: false, error: 'No on-chain withdrawal ID. Wait for event sync.' });
      }
      const svc = getContractService();
      if (!svc) {
        return res.json({ success: false, error: 'Contract service not configured (missing CONTRACT_ADDRESS or OWNER_PRIVATE_KEY)' });
      }
      const txHash = await svc.approveWithdrawal(withdrawal.contractWithdrawalId);
      withdrawal.status = 'approved';
      withdrawal.txHash = txHash;
      await withdrawal.save();
    } else {
      withdrawal.status = 'rejected';
      await withdrawal.save();

      const balance = await Balance.findOne({ address: withdrawal.address });
      if (balance) {
        balance.tradingBalance = (balance.tradingBalance || 0) + withdrawal.amount;
        balance.pendingWithdrawal = Math.max(0, (balance.pendingWithdrawal || 0) - withdrawal.amount);
        await balance.save();
      }
    }

    res.json({ success: true, data: withdrawal });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/fund-contract?password=
router.post('/fund-contract', auth, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      return res.json({ success: false, error: 'Valid amount required' });
    }
    const svc = getContractService();
    if (!svc) {
      return res.json({ success: false, error: 'Contract service not configured' });
    }
    const txHash = await svc.fundContract(amount);
    res.json({ success: true, data: { txHash, amount } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/set-paused
router.post('/set-paused', auth, async (req, res) => {
  try {
    const { paused } = req.body;
    if (paused === undefined) return res.json({ success: false, error: 'paused boolean required' });
    const svc = getContractService();
    if (!svc) return res.json({ success: false, error: 'Contract service not configured' });
    const txHash = await svc.setPaused(paused);
    res.json({ success: true, data: { paused, txHash } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/emergency-withdraw
router.post('/emergency-withdraw', auth, async (req, res) => {
  try {
    const svc = getContractService();
    if (!svc) return res.json({ success: false, error: 'Contract service not configured' });
    const txHash = await svc.emergencyWithdraw();
    res.json({ success: true, data: { txHash } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/set-treasury
router.post('/set-treasury', auth, async (req, res) => {
  try {
    const { address } = req.body;
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.json({ success: false, error: 'Invalid wallet address' });
    }
    const svc = getContractService();
    if (!svc) return res.json({ success: false, error: 'Contract service not configured' });
    const txHash = await svc.setTreasury(address);
    res.json({ success: true, data: { txHash, address } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/credit — credit or debit a user balance
router.post('/credit', auth, async (req, res) => {
  try {
    const { address, field, amount, note } = req.body;
    const validFields = ['tradingBalance', 'aiEarnings', 'stakingEarnings', 'referralEarnings'];
    if (!address || !field || amount === undefined) {
      return res.json({ success: false, error: 'address, field and amount required' });
    }
    if (!validFields.includes(field)) {
      return res.json({ success: false, error: `field must be one of: ${validFields.join(', ')}` });
    }
    if (amount === 0) {
      return res.json({ success: false, error: 'Amount cannot be zero' });
    }

    const addr = address.toLowerCase();
    const balance = await Balance.findOne({ address: addr });
    if (!balance) return res.json({ success: false, error: 'User not found' });

    const isDeduct = amount < 0;
    if (isDeduct && (balance[field] || 0) + amount < 0) {
      return res.json({ success: false, error: `Insufficient ${field} to deduct` });
    }

    balance[field] = (balance[field] || 0) + amount;

    // Mirror on-chain deposit: bump totalDeposited when crediting tradingBalance
    if (field === 'tradingBalance' && !isDeduct) {
      balance.totalDeposited = (balance.totalDeposited || 0) + amount;
    }

    await balance.save();

    await Transaction.create({
      address: addr,
      type: isDeduct ? 'deduction' : 'deposit',
      amount: Math.abs(amount),
      description: note || `Admin ${isDeduct ? 'deduction from' : 'credit to'} ${field}`,
    });

    res.json({ success: true, data: { field, amount } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/admin/investments?password=&address=
router.get('/investments', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.address) filter.address = req.query.address.toLowerCase();
    if (req.query.status) filter.status = req.query.status;

    const investments = await AiInvestment.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json({ success: true, data: investments });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/investments/:id?password=
router.patch('/investments/:id', auth, async (req, res) => {
  try {
    const { action } = req.body;
    if (!['cancel', 'complete'].includes(action)) {
      return res.json({ success: false, error: 'action must be cancel or complete' });
    }

    const investment = await AiInvestment.findById(req.params.id);
    if (!investment) return res.json({ success: false, error: 'Investment not found' });
    if (investment.status !== 'active') return res.json({ success: false, error: 'Investment is not active' });

    const balance = await Balance.findOne({ address: investment.address });

    if (action === 'cancel') {
      investment.status = 'cancelled';
      investment.endDate = new Date();
      await investment.save();

      if (balance) {
        balance.tradingBalance = (balance.tradingBalance || 0) + investment.amount;
        await balance.save();
      }

      await Transaction.create({
        address: investment.address,
        type: 'refund',
        amount: investment.amount,
        description: `Admin cancelled investment — ${investment.packageName} package`,
      });
    } else {
      const now = Date.now();
      const elapsed = now - investment.startDate.getTime();
      const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
      const accrued = (investment.amount * investment.dailyRateBps * days) / 10000;
      const pending = Math.max(0, accrued - (investment.claimedEarnings || 0));

      investment.claimedEarnings = (investment.claimedEarnings || 0) + pending;
      investment.status = 'claimed';
      investment.endDate = new Date();
      await investment.save();

      if (balance) {
        balance.tradingBalance = (balance.tradingBalance || 0) + investment.amount + pending;
        balance.aiEarnings = (balance.aiEarnings || 0) + pending;
        await balance.save();
      }

      await Transaction.create({
        address: investment.address,
        type: 'ai_claim',
        amount: pending + investment.amount,
        description: `Admin force-completed investment — ${investment.packageName} package`,
      });
    }

    res.json({ success: true, data: investment });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/admin/contract-info?password=
router.get('/contract-info', auth, async (req, res) => {
  try {
    const address = process.env.CONTRACT_ADDRESS || '';
    let balance = null;
    if (address && process.env.BSC_RPC) {
      try {
        const rpcRes = await fetch(process.env.BSC_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [address, 'latest'], id: 1 }),
        });
        const json = await rpcRes.json();
        if (json.result) balance = parseInt(json.result, 16) / 1e18;
      } catch {}
    }
    res.json({ success: true, data: { address, balance, network: 'BSC Mainnet' } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/admin/traders?password=
router.get('/traders', auth, async (req, res) => {
  try {
    const traders = await Trader.find().sort({ createdAt: -1 });
    res.json({ success: true, data: traders });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/traders
router.post('/traders', auth, async (req, res) => {
  try {
    const { name, avatar, roiPercent, dailyRate, winRate, totalTrades, followers, aum, minCopyAmount, description, strategy, active } = req.body;
    if (!name) return res.json({ success: false, error: 'name required' });
    const monthly = parseFloat(roiPercent) || 0;
    const trader = await Trader.create({
      name, avatar: avatar || '',
      roiPercent: monthly, monthlyReturn: monthly, monthlyRoi: monthly,
      dailyRate: parseFloat(dailyRate) || 0,
      winRate: parseFloat(winRate) || 0,
      totalTrades: parseInt(totalTrades) || 0,
      followers: parseInt(followers) || 0,
      aum: parseFloat(aum) || 0,
      minCopyAmount: parseFloat(minCopyAmount) || 0.01,
      description: description || '',
      strategy: strategy || '',
      active: active !== false,
    });
    res.json({ success: true, data: trader });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/traders/:id
router.patch('/traders/:id', auth, async (req, res) => {
  try {
    const trader = await Trader.findById(req.params.id);
    if (!trader) return res.json({ success: false, error: 'Trader not found' });

    const fields = ['name', 'avatar', 'roiPercent', 'dailyRate', 'winRate', 'totalTrades', 'followers', 'aum', 'minCopyAmount', 'description', 'strategy', 'active'];
    fields.forEach(f => { if (req.body[f] !== undefined) trader[f] = req.body[f]; });

    if (req.body.roiPercent !== undefined) {
      const monthly = parseFloat(req.body.roiPercent) || 0;
      trader.roiPercent = monthly;
      trader.monthlyReturn = monthly;
      trader.monthlyRoi = monthly;
    }

    await trader.save();
    res.json({ success: true, data: trader });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/traders/:id
router.delete('/traders/:id', auth, async (req, res) => {
  try {
    await Trader.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
