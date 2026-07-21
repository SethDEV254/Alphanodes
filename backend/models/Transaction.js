const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  type: {
    type: String,
    enum: ['deposit', 'withdrawal', 'ai_investment', 'ai_claim', 'stake', 'unstake', 'early_unlock', 'referral'],
    required: true,
  },
  amount: { type: Number, required: true },
  txHash: { type: String, default: '' },
  description: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Transaction', transactionSchema);
