// Shared accrual math for AI investments. A single source of truth for the
// manual claim/compound routes, the daily payout batch, and admin force-complete —
// keeping it identical everywhere is what lets automatic on-chain payouts and
// manual claiming share one `claimedEarnings`/`totalPaidOut` pair without ever
// double-paying or exceeding the position's 3x-of-principal lifetime cap.
//
// `principal || amount` fallback covers investments created before the
// `principal` field existed (pre-existing docs never had it backfilled).
function pendingRoi(inv) {
  const elapsed = Date.now() - inv.startDate.getTime();
  const days = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const accrued = (inv.amount * inv.dailyRateBps * days) / 10000;
  const uncappedPending = Math.max(0, accrued - (inv.claimedEarnings || 0));

  const principal = inv.principal || inv.amount;
  const remainingCap = Math.max(0, principal * 3 - (inv.totalPaidOut || 0));

  return Math.min(uncappedPending, remainingCap);
}

// Whether a position has paid out its full 3x-of-principal lifetime cap.
function isCapped(inv) {
  const principal = inv.principal || inv.amount;
  return (inv.totalPaidOut || 0) >= principal * 3;
}

module.exports = { pendingRoi, isCapped };
