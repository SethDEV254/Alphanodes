const router = require('express').Router();
const User = require('../models/User');
const Balance = require('../models/Balance');

// GET /api/user?address=
router.get('/', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'Address required' });

    const user = await User.findOne({ address });
    if (!user) return res.json({ success: false, error: 'User not found' });

    const balance = await Balance.findOne({ address }) || {};

    res.json({
      success: true,
      data: {
        address: user.address,
        username: user.username,
        avatar: user.avatar,
        referralCode: user.address,
        referredBy: user.referredBy,
        tradingBalance: balance.tradingBalance || 0,
        totalDeposited: balance.totalDeposited || 0,
        totalWithdrawn: balance.totalWithdrawn || 0,
        aiEarnings: balance.aiEarnings || 0,
        stakingEarnings: balance.stakingEarnings || 0,
        referralEarnings: balance.referralEarnings || 0,
        stakedAmount: balance.stakedAmount || 0,
        pendingWithdrawal: balance.pendingWithdrawal || 0,
        isSuspended: user.isSuspended,
        withdrawalsBlocked: user.withdrawalsBlocked,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/user — register or update
router.post('/', async (req, res) => {
  try {
    const { address, username, avatar, referredBy } = req.body;
    if (!address) return res.json({ success: false, error: 'Address required' });

    const addr = address.toLowerCase();
    let user = await User.findOne({ address: addr });

    if (!user) {
      const userData = { address: addr };
      if (referredBy && referredBy.toLowerCase() !== addr) {
        userData.referredBy = referredBy.toLowerCase();
      }
      user = await User.create(userData);
      await Balance.create({ address: addr });
    }

    if (username !== undefined) user.username = username;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();

    res.json({ success: true, data: user });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
