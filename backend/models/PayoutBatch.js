const mongoose = require('mongoose');

const payoutBatchSchema = new mongoose.Schema({
  // Which slice of the daily payout this on-chain batchPayout() transaction
  // covers — lets a single day's payout be split into separately traceable
  // transactions instead of one opaque combined blob.
  category: {
    type: String,
    enum: ['roi', 'affiliate_l1', 'affiliate_l2', 'affiliate_l3'],
    required: true,
  },
  totalAmount: { type: Number, required: true },
  recipientCount: { type: Number, required: true },
  recipients: [{ address: String, amount: Number }],
  investmentIds: [{ type: mongoose.Schema.Types.ObjectId }],
  txHash: { type: String, default: '' },
  status: { type: String, enum: ['executed', 'failed'], default: 'executed' },
  error: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PayoutBatch', payoutBatchSchema);
