import { useEffect, useState } from 'react';
import { useApp } from '../App.jsx';
import { getLoanEligibility, getActiveLoan, getLoanHistory, requestLoan, repayLoan } from '../api.js';

const fmt = (n) => (n || 0).toFixed(4);
const fmtUsd = (n, price) => ((n || 0) * price).toFixed(2);

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

const STATUS_COLOR = { active: '#fcd535', repaid: '#00c076', defaulted: '#ff4d4d' };
const STATUS_BG   = { active: 'rgba(252,213,53,0.1)', repaid: 'rgba(0,192,118,0.1)', defaulted: 'rgba(255,77,77,0.1)' };

export default function Loans() {
  const { address, balance, refreshBalance, bnbPrice } = useApp();
  const [eligibility, setEligibility] = useState(null);
  const [activeLoan, setActiveLoan] = useState(null);
  const [history, setHistory] = useState([]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (address) fetchData();
  }, [address]);

  const fetchData = async () => {
    try {
      const [eRes, aRes, hRes] = await Promise.all([
        getLoanEligibility(address),
        getActiveLoan(address),
        getLoanHistory(address),
      ]);
      setEligibility(eRes.data.data || null);
      setActiveLoan(aRes.data.data || null);
      setHistory(hRes.data.data || []);
    } catch (e) {}
  };

  const showMsg = (text, err) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(''), 3500);
  };

  const handleRequest = async () => {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showMsg('Enter amount', true);
    if (!eligibility?.eligible) return showMsg('Not eligible for a loan', true);
    if (amt > (eligibility?.maxAmount || 0)) return showMsg(`Max loan: ${fmt(eligibility.maxAmount)} BNB`, true);
    setLoading('request');
    try {
      const r = await requestLoan({ address, amount: amt });
      if (!r.data.success) return showMsg(r.data.error || 'Loan request failed', true);
      showMsg('Loan approved and credited to your balance!');
      setAmount('');
      fetchData();
      refreshBalance();
    } catch (e) {
      showMsg('Loan request failed', true);
    } finally {
      setLoading('');
    }
  };

  const handleRepay = async () => {
    if (!activeLoan) return;
    setLoading('repay');
    try {
      const r = await repayLoan({ address, loanId: activeLoan._id });
      if (!r.data.success) return showMsg(r.data.error || 'Repayment failed', true);
      showMsg('Loan repaid successfully!');
      fetchData();
      refreshBalance();
    } catch (e) {
      showMsg('Repayment failed', true);
    } finally {
      setLoading('');
    }
  };

  const isEligible = eligibility?.eligible;
  const maxLoan = eligibility?.maxAmount || 0;
  const interestRate = eligibility?.interestRate || 10;
  const stakedCollateral = balance?.stakedAmount || 0;
  const tradingBal = balance?.tradingBalance || 0;

  const previewAmt = parseFloat(amount) || 0;
  const previewInterest = parseFloat((previewAmt * interestRate / 100).toFixed(6));
  const previewTotal = parseFloat((previewAmt + previewInterest).toFixed(6));

  const daysUntilDue = activeLoan?.dueDate
    ? Math.max(0, Math.ceil((new Date(activeLoan.dueDate) - Date.now()) / 86400000))
    : 0;
  const isOverdue = activeLoan?.dueDate && new Date(activeLoan.dueDate) < new Date();

  return (
    <div>
      {/* LOAN PROTOCOL header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(59,158,255,0.12)', border: '1px solid rgba(59,158,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b9eff" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 800, color: '#3b9eff', letterSpacing: 2,
            textTransform: 'uppercase', padding: '3px 10px',
            background: 'rgba(59,158,255,0.08)', border: '1px solid rgba(59,158,255,0.2)',
            borderRadius: 4,
          }}>
            Loan Protocol
          </span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '0 0 8px' }}>
          Stake-Backed{' '}
          <span style={{ color: '#3b9eff' }}>Instant Loans</span>
        </h2>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: 0, maxWidth: 500 }}>
          Borrow up to 50% of your staked BNB with a flat {interestRate}% interest rate.
          No credit checks — just stake and borrow.
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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>

        {/* COLLATERAL */}
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
            Collateral
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
            {stakedCollateral.toFixed(4)}
          </div>
          <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 3, fontWeight: 600 }}>BNB staked</div>
        </div>

        {/* MAX LOAN */}
        <div className="card" style={{ padding: '16px', borderTop: '2px solid #fcd535' }}>
          <div style={{ marginBottom: 10 }}>
            <IconBox color="#fcd535">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </IconBox>
          </div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
            Max Loan
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: isEligible ? '#fcd535' : '#444', lineHeight: 1 }}>
            {fmt(maxLoan)}
          </div>
          <div style={{ fontSize: 10, color: '#fcd535', marginTop: 3, fontWeight: 600, opacity: isEligible ? 1 : 0.4 }}>
            BNB available
          </div>
        </div>

        {/* INTEREST RATE */}
        <div className="card" style={{ padding: '16px', borderTop: '2px solid #00c076' }}>
          <div style={{ marginBottom: 10 }}>
            <IconBox color="#00c076">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="5" x2="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" />
                <circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </IconBox>
          </div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
            Interest Rate
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#00c076', lineHeight: 1 }}>{interestRate}%</div>
          <div style={{ fontSize: 10, color: '#00c076', marginTop: 3, fontWeight: 600 }}>Flat rate</div>
        </div>

        {/* STATUS */}
        <div className="card" style={{
          padding: '16px',
          borderTop: `2px solid ${isEligible ? '#3b9eff' : '#ff4d4d'}`,
        }}>
          <div style={{ marginBottom: 10 }}>
            <IconBox color={isEligible ? '#3b9eff' : '#ff4d4d'}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {isEligible
                  ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></>
                  : <><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></>
                }
              </svg>
            </IconBox>
          </div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
            Status
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: isEligible ? '#3b9eff' : '#ff4d4d', lineHeight: 1 }}>
            {isEligible ? 'Eligible' : 'No Stakes'}
          </div>
          <div style={{ fontSize: 10, color: isEligible ? '#3b9eff' : '#ff4d4d', marginTop: 3, fontWeight: 600, opacity: 0.8 }}>
            {isEligible ? '30-day term' : 'Stake first'}
          </div>
        </div>
      </div>

      {/* Active Loan */}
      {activeLoan ? (
        <div className="card" style={{
          padding: '20px', marginBottom: 14,
          borderTop: `2px solid ${isOverdue ? '#ff4d4d' : '#fcd535'}`,
          background: isOverdue ? 'rgba(255,77,77,0.03)' : 'rgba(252,213,53,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <IconBox color={isOverdue ? '#ff4d4d' : '#fcd535'} size={40}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="1" y="4" width="22" height="16" rx="2" />
                <line x1="1" y1="10" x2="23" y2="10" />
              </svg>
            </IconBox>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: isOverdue ? '#ff4d4d' : '#fcd535', letterSpacing: 0.5 }}>
                Active Loan {isOverdue && '— OVERDUE'}
              </div>
              <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                Due: {activeLoan.dueDate ? new Date(activeLoan.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}
                {!isOverdue && ` · ${daysUntilDue} days remaining`}
              </div>
            </div>
            <span style={{
              marginLeft: 'auto', fontSize: 10, fontWeight: 700, padding: '3px 10px',
              borderRadius: 20,
              background: isOverdue ? 'rgba(255,77,77,0.1)' : 'rgba(252,213,53,0.1)',
              border: `1px solid ${isOverdue ? 'rgba(255,77,77,0.2)' : 'rgba(252,213,53,0.2)'}`,
              color: isOverdue ? '#ff4d4d' : '#fcd535',
            }}>
              {isOverdue ? 'Overdue' : 'Active'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(252,213,53,0.05)', border: '1px solid rgba(252,213,53,0.1)',
            }}>
              <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>
                Principal
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fcd535' }}>
                {fmt(activeLoan.amount)}
              </div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>BNB</div>
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(255,77,77,0.05)', border: '1px solid rgba(255,77,77,0.1)',
            }}>
              <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>
                Interest
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#ff4d4d' }}>
                {fmt(activeLoan.interest)}
              </div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>BNB</div>
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 5 }}>
                Total Due
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fff' }}>
                {fmt(activeLoan.totalRepayment)}
              </div>
              <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>BNB</div>
            </div>
          </div>

          {/* Balance check */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 12px', borderRadius: 8, marginBottom: 12,
            background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <span style={{ fontSize: 11, color: '#555' }}>Trading balance</span>
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: tradingBal >= (activeLoan.totalRepayment || 0) ? '#00c076' : '#ff4d4d',
            }}>
              {fmt(tradingBal)} BNB
              {tradingBal < (activeLoan.totalRepayment || 0) && (
                <span style={{ fontSize: 9, color: '#ff4d4d', marginLeft: 6 }}>insufficient</span>
              )}
            </span>
          </div>

          <button
            onClick={handleRepay}
            disabled={loading === 'repay' || tradingBal < (activeLoan.totalRepayment || 0)}
            style={{
              width: '100%', padding: '13px 0', borderRadius: 10, fontSize: 13, fontWeight: 800,
              background: tradingBal >= (activeLoan.totalRepayment || 0)
                ? 'linear-gradient(135deg,#fcd535,#e6a800)'
                : 'rgba(255,255,255,0.04)',
              color: tradingBal >= (activeLoan.totalRepayment || 0) ? '#0a0a0a' : '#333',
              border: 'none',
              cursor: tradingBal >= (activeLoan.totalRepayment || 0) ? 'pointer' : 'not-allowed',
              boxShadow: tradingBal >= (activeLoan.totalRepayment || 0) ? '0 4px 20px rgba(252,213,53,0.25)' : 'none',
              letterSpacing: 0.5,
            }}
          >
            {loading === 'repay' ? 'Repaying...' : `Repay ${fmt(activeLoan.totalRepayment)} BNB`}
          </button>
        </div>
      ) : (
        /* Request Loan form */
        <div className="card" style={{ padding: '20px', marginBottom: 14, borderTop: '2px solid #3b9eff' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#3b9eff' }}>Request a Loan</div>
              <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                50% LTV · {interestRate}% flat · 30-day term
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#666' }}>Collateral</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa' }}>{fmt(stakedCollateral)} BNB</div>
            </div>
          </div>

          {!isEligible ? (
            <div style={{
              padding: '14px 16px', borderRadius: 10, textAlign: 'center',
              background: 'rgba(255,77,77,0.05)', border: '1px solid rgba(255,77,77,0.12)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#ff4d4d', marginBottom: 5 }}>
                No active stakes
              </div>
              <div style={{ fontSize: 12, color: '#666' }}>
                Stake BNB on the Staking page to unlock loans
              </div>
            </div>
          ) : (
            <>
              <input
                type="number"
                placeholder={`Max: ${fmt(maxLoan)} BNB`}
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{
                  width: '100%', background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10,
                  padding: '12px 14px', color: '#fff', fontSize: 14,
                  outline: 'none', marginBottom: 12, boxSizing: 'border-box',
                }}
              />

              {previewAmt > 0 && (
                <div style={{
                  padding: '12px 14px', borderRadius: 10, marginBottom: 14,
                  background: 'rgba(59,158,255,0.05)', border: '1px solid rgba(59,158,255,0.1)',
                }}>
                  <div style={{ fontSize: 10, color: '#555', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
                    Loan Breakdown
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#555' }}>Principal</span>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{fmt(previewAmt)} BNB</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                    <span style={{ color: '#555' }}>Interest ({interestRate}%)</span>
                    <span style={{ fontWeight: 700, color: '#ff4d4d' }}>+{fmt(previewInterest)} BNB</span>
                  </div>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 800,
                    paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <span style={{ color: '#888' }}>Total Repayment</span>
                    <span style={{ color: '#fcd535' }}>{fmt(previewTotal)} BNB</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleRequest}
                disabled={loading === 'request' || !previewAmt}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 10, fontSize: 13, fontWeight: 800,
                  background: previewAmt > 0
                    ? 'linear-gradient(135deg,#3b9eff,#1a7fd4)'
                    : 'rgba(255,255,255,0.04)',
                  color: previewAmt > 0 ? '#fff' : '#333',
                  border: 'none', cursor: previewAmt > 0 ? 'pointer' : 'not-allowed',
                  boxShadow: previewAmt > 0 ? '0 4px 20px rgba(59,158,255,0.25)' : 'none',
                  letterSpacing: 0.5,
                }}
              >
                {loading === 'request' ? 'Processing...' : 'Request Loan'}
              </button>
            </>
          )}
        </div>
      )}

      {/* Loan History */}
      {history.length > 0 && (
        <div className="card" style={{ padding: '14px 16px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Loan History
          </div>
          {history.map((l, i) => {
            const statusColor = STATUS_COLOR[l.status] || '#888';
            const statusBg = STATUS_BG[l.status] || 'rgba(255,255,255,0.05)';
            return (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', marginBottom: 6, borderRadius: 10,
                background: 'rgba(255,255,255,0.015)',
                borderLeft: `3px solid ${statusColor}`,
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>
                      {fmt(l.amount)} BNB
                    </span>
                    <span style={{
                      fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                      background: statusBg, color: statusColor,
                      textTransform: 'uppercase', letterSpacing: 0.5,
                    }}>
                      {l.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#444' }}>
                    {new Date(l.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {l.repaidAt && (
                      <span style={{ marginLeft: 6, color: '#00c076' }}>
                        · Repaid {new Date(l.repaidAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#ff4d4d' }}>
                    +{fmt(l.interest)} int
                  </div>
                  <div style={{ fontSize: 10, color: '#555', marginTop: 2 }}>
                    {fmt(l.totalRepayment)} total
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
