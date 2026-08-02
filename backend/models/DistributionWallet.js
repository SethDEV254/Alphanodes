const mongoose = require('mongoose');

const distributionWalletSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  label: { type: String, default: '' },
  percent: { type: Number, required: true, min: 0, max: 100 },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('DistributionWallet', distributionWalletSchema);
