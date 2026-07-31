const mongoose = require('mongoose');

const aiInvestmentSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  packageId: { type: Number, required: true }, // 0=Starter,1=Growth,2=Pro,3=Elite
  packageName: { type: String, required: true },
  amount: { type: Number, required: true },
  // Fixed at creation; never mutated (not even by compound) — basis for the 3x cap.
  // Not required: pre-existing docs predate this field and fall back to `amount` (see aiAccrual.js).
  principal: { type: Number, required: false },
  dailyRateBps: { type: Number, required: true },
  durationDays: { type: Number, required: false }, // informational only for new docs; not used for accrual/completion
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: false }, // legacy day-capped docs only
  claimedEarnings: { type: Number, default: 0 },
  totalPaidOut: { type: Number, default: 0 }, // cumulative BNB actually paid out (claim/batchPayout); caps at principal*3
  status: { type: String, enum: ['active', 'completed', 'claimed', 'cancelled'], default: 'active' },
  coin: { type: String, default: 'BNB' },
  txHash: { type: String, default: '' },
}, { timestamps: true });

// Cap-aware: mirrors backend/services/aiAccrual.js pendingRoi() for docs loaded as plain Mongoose instances.
// `principal || amount` fallback covers pre-existing docs created before this field existed.
aiInvestmentSchema.virtual('pendingEarnings').get(function () {
  const elapsed = Date.now() - this.startDate.getTime();
  const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const accrued = (this.amount * this.dailyRateBps * days) / 10000;
  const uncappedPending = Math.max(0, accrued - (this.claimedEarnings || 0));
  const principal = this.principal || this.amount;
  const remainingCap = Math.max(0, principal * 3 - (this.totalPaidOut || 0));
  return Math.min(uncappedPending, remainingCap);
});

module.exports = mongoose.model('AiInvestment', aiInvestmentSchema);
