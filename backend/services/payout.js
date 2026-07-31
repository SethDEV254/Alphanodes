const AiInvestment = require('../models/AiInvestment');
const User = require('../models/User');
const { pendingRoi } = require('./aiAccrual');

const AFFILIATE_RATES = [0.10, 0.05, 0.02]; // level 1, 2, 3 — % of the downline's ROI this round

// Computes what every wallet is currently owed: each investor's pending AI ROI, plus
// 3-tier affiliate commissions on that ROI paid up their referral chain. Pure read —
// callers decide separately whether/when to mark it paid.
async function computeDailyPayouts() {
  const investments = await AiInvestment.find({ status: 'active' });

  const userCache = new Map();
  const getUser = async (address) => {
    if (!userCache.has(address)) userCache.set(address, await User.findOne({ address }));
    return userCache.get(address);
  };

  const totals = new Map(); // address -> amount
  const add = (address, amount) => {
    if (amount > 0) totals.set(address, (totals.get(address) || 0) + amount);
  };

  const investmentPayouts = []; // [{ investmentId, address, roi }] — used to mark claimedEarnings on execute
  const breakdown = [];         // per-investment detail for the admin preview

  for (const inv of investments) {
    const roi = pendingRoi(inv);
    if (roi <= 0) continue;

    add(inv.address, roi);
    investmentPayouts.push({ investmentId: inv._id, address: inv.address, roi });

    const detail = {
      investmentId: inv._id, address: inv.address, packageName: inv.packageName,
      amount: inv.amount, roi, affiliates: [],
    };

    let current = await getUser(inv.address);
    for (let level = 0; level < 3 && current?.referredBy; level++) {
      const upline = current.referredBy;
      const commission = roi * AFFILIATE_RATES[level];
      if (commission > 0) {
        add(upline, commission);
        detail.affiliates.push({ level: level + 1, address: upline, commission });
      }
      current = await getUser(upline);
    }

    breakdown.push(detail);
  }

  const recipients = Array.from(totals.entries()).map(([address, amount]) => ({ address, amount }));
  const totalAmount = recipients.reduce((s, r) => s + r.amount, 0);

  return { recipients, breakdown, investmentPayouts, totalAmount };
}

module.exports = { computeDailyPayouts, pendingRoi, AFFILIATE_RATES };
