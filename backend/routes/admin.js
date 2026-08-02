const router = require('express').Router();
const User = require('../models/User');
const Balance = require('../models/Balance');
const Withdrawal = require('../models/Withdrawal');
const Transaction = require('../models/Transaction');
const AiInvestment = require('../models/AiInvestment');
const Setting = require('../models/Setting');
const Trader = require('../models/Trader');
const Stake = require('../models/Stake');
const PayoutBatch = require('../models/PayoutBatch');
const Ticket = require('../models/Ticket');
const DistributionWallet = require('../models/DistributionWallet');
const DistributionBatch = require('../models/DistributionBatch');
const { AI_PACKAGES } = require('../config/aiPackages');
const { computeDailyPayouts, AFFILIATE_RATES, CATEGORIES } = require('../services/payout');
const { pendingRoi, isCapped } = require('../services/aiAccrual');
const adminAuth = require('../services/adminAuth');
const { getContractBnbBalance, getOwnerWalletBalance } = require('../services/contractBalance');
const { sendDistribution } = require('../services/distribution');

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

// Accepts EITHER a valid wallet-login session cookie OR the legacy shared
// password. Transitional (phase 1 of the wallet-auth rollout) — once wallet
// login is confirmed working in production for both admin addresses, the
// password branch gets removed in a follow-up change.
const auth = (req, res, next) => {
  const session = adminAuth.getSessionFromRequest(req);
  if (session) {
    req.adminAddress = session.address;
    return next();
  }
  const pw = req.query.password || req.body.password;
  if (pw !== process.env.ADMIN_PASSWORD) {
    return res.status(403).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

// POST /api/admin/verify — legacy password check
router.post('/verify', (req, res) => {
  const { password } = req.body;
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.json({ success: false, error: 'Invalid password' });
  }
  res.json({ success: true });
});

// POST /api/admin/auth/nonce { address } — start a wallet sign-in
router.post('/auth/nonce', (req, res) => {
  const { address } = req.body;
  if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
    return res.json({ success: false, error: 'Valid address required' });
  }
  const message = adminAuth.startSignIn(req, res, address);
  res.json({ success: true, data: { message } });
});

// POST /api/admin/auth/verify { address, signature } — complete a wallet sign-in
router.post('/auth/verify', (req, res) => {
  const { address, signature } = req.body;
  if (!address || !signature) {
    return res.json({ success: false, error: 'Address and signature required' });
  }

  const result = adminAuth.verifySignIn(req, address, signature);
  adminAuth.clearNonce(res);
  if (!result.ok) return res.json({ success: false, error: result.error });

  if (!adminAuth.isAdminAddress(address)) {
    return res.json({ success: false, error: 'This wallet is not authorized for admin access' });
  }

  adminAuth.issueSession(res, address);
  res.json({ success: true, data: { address } });
});

// POST /api/admin/auth/logout
router.post('/auth/logout', (req, res) => {
  adminAuth.clearSession(res);
  res.json({ success: true });
});

