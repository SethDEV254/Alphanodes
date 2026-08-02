const mongoose = require('mongoose');

const replySchema = new mongoose.Schema({
  from: { type: String, enum: ['user', 'admin'], required: true },
  message: { type: String, required: true },
}, { timestamps: true });

const ticketSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, enum: ['open', 'answered', 'closed'], default: 'open' },
  replies: [replySchema],
}, { timestamps: true });

module.exports = mongoose.model('Ticket', ticketSchema);
