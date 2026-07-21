const router = require('express').Router();
const Loan = require('../models/Loan');
const Stake = require('../models/Stake');
const Balance = require('../models/Balance');
const Transaction = require('../models/Transaction');

const INTEREST_RATE = 10;     // 10% flat
const LOAN_RATIO = 0.5;       // borrow up to 50% of staked amount
const LOAN_DURATION_DAYS = 30;

// GET /api/loan/eligibility?address=
router.get('/eligibility', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'address required' });

    const [balance, activeStakes] = await Promise.all([
      Balance.findOne({ address }),
      Stake.find({ address, status: 'active' }),
    ]);

    const stakedAmount = activeStakes.reduce((s, st) => s + (st.amount || 0), 0);
    const maxAmount = parseFloat((stakedAmount * LOAN_RATIO).toFixed(6));
    const eligible = stakedAmount > 0 && maxAmount > 0;

    // Check if already has active loan
    const activeLoan = await Loan.findOne({ address, status: 'active' });
    if (activeLoan) {
      return res.json({
        success: true,
        data: { eligible: false, maxAmount: 0, interestRate: INTEREST_RATE, reason: 'Repay existing loan first' },
      });
    }

    res.json({
      success: true,
      data: { eligible, maxAmount, interestRate: INTEREST_RATE, stakedAmount },
    });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/loan/active?address=
router.get('/active', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'address required' });

    const loan = await Loan.findOne({ address, status: 'active' });
    res.json({ success: true, data: loan || null });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/loan/history?address=
router.get('/history', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'address required' });

    const loans = await Loan.find({ address }).sort({ createdAt: -1 });
    res.json({ success: true, data: loans });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/loan/request
router.post('/request', async (req, res) => {
  try {
    const { address, amount } = req.body;
    if (!address || !amount) return res.json({ success: false, error: 'address and amount required' });
    if (amount <= 0) return res.json({ success: false, error: 'Amount must be greater than 0' });

    const addr = address.toLowerCase();

    const [balance, activeStakes, existingLoan] = await Promise.all([
      Balance.findOne({ address: addr }),
      Stake.find({ address: addr, status: 'active' }),
      Loan.findOne({ address: addr, status: 'active' }),
    ]);

    if (!balance) return res.json({ success: false, error: 'User not registered' });
    if (existingLoan) return res.json({ success: false, error: 'Repay existing loan first' });

    const stakedAmount = activeStakes.reduce((s, st) => s + (st.amount || 0), 0);
    const maxAmount = parseFloat((stakedAmount * LOAN_RATIO).toFixed(6));

    if (stakedAmount === 0) return res.json({ success: false, error: 'No active stakes. Stake BNB first.' });
    if (amount > maxAmount) return res.json({ success: false, error: `Max loan is ${maxAmount.toFixed(4)} BNB` });

    const interest = parseFloat((amount * INTEREST_RATE / 100).toFixed(6));
    const totalRepayment = parseFloat((amount + interest).toFixed(6));
    const dueDate = new Date(Date.now() + LOAN_DURATION_DAYS * 24 * 60 * 60 * 1000);

    const loan = await Loan.create({
      address: addr,
      amount,
      interest,
      interestRate: INTEREST_RATE,
      totalRepayment,
      dueDate,
    });

    balance.tradingBalance = (balance.tradingBalance || 0) + amount;
    await balance.save();

    await Transaction.create({
      address: addr,
      type: 'loan',
      amount,
      description: `Loan of ${amount.toFixed(4)} BNB approved — repay ${totalRepayment.toFixed(4)} BNB by ${dueDate.toLocaleDateString()}`,
    });

    res.json({ success: true, data: loan });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/loan/repay
router.post('/repay', async (req, res) => {
  try {
    const { address, loanId } = req.body;
    if (!address) return res.json({ success: false, error: 'address required' });

    const addr = address.toLowerCase();
    const loan = loanId
      ? await Loan.findOne({ _id: loanId, address: addr, status: 'active' })
      : await Loan.findOne({ address: addr, status: 'active' });

    if (!loan) return res.json({ success: false, error: 'No active loan found' });

    const balance = await Balance.findOne({ address: addr });
    if (!balance) return res.json({ success: false, error: 'User not found' });
    if ((balance.tradingBalance || 0) < loan.totalRepayment) {
      return res.json({ success: false, error: `Insufficient balance. Need ${loan.totalRepayment.toFixed(4)} BNB` });
    }

    balance.tradingBalance = Math.max(0, (balance.tradingBalance || 0) - loan.totalRepayment);
    await balance.save();

    loan.status = 'repaid';
    loan.repaidAt = new Date();
    await loan.save();

    await Transaction.create({
      address: addr,
      type: 'loan_repay',
      amount: loan.totalRepayment,
      description: `Loan repaid — principal ${loan.amount.toFixed(4)} + interest ${loan.interest.toFixed(4)} BNB`,
    });

    res.json({ success: true, data: { repaid: loan.totalRepayment } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
