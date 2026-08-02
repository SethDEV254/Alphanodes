const mongoose = require('mongoose');

const distributionBatchSchema = new mongoose.Schema({
  totalAmount: { type: Number, required: true },
  recipients: [{
    address: String,
    label: String,
    percent: Number,
    amount: Number,
    txHash: String,
    status: { type: String, enum: ['sent', 'failed'], default: 'sent' },
    error: { type: String, default: '' },
  }],
  status: { type: String, enum: ['executed', 'partial', 'failed'], default: 'executed' },
}, { timestamps: true });

module.exports = mongoose.model('DistributionBatch', distributionBatchSchema);
