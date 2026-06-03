import { useEffect, useState } from 'react';
import { useApp } from '../App.jsx';
import {
  getStakes, claimTranche, claimStakingReferral, getStakingReferralStats,
} from '../api.js';
import { useAlphaNodes } from '../hooks/useContract.js';

const fmt = (n) => (n || 0).toFixed(4);

const DURATIONS = [
  { days: 30,  rate: 1.2, color: '#fcd535', label: '1 Month',  totalReturn: 36 },
  { days: 60,  rate: 1.5, color: '#ff8c00', label: '2 Months', totalReturn: 90 },
  { days: 90,  rate: 2.0, color: '#00c076', label: '3 Months', totalReturn: 180 },
  { days: 180, rate: 2.8, color: '#a78bfa', label: '6 Months', totalReturn: 504 },
];

const BEST_RETURN = Math.max(...DURATIONS.map(d => d.totalReturn));

function IconBox({ color, size = 36, children }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: `${color}18`, border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
    }}>
      {children}
    </div>
  );
}

export default function Staking() {
  const { address, balance, refreshBalance } = useApp();
  const contract = useAlphaNodes();
  const [stakes, setStakes] = useState([]);
  const [refStats, setRefStats] = useState(null);
  const [duration, setDuration] = useState(DURATIONS[0]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (address) fetchData();
  }, [address]);

  const fetchData = async () => {
    try {
      const [sRes, rRes] = await Promise.all([
        getStakes(address),
        getStakingReferralStats(address),
      ]);
      setStakes(sRes.data.data || []);
      setRefStats(rRes.data.data || null);
    } catch (e) {}
  };

  const showMsg = (text, err) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(''), 3500);
  };

  const handleStake = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showMsg('Enter amount', true);
    if (amt > (balance?.tradingBalance || 0)) return showMsg('Insufficient balance', true);
    setLoading('stake');
    try {
      await contract.stake(amt, duration.days);
      showMsg('BNB staked successfully!');
      setAmount('');
      fetchData();
      refreshBalance();
    } catch (e) {
      showMsg(e.shortMessage || e.message || 'Failed to stake', true);
    } finally {
      setLoading('');
    }
  };

  const handleUnstake = async (s) => {
    const contractId = s.contractId ?? s._id;
    setLoading('unstake_' + s._id);
    try {
      await contract.unstake(contractId);
      showMsg('Unstaked successfully!');
      fetchData();
      refreshBalance();
    } catch (e) {
      showMsg(e.shortMessage || e.message || 'Failed to unstake', true);
    } finally {
      setLoading('');
    }
  };

  const handleEarlyUnlock = async (s) => {
    if (!confirm('Early unlock applies a penalty fee. Continue?')) return;
    const contractId = s.contractId ?? s._id;
    setLoading('unlock_' + s._id);
    try {
      await contract.earlyUnlock(contractId);
      showMsg('Early unlock completed');
      fetchData();
      refreshBalance();
    } catch (e) {
      showMsg(e.shortMessage || e.message || 'Failed to unlock', true);
    } finally {
      setLoading('');
    }
  };

  const handleClaimTranche = async (stakeId, trancheIndex) => {
    setLoading('tranche_' + stakeId);
    try {
      const r = await claimTranche(stakeId, { address, trancheIndex });
      if (!r.data.success) return showMsg(r.data.error || 'Failed', true);
      showMsg('Tranche claimed!');
      fetchData();
      refreshBalance();
    } catch (e) {
      showMsg('Failed to claim', true);
    } finally {
      setLoading('');
    }
  };

  const handleClaimRefEarnings = async () => {
    setLoading('ref');
    try {
      const r = await claimStakingReferral({ address });
      if (!r.data.success) return showMsg(r.data.error || 'Failed', true);
      showMsg('Referral earnings claimed!');
      fetchData();
      refreshBalance();
    } catch (e) {
      showMsg('Failed to claim', true);
    } finally {
      setLoading('');
    }
  };

  const active = stakes.filter(s => s.status === 'active' || s.status === 'unlocked');
  const completed = stakes.filter(s => !['active', 'unlocked'].includes(s.status));
  const now = new Date();

  const tradingBal = balance?.tradingBalance || 0;
  const totalStaked = balance?.stakedAmount || 0;
  const stakingEarnings = balance?.stakingEarnings || 0;
  const dailyEst = amount ? ((parseFloat(amount) || 0) * duration.rate / 100).toFixed(4) : null;
  const totalEst = amount ? ((parseFloat(amount) || 0) * duration.rate / 100 * duration.days).toFixed(4) : null;

  return (
    <div>
      {/* STAKING PROTOCOL header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(252,213,53,0.12)', border: '1px solid rgba(252,213,53,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fcd535" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 800, color: '#fcd535', letterSpacing: 2,
            textTransform: 'uppercase', padding: '3px 10px',
            background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.2)',
            borderRadius: 4,
          }}>
            Staking Protocol
          </span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '0 0 8px' }}>
          Stake &amp; <span style={{ color: '#fcd535' }}>Earn Guaranteed</span> Returns
        </h2>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: 0, maxWidth: 500 }}>
          Lock your BNB for 30, 90, or 180 days. Earn up to {BEST_RETURN}%
          total returns with consistent daily payouts.
        </p>
      </div>

      {msg && (
        <div style={{
          padding: '9px 14px', borderRadius: 8, marginBottom: 14, fontSize: 12,
          background: msg.err ? 'rgba(255,77,77,0.08)' : 'rgba(0,192,118,0.08)',
          border: `1px solid ${msg.err ? 'rgba(255,77,77,0.2)' : 'rgba(0,192,118,0.2)'}`,
          color: msg.err ? '#ff4d4d' : '#00c076',
        }}>
          {msg.text}
        </div>
      )}

      {/* 4 stat cards — 2×2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 22 }}>

        {/* WALLET */}
        <div className="card" style={{ padding: '16px', borderTop: '2px solid #fcd535' }}>
          <div style={{ marginBottom: 10 }}>
            <IconBox color="#fcd535">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="6" width="20" height="14" rx="2" />
                <path d="M2 10h20" />
                <path d="M16 14h.01" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </IconBox>
          </div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
            Wallet
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {tradingBal.toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: '#fcd535', marginTop: 3, fontWeight: 600 }}>BNB</div>
        </div>

        {/* TOTAL STAKED */}
        <div className="card" style={{ padding: '16px', borderTop: '2px solid #a78bfa' }}>
          <div style={{ marginBottom: 10 }}>
            <IconBox color="#a78bfa">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </IconBox>
          </div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
            Total Staked
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {totalStaked.toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 3, fontWeight: 600 }}>BNB</div>
        </div>

        {/* EARNINGS */}
        <div className="card" style={{ padding: '16px', borderTop: '2px solid #00c076', background: 'rgba(0,192,118,0.03)' }}>
          <div style={{ marginBottom: 10 }}>
            <IconBox color="#00c076">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                <polyline points="17 6 23 6 23 12" />
              </svg>
            </IconBox>
          </div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
            Earnings
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#00c076', lineHeight: 1 }}>
            +{stakingEarnings.toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: '#00c076', marginTop: 3, fontWeight: 600 }}>BNB</div>
        </div>

        {/* BEST APY */}
        <div className="card" style={{ padding: '16px', borderTop: '2px solid #3b9eff' }}>
          <div style={{ marginBottom: 10 }}>
            <IconBox color="#3b9eff">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="5" x2="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </IconBox>
          </div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
            Best APY
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#3b9eff', lineHeight: 1 }}>
            {BEST_RETURN}%
          </div>
          <div style={{ fontSize: 10, color: '#3b9eff', marginTop: 3, fontWeight: 600 }}>Total Return</div>
        </div>
      </div>

      {/* Choose Your Staking Plan */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{
          width: 30, height: 30, borderRadius: 8,
          background: 'rgba(252,213,53,0.1)', border: '1px solid rgba(252,213,53,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fcd535" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Choose Your Staking Plan</span>
        <span style={{
          fontSize: 10, color: '#fcd535', background: 'rgba(252,213,53,0.1)',
          border: '1px solid rgba(252,213,53,0.2)', borderRadius: 4,
          padding: '2px 8px', fontWeight: 700, marginLeft: 'auto',
        }}>
          {DURATIONS.length} tiers
        </span>
      </div>

      {/* Plan cards — horizontal scroll */}
      <div style={{
        display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 8,
        marginBottom: 18, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {DURATIONS.map(d => {
          const isSel = duration.days === d.days;
          return (
            <div
              key={d.days}
              onClick={() => setDuration(d)}
              className="card"
              style={{
                minWidth: 140, flexShrink: 0, padding: '18px 16px',
                cursor: 'pointer', transition: 'all 0.18s', textAlign: 'center',
                border: isSel ? `1.5px solid ${d.color}` : '1px solid rgba(255,255,255,0.06)',
                background: isSel ? `${d.color}10` : 'rgba(255,255,255,0.02)',
                position: 'relative', overflow: 'hidden',
              }}
            >
              {isSel && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: d.color }} />
              )}
              {/* Clock icon */}
              <div style={{
                width: 50, height: 50, borderRadius: 14, margin: '0 auto 12px',
                background: `${d.color}15`, border: `1px solid ${d.color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={d.color} strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: isSel ? d.color : '#fff', lineHeight: 1 }}>
                {d.totalReturn}%
              </div>
              <div style={{
                fontSize: 9, color: '#666', textTransform: 'uppercase',
                letterSpacing: 1.2, marginTop: 5, fontWeight: 700,
              }}>
                Total Return
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: isSel ? d.color : '#888', marginTop: 10 }}>
                {d.days} Days Lock
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>
                {d.rate}%/day
              </div>
            </div>
          );
        })}
      </div>

      {/* New Stake form */}
      <div className="card" style={{
        padding: '18px 20px', marginBottom: 18,
        borderTop: `2px solid ${duration.color}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: duration.color }}>{duration.label}</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              {duration.rate}%/day · {duration.totalReturn}% total
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#666' }}>Available</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#3b9eff' }}>{fmt(tradingBal)} BNB</div>
          </div>
        </div>

        <input
          type="number"
          placeholder="0.00 BNB"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          style={{
            width: '100%', background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
            padding: '12px 14px', color: '#fff', fontSize: 14,
            outline: 'none', marginBottom: 12, boxSizing: 'border-box',
          }}
        />

        {dailyEst && (
          <div style={{
            padding: '12px 14px', borderRadius: 10, marginBottom: 12,
            background: 'rgba(0,192,118,0.05)', border: '1px solid rgba(0,192,118,0.1)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: '#555' }}>Daily</span>
              <span style={{ color: '#00c076', fontWeight: 700 }}>+{dailyEst} BNB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: '#555' }}>Total ({duration.days}d)</span>
              <span style={{ color: '#00c076', fontWeight: 700 }}>+{totalEst} BNB</span>
            </div>
          </div>
        )}

        <button
          onClick={handleStake}
          disabled={loading === 'stake'}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 10, fontSize: 13, fontWeight: 800,
            background: `linear-gradient(135deg, ${duration.color}, ${duration.color}bb)`,
            color: '#0a0a0a', border: 'none', cursor: 'pointer',
            boxShadow: `0 4px 20px ${duration.color}30`, letterSpacing: 0.5,
          }}
        >
          {loading === 'stake' ? 'Staking...' : `Lock for ${duration.days} Days`}
        </button>
      </div>

      {/* Active stakes */}
      {active.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>
              Active Stakes
            </span>
            <span style={{
              fontSize: 10, color: '#fcd535', background: 'rgba(252,213,53,0.1)',
              border: '1px solid rgba(252,213,53,0.2)', borderRadius: 10, padding: '1px 7px', fontWeight: 700,
            }}>
              {active.length}
            </span>
          </div>
          {active.map(s => {
            const end = new Date(s.endDate);
            const isUnlocked = s.status === 'unlocked' || end <= now;
            const daysLeft = Math.max(0, Math.ceil((end - now) / 86400000));
            const totalDays = s.durationDays || 30;
            const elapsed = Math.min(totalDays, totalDays - daysLeft);
            const progress = Math.min(100, (elapsed / totalDays) * 100);
            const durInfo = DURATIONS.find(d => d.days === s.durationDays) || DURATIONS[0];
            const earnedAmount = s.status === 'active'
              ? (s.amount * (s.dailyRateBps || 0) * elapsed) / 10000
              : (s.amount * (s.dailyRateBps || 0) * totalDays) / 10000;

            return (
              <div key={s._id} style={{
                padding: '12px 14px', marginBottom: 8, borderRadius: 12,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                borderLeft: `3px solid ${isUnlocked ? '#00c076' : durInfo.color}`,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{fmt(s.amount)} BNB</span>
                      <span style={{
                        fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                        background: `${durInfo.color}15`, border: `1px solid ${durInfo.color}30`,
                        color: durInfo.color,
                      }}>
                        {s.durationDays}d
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: '#555' }}>
                      {s.dailyRateBps ? (s.dailyRateBps / 100).toFixed(1) : durInfo.rate}%/day
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#00c076' }}>+{fmt(earnedAmount)} BNB</div>
                    <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>earned</div>
                  </div>
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 10, color: '#444' }}>{progress.toFixed(0)}% complete</span>
                    <span style={{
                      fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 700,
                      background: isUnlocked ? 'rgba(0,192,118,0.1)' : 'rgba(255,255,255,0.05)',
                      color: isUnlocked ? '#00c076' : '#888',
                    }}>
                      {isUnlocked ? '✓ Unlocked' : `${daysLeft}d remaining`}
                    </span>
                  </div>
                  <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%', width: `${progress}%`, borderRadius: 2,
                      background: isUnlocked
                        ? 'linear-gradient(90deg,#00c076,#009960)'
                        : `linear-gradient(90deg,${durInfo.color},${durInfo.color}99)`,
                    }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {isUnlocked ? (
                    <button
                      onClick={() => handleUnstake(s)}
                      disabled={!!loading}
                      style={{
                        flex: 1, fontSize: 11, padding: '8px 0', borderRadius: 8, fontWeight: 700,
                        background: 'linear-gradient(135deg,#00c076,#009960)',
                        color: '#fff', border: 'none', cursor: 'pointer',
                      }}
                    >
                      {loading === 'unstake_' + s._id ? 'Unstaking...' : '↑ Unstake'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleEarlyUnlock(s)}
                      disabled={!!loading}
                      style={{
                        flex: 1, fontSize: 11, padding: '8px 0', borderRadius: 8, fontWeight: 700,
                        background: 'rgba(255,77,77,0.07)', border: '1px solid rgba(255,77,77,0.2)',
                        color: '#ff4d4d', cursor: 'pointer',
                      }}
                    >
                      {loading === 'unlock_' + s._id ? '...' : '⚠ Early Unlock'}
                    </button>
                  )}
                  {s.tranches?.map((tr, idx) => !tr.claimed && (
                    <button
                      key={idx}
                      onClick={() => handleClaimTranche(s._id, idx)}
                      disabled={!!loading}
                      style={{
                        fontSize: 11, padding: '8px 14px', borderRadius: 8, fontWeight: 700,
                        background: 'rgba(59,158,255,0.08)', border: '1px solid rgba(59,158,255,0.2)',
                        color: '#3b9eff', cursor: 'pointer',
                      }}
                    >
                      {loading === 'tranche_' + s._id ? '...' : `Claim T${idx + 1}`}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Completed */}
      {completed.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
            Completed
          </div>
          {completed.map(s => (
            <div key={s._id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '8px 10px', marginBottom: 4, borderRadius: 8,
              background: 'rgba(255,255,255,0.015)', borderLeft: '3px solid #333',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#666' }}>{fmt(s.amount)} BNB</span>
                <span style={{
                  fontSize: 10, color: '#444',
                  background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: '1px 5px',
                }}>
                  {s.durationDays}d
                </span>
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#00c076' }}>
                +{fmt((s.amount * (s.dailyRateBps || 0) * (s.durationDays || 0)) / 10000)} BNB
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Referral */}
      {refStats && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Staking Referrals
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(0,192,118,0.05)', border: '1px solid rgba(0,192,118,0.1)',
            }}>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Total Earned
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#00c076' }}>{fmt(refStats.totalEarned)} BNB</div>
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(252,213,53,0.05)', border: '1px solid rgba(252,213,53,0.1)',
            }}>
              <div style={{ fontSize: 10, color: '#555', marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                Claimable
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fcd535' }}>{fmt(refStats.claimable)} BNB</div>
            </div>
          </div>
          <button
            onClick={handleClaimRefEarnings}
            disabled={loading === 'ref' || !(refStats.claimable > 0)}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8, fontSize: 12, fontWeight: 700,
              background: refStats.claimable > 0 ? 'linear-gradient(135deg,#00c076,#009960)' : 'rgba(255,255,255,0.04)',
              color: refStats.claimable > 0 ? '#fff' : '#333',
              border: 'none', cursor: refStats.claimable > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            {loading === 'ref' ? 'Claiming...' : 'Claim Referral Earnings'}
          </button>
        </div>
      )}
    </div>
  );
}
