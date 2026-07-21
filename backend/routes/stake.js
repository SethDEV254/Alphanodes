const router = require('express').Router();
const Stake = require('../models/Stake');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');

const EARLY_UNLOCK_PENALTY = 0.20; // 20%

const STAKE_RATES = {
  30:  120,  // 1.2%/day in bps
  60:  150,  // 1.5%/day
  90:  200,  // 2.0%/day
  180: 280,  // 2.8%/day
};

// GET /api/stake?address=
router.get('/', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'Address required' });

    const stakes = await Stake.find({ address }).sort({ createdAt: -1 });
    res.json({ success: true, data: stakes });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/stake/referral-stats?address=
router.get('/referral-stats', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'Address required' });

    const balance = await Balance.findOne({ address });
    const earned = balance?.stakingReferralEarned || 0;
    const claimable = balance?.stakingReferralClaimable || 0;

    res.json({ success: true, data: { totalEarned: earned, claimable } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/stake
router.post('/', async (req, res) => {
  try {
    // accept both `duration` and `durationDays` for compatibility
    const { address, amount, durationDays, duration, txHash } = req.body;
    const days = Number(durationDays || duration);

    if (!address || !amount || !days) {
      return res.json({ success: false, error: 'address, amount and duration required' });
    }

    const rate = STAKE_RATES[days];
    if (!rate) return res.json({ success: false, error: 'Invalid duration. Use 30, 60, 90, or 180' });
    if (amount <= 0) return res.json({ success: false, error: 'Amount must be greater than 0' });

    const addr = address.toLowerCase();
    const balance = await Balance.findOne({ address: addr });
    if (!balance) return res.json({ success: false, error: 'User not registered' });
    if ((balance.tradingBalance || 0) < amount) {
      return res.json({ success: false, error: 'Insufficient trading balance' });
    }

    const endDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const stakeDoc = await Stake.create({
      address: addr,
      amount,
      durationDays: days,
      dailyRateBps: rate,
      endDate,
      txHash: txHash || '',
    });

    balance.tradingBalance = Math.max(0, (balance.tradingBalance || 0) - amount);
    balance.stakedAmount = (balance.stakedAmount || 0) + amount;
    await balance.save();

    await Transaction.create({
      address: addr,
      type: 'stake',
      amount,
      txHash: txHash || '',
      description: `Staked for ${days} days at ${rate / 100}%/day`,
    });

    res.json({ success: true, data: stakeDoc });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/stake/:id/unstake
router.post('/:id/unstake', async (req, res) => {
  try {
    const { address, txHash } = req.body;
    if (!address) return res.json({ success: false, error: 'address required' });

    const addr = address.toLowerCase();
    const stakeDoc = await Stake.findOne({ _id: req.params.id, address: addr });
    if (!stakeDoc) return res.json({ success: false, error: 'Stake not found' });
    if (stakeDoc.status !== 'active') return res.json({ success: false, error: 'Stake not active' });
    if (Date.now() < stakeDoc.endDate.getTime()) {
      return res.json({ success: false, error: 'Still locked. Use early unlock instead.' });
    }

    const earnings = (stakeDoc.amount * stakeDoc.dailyRateBps * stakeDoc.durationDays) / 10000;
    stakeDoc.status = 'unstaked';
    await stakeDoc.save();

    const balance = await Balance.findOne({ address: addr });
    if (balance) {
      balance.tradingBalance = (balance.tradingBalance || 0) + stakeDoc.amount + earnings;
      balance.stakingEarnings = (balance.stakingEarnings || 0) + earnings;
      balance.stakedAmount = Math.max(0, (balance.stakedAmount || 0) - stakeDoc.amount);
      await balance.save();
    }

    await Transaction.create({
      address: addr,
      type: 'unstake',
      amount: stakeDoc.amount + earnings,
      txHash: txHash || '',
      description: `Unstaked — principal ${stakeDoc.amount.toFixed(4)} + ${earnings.toFixed(4)} BNB earnings`,
    });

    res.json({ success: true, data: { principal: stakeDoc.amount, earnings } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/stake/:id/early-unlock
router.post('/:id/early-unlock', async (req, res) => {
  try {
    const { address, txHash } = req.body;
    if (!address) return res.json({ success: false, error: 'address required' });

    const addr = address.toLowerCase();
    const stakeDoc = await Stake.findOne({ _id: req.params.id, address: addr });
    if (!stakeDoc) return res.json({ success: false, error: 'Stake not found' });
    if (stakeDoc.status !== 'active') return res.json({ success: false, error: 'Stake not active' });
    if (Date.now() >= stakeDoc.endDate.getTime()) {
      return res.json({ success: false, error: 'Lock period ended. Use unstake instead.' });
    }

    const penalty = stakeDoc.amount * EARLY_UNLOCK_PENALTY;
    const returned = stakeDoc.amount - penalty;

    stakeDoc.status = 'early_unlocked';
    stakeDoc.earlyUnlockPenalty = penalty;
    await stakeDoc.save();

    const balance = await Balance.findOne({ address: addr });
    if (balance) {
      balance.tradingBalance = (balance.tradingBalance || 0) + returned;
      balance.stakedAmount = Math.max(0, (balance.stakedAmount || 0) - stakeDoc.amount);
      await balance.save();
    }

    await Transaction.create({
      address: addr,
      type: 'early_unlock',
      amount: returned,
      txHash: txHash || '',
      description: `Early unlock — ${penalty.toFixed(4)} BNB penalty (20%)`,
    });

    res.json({ success: true, data: { returned, penalty } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/stake/:id/claim-tranche
router.post('/:id/claim-tranche', async (req, res) => {
  try {
    const { address, trancheIndex } = req.body;
    if (!address) return res.json({ success: false, error: 'address required' });
    const addr = address.toLowerCase();
    const stakeDoc = await Stake.findOne({ _id: req.params.id, address: addr });
    if (!stakeDoc) return res.json({ success: false, error: 'Stake not found' });
    if (stakeDoc.status !== 'active') return res.json({ success: false, error: 'Stake not active' });

    const elapsed = (Date.now() - stakeDoc.startDate.getTime()) / 86400000;
    const trancheInterval = stakeDoc.durationDays / 4;
    const trancheNum = Number(trancheIndex) + 1;
    if (elapsed < trancheInterval * trancheNum) {
      return res.json({ success: false, error: 'Tranche not yet claimable' });
    }

    const trancheEarnings = (stakeDoc.amount * stakeDoc.dailyRateBps * trancheInterval) / 10000;
    const alreadyClaimed = stakeDoc.claimedEarnings || 0;
    const maxClaimable = (trancheEarnings * trancheNum) - alreadyClaimed;
    if (maxClaimable <= 0) return res.json({ success: false, error: 'Tranche already claimed' });

    stakeDoc.claimedEarnings = alreadyClaimed + maxClaimable;
    await stakeDoc.save();

    const balance = await Balance.findOne({ address: addr });
    if (balance) {
      balance.tradingBalance = (balance.tradingBalance || 0) + maxClaimable;
      balance.stakingEarnings = (balance.stakingEarnings || 0) + maxClaimable;
      await balance.save();
    }
    await Transaction.create({
      address: addr,
      type: 'staking_tranche_claim',
      amount: maxClaimable,
      description: `Tranche ${trancheNum} claimed from stake`,
    });
    res.json({ success: true, data: { claimed: maxClaimable } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/stake/claim-referral-earnings
router.post('/claim-referral-earnings', async (req, res) => {
  try {
    const { address } = req.body;
    if (!address) return res.json({ success: false, error: 'address required' });

    const addr = address.toLowerCase();
    const balance = await Balance.findOne({ address: addr });
    if (!balance) return res.json({ success: false, error: 'User not found' });

    const claimable = balance.stakingReferralClaimable || 0;
    if (claimable <= 0) return res.json({ success: false, error: 'Nothing to claim' });

    balance.tradingBalance = (balance.tradingBalance || 0) + claimable;
    balance.stakingReferralClaimable = 0;
    await balance.save();

    await Transaction.create({
      address: addr,
      type: 'staking_referral_claim',
      amount: claimable,
      description: 'Staking referral earnings claimed',
    });

    res.json({ success: true, data: { claimed: claimable } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
