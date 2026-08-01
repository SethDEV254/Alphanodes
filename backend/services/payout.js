const AiInvestment = require('../models/AiInvestment');
const User = require('../models/User');
const { pendingRoi } = require('./aiAccrual');

const AFFILIATE_RATES = [0.10, 0.05, 0.02]; // level 1, 2, 3 — % of the downline's ROI this round
const CATEGORIES = ['roi', 'affiliate_l1', 'affiliate_l2', 'affiliate_l3'];

/**
 * Computes what every wallet is currently owed: each investor's pending AI ROI, plus
 * 3-tier affiliate commissions on that ROI paid up their referral chain. Pure read —
 * callers decide separately whether/when to mark it paid.
 *
 * Returns per-category recipient lists (rather than one merged list) so the caller
 * can execute each category as its own separate on-chain batchPayout() transaction —
 * making "this payment was an L2 affiliate commission" traceable on-chain via which
 * transaction it landed in, without needing any change to the existing contract.
 */
async function computeDailyPayouts() {
  const investments = await AiInvestment.find({ status: 'active' });

  const userCache = new Map();
  const getUser = async (address) => {
    if (!userCache.has(address)) userCache.set(address, await User.findOne({ address }));
    return userCache.get(address);
  };

  // category -> (address -> amount)
  const totalsByCategory = new Map(CATEGORIES.map((c) => [c, new Map()]));
  const add = (category, address, amount) => {
    if (amount <= 0) return;
    const totals = totalsByCategory.get(category);
    totals.set(address, (totals.get(address) || 0) + amount);
  };

  const investmentPayouts = []; // [{ investmentId, address, roi }] — used to mark claimedEarnings on execute
  const breakdown = [];         // per-investment detail for the admin preview

  for (const inv of investments) {
    const roi = pendingRoi(inv);
    if (roi <= 0) continue;

    add('roi', inv.address, roi);
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
        add(`affiliate_l${level + 1}`, upline, commission);
        detail.affiliates.push({ level: level + 1, address: upline, commission });
      }
      current = await getUser(upline);
    }

    breakdown.push(detail);
  }

  const categories = {};
  let totalAmount = 0;
  for (const category of CATEGORIES) {
    const recipients = Array.from(totalsByCategory.get(category).entries())
      .map(([address, amount]) => ({ address, amount }));
    const categoryTotal = recipients.reduce((s, r) => s + r.amount, 0);
    categories[category] = { recipients, totalAmount: categoryTotal };
    totalAmount += categoryTotal;
  }

  return { categories, breakdown, investmentPayouts, totalAmount };
}

module.exports = { computeDailyPayouts, pendingRoi, AFFILIATE_RATES, CATEGORIES };
