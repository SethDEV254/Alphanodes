const router = require('express').Router();
const ChatMessage = require('../models/ChatMessage');
const { chat } = require('../services/aiChat');

const DAILY_LIMIT = 20;

// POST /api/ai-analysis/chat
router.post('/chat', async (req, res) => {
  try {
    const { address, message } = req.body;
    if (!address || !message?.trim()) {
      return res.json({ success: false, error: 'address and message required' });
    }
    if (message.length > 2000) {
      return res.json({ success: false, error: 'Message too long' });
    }

    const addr = address.toLowerCase();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const countToday = await ChatMessage.countDocuments({ address: addr, createdAt: { $gte: since } });
    if (countToday >= DAILY_LIMIT) {
      return res.json({ success: false, error: `Daily chat limit (${DAILY_LIMIT}) reached. Try again tomorrow.` });
    }

    const reply = await chat(message.trim());
    await ChatMessage.create({ address: addr, message: message.trim(), reply });

    res.json({ success: true, data: { reply } });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
