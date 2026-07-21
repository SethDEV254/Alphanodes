const mongoose = require('mongoose');

const balanceSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true, lowercase: true },
  tradingBalance: { type: Number, default: 0 },
  totalDeposited: { type: Number, default: 0 },
  totalWithdrawn: { type: Number, default: 0 },
  aiEarnings: { type: Number, default: 0 },
  stakingEarnings: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },
  stakedAmount: { type: Number, default: 0 },
  totalAiInvested: { type: Number, default: 0 },
  pendingWithdrawal: { type: Number, default: 0 },
  withdrawnEarnings: { type: Number, default: 0 },
  adminEarningsOverride: { type: Number, default: 0 },
  stakingReferralEarned: { type: Number, default: 0 },
  stakingReferralClaimable: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Balance', balanceSchema);
