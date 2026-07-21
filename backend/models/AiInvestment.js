const mongoose = require('mongoose');

const aiInvestmentSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  packageId: { type: Number, required: true }, // 0=Starter,1=Growth,2=Pro,3=Elite
  packageName: { type: String, required: true },
  amount: { type: Number, required: true },
  dailyRateBps: { type: Number, required: true },
  durationDays: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  claimedEarnings: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'completed', 'claimed'], default: 'active' },
  coin: { type: String, default: 'BNB' },
  txHash: { type: String, default: '' },
}, { timestamps: true });

aiInvestmentSchema.virtual('pendingEarnings').get(function () {
  const now = Math.min(Date.now(), this.endDate.getTime());
  const elapsed = now - this.startDate.getTime();
  const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const totalEarnable = (this.amount * this.dailyRateBps * this.durationDays) / 10000;
  const accrued = (this.amount * this.dailyRateBps * days) / 10000;
  return Math.max(0, accrued - this.claimedEarnings);
});

module.exports = mongoose.model('AiInvestment', aiInvestmentSchema);
