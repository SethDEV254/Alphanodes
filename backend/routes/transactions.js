const router = require('express').Router();
const Transaction = require('../models/Transaction');

// GET /api/transactions?address=&limit=&type=
router.get('/', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'Address required' });

    const filter = { address };
    if (req.query.type) filter.type = req.query.type;

    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const transactions = await Transaction.find(filter).sort({ createdAt: -1 }).limit(limit);

    res.json({ success: true, data: transactions });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
