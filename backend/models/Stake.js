const mongoose = require('mongoose');

const stakeSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  amount: { type: Number, required: true },
  durationDays: { type: Number, required: true }, // 30, 60, 90, 180
  dailyRateBps: { type: Number, required: true },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true },
  claimedEarnings: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'unstaked', 'early_unlocked'], default: 'active' },
  earlyUnlockPenalty: { type: Number, default: 0 },
  txHash: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Stake', stakeSchema);
