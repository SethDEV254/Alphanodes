const mongoose = require('mongoose');

const TraderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  avatar: { type: String, default: '' },
  roiPercent: { type: Number, default: 0 },
  monthlyReturn: { type: Number, default: 0 },
  dailyRate: { type: Number, default: 0 },
  winRate: { type: Number, default: 0 },
  totalTrades: { type: Number, default: 0 },
  monthlyRoi: { type: Number, default: 0 },
  followers: { type: Number, default: 0 },
  aum: { type: Number, default: 0 },
  minCopyAmount: { type: Number, default: 0.01 },
  description: { type: String, default: '' },
  strategy: { type: String, default: '' },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Trader', TraderSchema);
