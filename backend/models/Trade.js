const mongoose = require('mongoose');

const TradeSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  asset: { type: String, required: true },
  direction: { type: String, enum: ['long', 'short'], required: true },
  amount: { type: Number, required: true },
  leverage: { type: Number, default: 1 },
  entryPrice: { type: Number, required: true },
  closePrice: { type: Number },
  pnl: { type: Number, default: 0 },
  status: { type: String, enum: ['open', 'closed'], default: 'open' },
  closedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Trade', TradeSchema);
