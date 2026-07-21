const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  address: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, default: '' },
  avatar: { type: String, default: '' },
  referredBy: { type: String, default: null, lowercase: true },
  isSuspended: { type: Boolean, default: false },
  withdrawalsBlocked: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
