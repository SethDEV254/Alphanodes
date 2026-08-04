const AiInvestment = require('../models/AiInvestment');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const PayoutBatch = require('../models/PayoutBatch');
const { pendingRoi, isCapped } = require('./aiAccrual');
const { getContractBnbBalance } = require('./contractBalance');

const AFFILIATE_RATES = [0.10, 0.05, 0.02]; // level 1, 2, 3 — % of the downline's ROI this round
const CATEGORIES = ['roi', 'affiliate_l1', 'affiliate_l2', 'affiliate_l3'];

let contractService = null;
function getContractService() {
  if (!contractService && process.env.CONTRACT_ADDRESS && process.env.OWNER_PRIVATE_KEY) {
    try {
      contractService = require('./contract');
    } catch (e) {
      console.error('Contract service unavailable:', e.message);
    }
  }
  return contractService;
}

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

// Merges every category's recipients into one address->amount view.
function flattenRecipients(categories) {
  const totals = new Map();
  for (const category of CATEGORIES) {
    for (const r of categories[category].recipients) {
      totals.set(r.address, (totals.get(r.address) || 0) + r.amount);
    }
  }
  return Array.from(totals.entries()).map(([address, amount]) => ({ address, amount }));
}

/**
 * Runs the real on-chain daily payout: one batchPayout() transaction per category
 * (ROI, then L1/L2/L3 affiliate), with a full PayoutBatch audit trail and investment
 * bookkeeping — the exact same logic whether triggered by an admin clicking "Execute
 * Payout" or by the scheduled cron (see routes/cron.js). Never throws; every outcome
 * (including "nothing pending" or "insufficient balance") comes back as a result object.
 */
async function executeDailyPayouts() {
  const preview = await computeDailyPayouts();
  const pendingCategories = CATEGORIES.filter((c) => preview.categories[c].recipients.length > 0);
  if (!pendingCategories.length) {
    return { success: false, error: 'Nothing pending to pay out' };
  }

  const contractBalance = await getContractBnbBalance();
  if (contractBalance != null && contractBalance < preview.totalAmount) {
    return {
      success: false,
      error: `Contract balance (${contractBalance.toFixed(6)} BNB) is below what's owed (${preview.totalAmount.toFixed(6)} BNB)`,
    };
  }

  const svc = getContractService();
  if (!svc) return { success: false, error: 'Contract service not configured (missing CONTRACT_ADDRESS or OWNER_PRIVATE_KEY)' };

  const results = {};

  for (const category of pendingCategories) {
    const { recipients, totalAmount: categoryTotal } = preview.categories[category];
    const investmentIds = category === 'roi' ? preview.investmentPayouts.map((p) => p.investmentId) : [];

    let txHash;
    try {
      txHash = await svc.batchPayout(
        recipients.map((r) => r.address),
        recipients.map((r) => r.amount)
      );
    } catch (chainErr) {
      await PayoutBatch.create({
        category, totalAmount: categoryTotal, recipientCount: recipients.length,
        recipients, investmentIds, status: 'failed', error: chainErr.message,
      });
      results[category] = { success: false, error: chainErr.message };

      // If the ROI batch itself fails, nothing was paid this round — stop here.
      // An affiliate batch failing doesn't block the rest or the investor
      // bookkeeping below (that money already moved on-chain regardless).
      if (category === 'roi') {
        return { success: false, error: chainErr.message, data: { results } };
      }
      continue;
    }

    await PayoutBatch.create({
      category, totalAmount: categoryTotal, recipientCount: recipients.length,
      recipients, investmentIds, txHash, status: 'executed',
    });
    results[category] = { success: true, txHash, totalAmount: categoryTotal, recipientCount: recipients.length };

    if (category === 'roi') {
      // Lock in claimedEarnings/totalPaidOut for exactly what was just paid, so manual
      // claim/compound (which reads the same fields) can never re-pay this same ROI,
      // and flip to 'completed' the moment a position's 3x-of-principal cap is reached.
      await Promise.all(
        preview.investmentPayouts.map(async (p) => {
          const inv = await AiInvestment.findById(p.investmentId);
          if (!inv) return;
          inv.claimedEarnings = (inv.claimedEarnings || 0) + p.roi;
          inv.totalPaidOut = (inv.totalPaidOut || 0) + p.roi;
          if (isCapped(inv)) inv.status = 'completed';
          await inv.save();
        })
      );

      await Transaction.insertMany(
        preview.breakdown.map((d) => ({
          address: d.address, type: 'ai_claim', amount: d.roi, txHash,
          description: `Daily ${d.packageName} ROI (on-chain)`,
        }))
      );
    } else {
      const level = category.slice(-1);
      await Transaction.insertMany(
        preview.breakdown.flatMap((d) =>
          d.affiliates
            .filter((a) => String(a.level) === level)
            .map((a) => ({
              address: a.address, type: 'referral', amount: a.commission, txHash,
              description: `Level ${a.level} affiliate commission from ${d.address} (on-chain)`,
            }))
        )
      );
    }
  }

  const recipientCount = flattenRecipients(preview.categories).length;
  return { success: true, data: { totalAmount: preview.totalAmount, recipientCount, results } };
}

module.exports = {
  computeDailyPayouts, executeDailyPayouts, flattenRecipients,
  pendingRoi, AFFILIATE_RATES, CATEGORIES,
};
