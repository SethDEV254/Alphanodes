const router = require('express').Router();
const Withdrawal = require('../models/Withdrawal');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

const WITHDRAW_LIMIT_MULT = 3;

// GET /api/withdraw?address=
router.get('/', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'Address required' });

    const withdrawals = await Withdrawal.find({ address }).sort({ createdAt: -1 });
    res.json({ success: true, data: withdrawals });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/withdraw
router.post('/', async (req, res) => {
  try {
    const { address, amount, txHash } = req.body;
    if (!address || !amount) return res.json({ success: false, error: 'address and amount required' });
    if (amount <= 0) return res.json({ success: false, error: 'Amount must be greater than 0' });

    const addr = address.toLowerCase();
    const [balance, user] = await Promise.all([
      Balance.findOne({ address: addr }),
      User.findOne({ address: addr }),
    ]);
    if (!balance) return res.json({ success: false, error: 'User not registered' });
    if (user?.isSuspended) return res.json({ success: false, error: 'Account suspended' });
    if (user?.withdrawalsBlocked) return res.json({ success: false, error: 'Withdrawals blocked' });
    if ((balance.tradingBalance || 0) < amount) {
      return res.json({ success: false, error: 'Insufficient trading balance' });
    }

    const withdrawLimit = (balance.totalDeposited || 0) * WITHDRAW_LIMIT_MULT;
    if (withdrawLimit > 0 && (balance.totalWithdrawn || 0) + amount > withdrawLimit) {
      return res.json({ success: false, error: 'Withdrawal limit reached (max 3x deposits)' });
    }

    balance.tradingBalance = Math.max(0, (balance.tradingBalance || 0) - amount);
    balance.pendingWithdrawal = (balance.pendingWithdrawal || 0) + amount;
    await balance.save();

    const withdrawal = await Withdrawal.create({
      address: addr,
      amount,
      txHash: txHash || '',
    });

    await Transaction.create({
      address: addr,
      type: 'withdrawal',
      amount,
      txHash: txHash || '',
      description: 'Withdrawal requested',
    });

    res.json({ success: true, data: withdrawal });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/withdraw/compound — move all earnings to trading balance
router.post('/compound', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.json({ success: false, error: 'address required' });

    const addr = address.toLowerCase();
    const balance = await Balance.findOne({ address: addr });
    if (!balance) return res.json({ success: false, error: 'User not registered' });

    const ai = balance.aiEarnings || 0;
    const staking = balance.stakingEarnings || 0;
    const referral = balance.referralEarnings || 0;
    const total = ai + staking + referral;

    if (total <= 0) return res.json({ success: false, error: 'No earnings to compound' });

    balance.tradingBalance = (balance.tradingBalance || 0) + total;
    balance.aiEarnings = 0;
    balance.stakingEarnings = 0;
    balance.referralEarnings = 0;
    await balance.save();

    await Transaction.create({
      address: addr,
      type: 'compound',
      amount: total,
      description: `Compounded all earnings to trading balance`,
    });

    res.json({ success: true, data: { compounded: total } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/withdraw/claim
router.post('/claim', async (req, res) => {
  try {
    const { address, withdrawalId } = req.body;
    if (!address || !withdrawalId) return res.json({ success: false, error: 'address and withdrawalId required' });

    const addr = address.toLowerCase();
    const withdrawal = await Withdrawal.findOne({ _id: withdrawalId, address: addr, status: 'approved' });
    if (!withdrawal) return res.json({ success: false, error: 'No approved withdrawal found' });

    withdrawal.status = 'claimed';
    withdrawal.claimDate = new Date();
    await withdrawal.save();

    const balance = await Balance.findOne({ address: addr });
    if (balance) {
      balance.pendingWithdrawal = Math.max(0, (balance.pendingWithdrawal || 0) - withdrawal.amount);
      balance.totalWithdrawn = (balance.totalWithdrawn || 0) + withdrawal.amount;
      await balance.save();
    }

    res.json({ success: true, data: { claimed: withdrawal.amount } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