// GET /api/admin/auth/session — check for an existing valid session
router.get('/auth/session', (req, res) => {
  const session = adminAuth.getSessionFromRequest(req);
  res.json({ success: true, data: { authed: !!session, address: session?.address || null } });
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
    const totalTradingBalance = balances.reduce((s, b) => s + (b.tradingBalance || 0), 0);
    const activeStakes = await Stake.find({ status: 'active' }).select('amount');
    const totalStaked = activeStakes.reduce((s, st) => s + (st.amount || 0), 0);
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
        totalTradingBalance,
        totalStaked,
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
      const pending = pendingRoi(investment);

      investment.claimedEarnings = (investment.claimedEarnings || 0) + pending;
      investment.totalPaidOut = (investment.totalPaidOut || 0) + pending;
      investment.status = 'completed';
      await investment.save();

      if (balance) {
        balance.tradingBalance = (balance.tradingBalance || 0) + pending;
        balance.aiEarnings = (balance.aiEarnings || 0) + pending;
        await balance.save();
      }

      await Transaction.create({
        address: investment.address,
        type: 'ai_claim',
        amount: pending,
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

// GET /api/admin/ai-rates?password=
router.get('/ai-rates', auth, async (req, res) => {
  try {
    const setting = await Setting.findOne({ key: 'aiPackageRates' });
    const overrides = setting?.value || {};
    const rates = {};
    AI_PACKAGES.forEach(p => {
      rates[p._id] = {
        name: p.name,
        min: overrides[p._id]?.min ?? p.rateMin,
        max: overrides[p._id]?.max ?? p.rateMax,
      };
    });
    res.json({ success: true, data: rates });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/ai-rates?password= — body: { rates: { core: {min,max}, max: {...} } }
router.post('/ai-rates', auth, async (req, res) => {
  try {
    const { rates } = req.body;
    if (!rates || typeof rates !== 'object') {
      return res.json({ success: false, error: 'rates object required' });
    }
    const cleaned = {};
    for (const p of AI_PACKAGES) {
      const r = rates[p._id];
      if (!r) continue;
      const min = Number(r.min);
      const max = Number(r.max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min || max > 20) {
        return res.json({ success: false, error: `Invalid rate range for ${p.name}` });
      }
      cleaned[p._id] = { min, max };
    }
    await Setting.findOneAndUpdate(
      { key: 'aiPackageRates' },
      { value: cleaned },
      { upsert: true, new: true }
    );
    res.json({ success: true, data: cleaned });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Merges every category's recipients into one address->amount view — used for the
// admin summary list/total, which doesn't need the per-category split to display.
function flattenRecipients(categories) {
  const totals = new Map();
  for (const category of CATEGORIES) {
    for (const r of categories[category].recipients) {
      totals.set(r.address, (totals.get(r.address) || 0) + r.amount);
    }
  }
  return Array.from(totals.entries()).map(([address, amount]) => ({ address, amount }));
}

// GET /api/admin/payouts/preview?password= — what everyone is currently owed, no state change
router.get('/payouts/preview', auth, async (req, res) => {
  try {
    const [preview, contractBalance] = await Promise.all([computeDailyPayouts(), getContractBnbBalance()]);
    const recipients = flattenRecipients(preview.categories);
    res.json({
      success: true,
      data: {
        recipients,
        categories: preview.categories,
        breakdown: preview.breakdown,
        totalAmount: preview.totalAmount,
        contractBalance,
        sufficientBalance: contractBalance == null ? null : contractBalance >= preview.totalAmount,
        affiliateRates: AFFILIATE_RATES,
      },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/payouts/execute?password= — sends the real on-chain batch payouts.
// Executes one batchPayout() transaction PER CATEGORY (ROI, then L1/L2/L3 affiliate
// commissions) instead of one combined call, so each is separately traceable on-chain
// (its own tx hash/events) as exactly what it paid for — using the existing, unmodified
// contract's already-live batchPayout() function, just called more than once.
router.post('/payouts/execute', auth, async (req, res) => {
  try {
    const preview = await computeDailyPayouts();
    const pendingCategories = CATEGORIES.filter((c) => preview.categories[c].recipients.length > 0);
    if (!pendingCategories.length) {
      return res.json({ success: false, error: 'Nothing pending to pay out' });
    }

    const contractBalance = await getContractBnbBalance();
    if (contractBalance != null && contractBalance < preview.totalAmount) {
      return res.json({
        success: false,
        error: `Contract balance (${contractBalance.toFixed(6)} BNB) is below what's owed (${preview.totalAmount.toFixed(6)} BNB)`,
      });
    }

    const svc = getContractService();
    if (!svc) return res.json({ success: false, error: 'Contract service not configured (missing CONTRACT_ADDRESS or OWNER_PRIVATE_KEY)' });

    const results = {};

    for (const category of pendingCategories) {
      const { recipients, totalAmount: categoryTotal } = preview.categories[category];
      const investmentIds = category === 'roi' ? preview.investmentPayouts.map((p) => p.investmentId) : [];

      let txHash;
      try {
        txHash = await svc.batchPayout(
          recipients.map((r) => r.address),
          recipients.map((r) => r.amount)
        );
      } catch (chainErr) {
        await PayoutBatch.create({
          category, totalAmount: categoryTotal, recipientCount: recipients.length,
          recipients, investmentIds, status: 'failed', error: chainErr.message,
        });
        results[category] = { success: false, error: chainErr.message };

        // If the ROI batch itself fails, nothing was paid this round — stop here,
        // same as before. An affiliate batch failing doesn't block the rest or the
        // investor bookkeeping below (that money already moved on-chain regardless).
        if (category === 'roi') {
          return res.json({ success: false, error: chainErr.message, data: { results } });
        }
        continue;
      }

      await PayoutBatch.create({
        category, totalAmount: categoryTotal, recipientCount: recipients.length,
        recipients, investmentIds, txHash, status: 'executed',
      });
      results[category] = { success: true, txHash, totalAmount: categoryTotal, recipientCount: recipients.length };

      if (category === 'roi') {
        // Lock in claimedEarnings/totalPaidOut for exactly what was just paid, so manual
        // claim/compound (which reads the same fields) can never re-pay this same ROI,
        // and flip to 'completed' the moment a position's 3x-of-principal cap is reached.
        await Promise.all(
          preview.investmentPayouts.map(async (p) => {
            const inv = await AiInvestment.findById(p.investmentId);
            if (!inv) return;
            inv.claimedEarnings = (inv.claimedEarnings || 0) + p.roi;
            inv.totalPaidOut = (inv.totalPaidOut || 0) + p.roi;
            if (isCapped(inv)) inv.status = 'completed';
            await inv.save();
          })
        );

        await Transaction.insertMany(
          preview.breakdown.map((d) => ({
            address: d.address, type: 'ai_claim', amount: d.roi, txHash,
            description: `Daily ${d.packageName} ROI (on-chain)`,
          }))
        );
      } else {
        const level = category.slice(-1);
        await Transaction.insertMany(
          preview.breakdown.flatMap((d) =>
            d.affiliates
              .filter((a) => String(a.level) === level)
              .map((a) => ({
                address: a.address, type: 'referral', amount: a.commission, txHash,
                description: `Level ${a.level} affiliate commission from ${d.address} (on-chain)`,
              }))
          )
        );
      }
    }

    const recipientCount = flattenRecipients(preview.categories).length;
    res.json({
      success: true,
      data: { totalAmount: preview.totalAmount, recipientCount, results },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/admin/payouts/history?password= — past executed/failed batches
router.get('/payouts/history', auth, async (req, res) => {
  try {
    const batches = await PayoutBatch.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: batches });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── Support Tickets ────────────────────────────────────────────────────────

// GET /api/admin/tickets?password=&status=
router.get('/tickets', auth, async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {};
    const tickets = await Ticket.find(filter).sort({ updatedAt: -1 }).limit(200);
    res.json({ success: true, data: tickets });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/tickets/:id/reply?password=
router.post('/tickets/:id/reply', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.json({ success: false, error: 'Message required' });

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.json({ success: false, error: 'Ticket not found' });

    ticket.replies.push({ from: 'admin', message: message.trim() });
    ticket.status = 'answered';
    await ticket.save();

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/tickets/:id?password=
router.patch('/tickets/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['open', 'answered', 'closed'].includes(status)) {
      return res.json({ success: false, error: 'Invalid status' });
    }

    const ticket = await Ticket.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!ticket) return res.json({ success: false, error: 'Ticket not found' });

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// ─── Distribution Wallets ───────────────────────────────────────────────────
// Fully off-chain, decoupled from the immutable contract's fixed 4-wallet
// deposit split — an admin-configurable list of wallets that can receive a
// manually-triggered share of BNB sent from the owner wallet.

// GET /api/admin/distribution?password=
router.get('/distribution', auth, async (req, res) => {
  try {
    const [wallets, owner] = await Promise.all([
      DistributionWallet.find().sort({ createdAt: -1 }),
      getOwnerWalletBalance(),
    ]);
    res.json({ success: true, data: { wallets, owner } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/distribution?password=
router.post('/distribution', auth, async (req, res) => {
  try {
    const { address, label, percent } = req.body;
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return res.json({ success: false, error: 'Valid address required' });
    }
    const pct = Number(percent);
    if (!(pct > 0 && pct <= 100)) {
      return res.json({ success: false, error: 'Percent must be between 0 and 100' });
    }

    const wallet = await DistributionWallet.create({
      address: address.toLowerCase(),
      label: label || '',
      percent: pct,
    });
    res.json({ success: true, data: wallet });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// DELETE /api/admin/distribution/:id?password=
router.delete('/distribution/:id', auth, async (req, res) => {
  try {
    await DistributionWallet.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/admin/distribution/execute?password= — sends real BNB, split by percentage
router.post('/distribution/execute', auth, async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!(amount > 0)) return res.json({ success: false, error: 'Enter a valid amount' });

    const activeWallets = await DistributionWallet.find({ active: true });
    const totalPercent = activeWallets.reduce((s, w) => s + w.percent, 0);
    if (!activeWallets.length || totalPercent <= 0) {
      return res.json({ success: false, error: 'No active distribution wallets configured' });
    }

    const owner = await getOwnerWalletBalance();
    if (owner != null && owner.balance < amount) {
      return res.json({
        success: false,
        error: `Owner wallet balance (${owner.balance.toFixed(6)} BNB) is below the requested amount (${amount} BNB)`,
      });
    }

    // Normalize so a partial-active-set still sums exactly to `amount`.
    const recipients = activeWallets.map((w) => ({
      address: w.address,
      label: w.label,
      percent: w.percent,
      amount: amount * (w.percent / totalPercent),
    }));

    const results = await sendDistribution(recipients);
    const allFailed = results.every((r) => r.status === 'failed');
    const anyFailed = results.some((r) => r.status === 'failed');

    const batch = await DistributionBatch.create({
      totalAmount: amount,
      recipients: results,
      status: allFailed ? 'failed' : anyFailed ? 'partial' : 'executed',
    });

    if (allFailed) return res.json({ success: false, error: 'All transfers failed', data: batch });
    res.json({ success: true, data: batch });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/admin/distribution/history?password=
router.get('/distribution/history', auth, async (req, res) => {
  try {
    const batches = await DistributionBatch.find().sort({ createdAt: -1 }).limit(50);
    res.json({ success: true, data: batches });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
