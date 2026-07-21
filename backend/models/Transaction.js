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

// Prevents double-crediting the same on-chain deposit if sync is retried/raced
transactionSchema.index(
  { txHash: 1 },
  { unique: true, partialFilterExpression: { type: 'deposit', txHash: { $ne: '' } } }
);

module.exports = mongoose.model('Transaction', transactionSchema);
