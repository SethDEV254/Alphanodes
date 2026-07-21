const router = require('express').Router();
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Setting = require('../models/Setting');

const PLATFORM_FEE = 0.02; // 2%
const REFERRAL_RATE = 0.05; // 5%

// POST /api/deposit
router.post('/', async (req, res) => {
  try {
    const { address, amount, txHash } = req.body;
    if (!address || !amount) return res.json({ success: false, error: 'address and amount required' });
    if (amount <= 0) return res.json({ success: false, error: 'Amount must be greater than 0' });

    const addr = address.toLowerCase();
    const [balance, user, pausedSetting] = await Promise.all([
      Balance.findOne({ address: addr }),
      User.findOne({ address: addr }),
      Setting.findOne({ key: 'platformPaused' }),
    ]);
    if (pausedSetting?.value === true) {
      return res.json({ success: false, error: 'Platform is under maintenance' });
    }
    if (!balance) return res.json({ success: false, error: 'User not registered' });
    if (user?.isSuspended) return res.json({ success: false, error: 'Account suspended' });

    const fee = amount * PLATFORM_FEE;
    const credit = amount - fee;

    balance.tradingBalance = (balance.tradingBalance || 0) + credit;
    balance.totalDeposited = (balance.totalDeposited || 0) + credit;
    await balance.save();

    // Referral commission
    if (user?.referredBy) {
      const refBalance = await Balance.findOne({ address: user.referredBy });
      if (refBalance) {
        const refBonus = credit * REFERRAL_RATE;
        refBalance.referralEarnings = (refBalance.referralEarnings || 0) + refBonus;
        await refBalance.save();

        await Transaction.create({
          address: user.referredBy,
          type: 'referral',
          amount: refBonus,
          txHash: txHash || '',
          description: `Referral commission from ${addr}`,
        });
      }
    }

    await Transaction.create({
      address: addr,
      type: 'deposit',
      amount: credit,
      txHash: txHash || '',
      description: 'BNB deposit',
    });

    res.json({ success: true, data: { credited: credit, fee } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
