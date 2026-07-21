const mongoose = require('mongoose');

const CopyTradeSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  traderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trader' },
  traderName: { type: String },
  amount: { type: Number, required: true },
  profit: { type: Number, default: 0 },
  roiPercent: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'stopped'], default: 'active' },
  capitalReturned: { type: Boolean, default: false },
  stoppedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('CopyTrade', CopyTradeSchema);
