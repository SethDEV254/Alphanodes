const router = require('express').Router();
const Ticket = require('../models/Ticket');

// POST /api/tickets
router.post('/', async (req, res) => {
  try {
    const { address, subject, message } = req.body;
    if (!address || !subject?.trim() || !message?.trim()) {
      return res.json({ success: false, error: 'address, subject and message required' });
    }

    const ticket = await Ticket.create({
      address: address.toLowerCase(),
      subject: subject.trim(),
      message: message.trim(),
    });

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// GET /api/tickets?address=
router.get('/', async (req, res) => {
  try {
    const address = req.query.address?.toLowerCase();
    if (!address) return res.json({ success: false, error: 'Address required' });

    const tickets = await Ticket.find({ address }).sort({ updatedAt: -1 });
    res.json({ success: true, data: tickets });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// POST /api/tickets/:id/reply
router.post('/:id/reply', async (req, res) => {
  try {
    const { address, message } = req.body;
    if (!address || !message?.trim()) {
      return res.json({ success: false, error: 'address and message required' });
    }

    const ticket = await Ticket.findById(req.params.id);
    if (!ticket) return res.json({ success: false, error: 'Ticket not found' });
    if (ticket.address !== address.toLowerCase()) {
      return res.json({ success: false, error: 'Not your ticket' });
    }

    ticket.replies.push({ from: 'user', message: message.trim() });
    if (ticket.status === 'answered') ticket.status = 'open';
    await ticket.save();

    res.json({ success: true, data: ticket });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

module.exports = router;
