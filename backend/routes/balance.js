const router = require('express').Router();
const Balance = require('../models/Balance');

// GET /api/balance?address=
router.get('/', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'Address required' });

    const balance = await Balance.findOne({ address }) || {};
    res.json({
      success: true,
      data: {
        tradingBalance: balance.tradingBalance || 0,
        aiEarnings: balance.aiEarnings || 0,
        stakingEarnings: balance.stakingEarnings || 0,
        referralEarnings: balance.referralEarnings || 0,
        pendingWithdrawal: balance.pendingWithdrawal || 0,
        totalDeposited: balance.totalDeposited || 0,
        totalWithdrawn: balance.totalWithdrawn || 0,
        totalAiInvested: balance.totalAiInvested || 0,
        stakedAmount: balance.stakedAmount || 0,
        withdrawnEarnings: balance.withdrawnEarnings || 0,
      },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
