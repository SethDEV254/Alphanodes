const mongoose = require('mongoose');

const loanSchema = new mongoose.Schema({
  address: { type: String, required: true, lowercase: true },
  amount: { type: Number, required: true },
  interest: { type: Number, required: true },
  interestRate: { type: Number, required: true },
  totalRepayment: { type: Number, required: true },
  status: { type: String, enum: ['active', 'repaid', 'defaulted'], default: 'active' },
  dueDate: { type: Date, required: true },
  repaidAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('Loan', loanSchema);
