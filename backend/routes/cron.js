const router = require('express').Router();
const { executeDailyPayouts } = require('../services/payout');

// GET /api/cron/payouts — triggered by Vercel Cron (see vercel.json "crons").
// Vercel signs its own cron requests with `Authorization: Bearer $CRON_SECRET`;
// reject anything else so this can't be hit by an outsider to force payouts
// on demand or spam batchPayout() transactions.
router.get('/payouts', async (req, res) => {
  const auth = req.headers.authorization || '';
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const result = await executeDailyPayouts();
    console.log('[cron] daily payout run:', result.success ? 'executed' : `skipped (${result.error})`);
    res.json(result);
  } catch (err) {
    console.error('[cron] daily payout run failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
