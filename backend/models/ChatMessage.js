const mongoose = require('mongoose');

// Doubles as the daily rate-limit ledger — see routes/ai-analysis.js
const chatMessageSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  message: { type: String, required: true },
  reply: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
