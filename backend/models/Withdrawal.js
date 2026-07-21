const mongoose = require('mongoose');

const withdrawalSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'claimed'], default: 'pending' },
  contractWithdrawalId: { type: Number, default: null },
  txHash: { type: String, default: '' },
  claimDate: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
