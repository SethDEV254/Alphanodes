const mongoose = require('mongoose');

const payoutBatchSchema = new mongoose.Schema({
  totalAmount: { type: Number, required: true },
  recipientCount: { type: Number, required: true },
  recipients: [{ address: String, amount: Number }],
  investmentIds: [{ type: mongoose.Schema.Types.ObjectId }],
  txHash: { type: String, default: '' },
  status: { type: String, enum: ['executed', 'failed'], default: 'executed' },
  error: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('PayoutBatch', payoutBatchSchema);
