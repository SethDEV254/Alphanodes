const router = require('express').Router();
const User = require('../models/User');
const Transaction = require('../models/Transaction');

// GET /api/referral?address= — get referral stats
router.get('/', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'Address required' });

    const referrals = await User.find({ referredBy: address }).select('address createdAt');
    const earnings = await Transaction.find({ address, type: 'referral' });
    const totalEarned = earnings.reduce((s, t) => s + t.amount, 0);

    res.json({
      success: true,
      data: {
        referralCode: address,
        totalReferrals: referrals.length,
        totalEarned,
        referrals,
      },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
