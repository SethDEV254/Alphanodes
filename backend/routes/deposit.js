const router = require('express').Router();
const { ethers } = require('ethers');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Setting = require('../models/Setting');
const ABI = require('../contracts/AlphaNodes.json');

const REFERRAL_RATE = 0.05; // 5% — mirrors the contract's on-chain referral bonus

// POST /api/deposit — credits the DB balance for an on-chain deposit, verified against the
// transaction receipt so the credited amount can never be spoofed by the client.
router.post('/', async (req, res) => {
  try {
    const { address, txHash } = req.body;
    if (!address || !txHash) return res.json({ success: false, error: 'address and txHash required' });

    const addr = address.toLowerCase();

    // Idempotent — a retried/duplicate sync for the same tx is a no-op, not an error
    const existing = await Transaction.findOne({ txHash, type: 'deposit' });
    if (existing) return res.json({ success: true, data: { credited: 0, alreadyProcessed: true } });

    if (!process.env.BSC_RPC || !process.env.CONTRACT_ADDRESS) {
      return res.json({ success: false, error: 'Chain sync not configured' });
    }

    const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC);
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      return res.json({ success: false, error: 'Transaction not found or not confirmed' });
    }
    if (receipt.to?.toLowerCase() !== process.env.CONTRACT_ADDRESS.toLowerCase()) {
      return res.json({ success: false, error: 'Transaction was not sent to the platform contract' });
    }

    const iface = new ethers.Interface(ABI);
    let eventUser = null;
    let credit = null;
    for (const log of receipt.logs) {
      let parsed;
      try { parsed = iface.parseLog(log); } catch { continue; }
      if (parsed?.name === 'Deposited') {
        eventUser = parsed.args.user.toLowerCase();
        credit = parseFloat(ethers.formatEther(parsed.args.amount));
        break;
      }
    }
    if (credit === null) return res.json({ success: false, error: 'No Deposited event found in transaction' });
    if (eventUser !== addr) return res.json({ success: false, error: 'Transaction does not belong to this address' });

    const [user, pausedSetting] = await Promise.all([
      User.findOne({ address: addr }),
      Setting.findOne({ key: 'platformPaused' }),
    ]);
    if (pausedSetting?.value === true) {
      return res.json({ success: false, error: 'Platform is under maintenance' });
    }
    if (user?.isSuspended) return res.json({ success: false, error: 'Account suspended' });

    // Claim this txHash atomically FIRST — the unique index rejects a duplicate/racing
    // request here, before any balance is touched, so a deposit can never be double-credited.
    try {
      await Transaction.create({
        address: addr,
        type: 'deposit',
        amount: credit,
        txHash,
        description: 'BNB deposit',
      });
    } catch (e) {
      if (e.code === 11000) return res.json({ success: true, data: { credited: 0, alreadyProcessed: true } });
      throw e;
    }

    await Balance.findOneAndUpdate(
      { address: addr },
      { $inc: { tradingBalance: credit, totalDeposited: credit } },
      { upsert: true }
    );

    // Referral commission — mirrors the contract's on-chain bonus into DB balance
    if (user?.referredBy) {
      const refBonus = credit * REFERRAL_RATE;
      await Balance.findOneAndUpdate(
        { address: user.referredBy },
        { $inc: { referralEarnings: refBonus } },
        { upsert: true }
      );
      await Transaction.create({
        address: user.referredBy,
        type: 'referral',
        amount: refBonus,
        txHash,
        description: `Referral commission from ${addr}`,
      });
    }

    res.json({ success: true, data: { credited: credit } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
