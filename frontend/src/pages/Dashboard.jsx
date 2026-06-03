import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { useApp } from '../App.jsx';
import { getTransactions, compound, getAiInvestments } from '../api.js';
import { useAlphaNodes, useUserBalance, fetchOnChainBalance } from '../hooks/useContract.js';
import { CONTRACT_ADDRESS } from '../config.js';
import { TxSuccess } from '../components/TxSuccess.jsx';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
const BSC_RPC = 'https://bsc-dataseed.binance.org/';

async function waitForTx(hash) {
  for (let i = 0; i < 40; i++) {
    const res = await fetch(BSC_RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionReceipt', params: [hash], id: 1 }),
    });
    const data = await res.json();
    if (data.result?.status === '0x1') return;
    if (data.result?.status === '0x0') throw new Error('Transaction reverted');
    await new Promise(r => setTimeout(r, 2000));
  }
  throw new Error('Transaction timeout');
}

const fmt = (n) => (n || 0).toFixed(4);
const fmtUsd = (n, price) => ((n || 0) * price).toFixed(2);

const TX_COLORS = {
  deposit: '#00c076',
  withdrawal: '#ff4d4d',
  ai_claim: '#3b9eff',
  ai_compound: '#fcd535',
  ai_investment: '#a78bfa',
  compound: '#fcd535',
  loan: '#00c076',
  loan_repay: '#ff4d4d',
  default: '#555',
};

const TX_LABELS = {
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  ai_claim: 'AI Profit',
  ai_compound: 'Compounded',
  ai_investment: 'AI Deploy',
  staking: 'Staked',
  unstake: 'Unstaked',
  compound: 'Compounded',
  loan: 'Loan',
  loan_repay: 'Loan Repaid',
};


function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function cdTimer(endDate) {
  const diff = Math.max(0, new Date(endDate).getTime() - Date.now());
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function cdFull(endDate) {
  const diff = Math.max(0, new Date(endDate).getTime() - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${d}d ${h}h ${m}m ${s}s`;
}


function IconBox({ color, size = 40, children }) {
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

export default function Dashboard() {
  const { address, user, balance, refreshBalance, bnbPrice } = useApp();
  const navigate = useNavigate();
  const [txs, setTxs] = useState([]);
  const [depositAmt, setDepositAmt] = useState('');
  const [withdrawAmt, setWithdrawAmt] = useState('');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');
  const [activeTab, setActiveTab] = useState('deposit');
  const [showFundsModal, setShowFundsModal] = useState(false);
  const [activeInvestments, setActiveInvestments] = useState([]);
  const [liveAiPending, setLiveAiPending] = useState(0);
  const [tick, setTick] = useState(0);

  const contract = useAlphaNodes();
  const { address: wagmiAddress } = useAccount();
  const { balance: onChainBal, refetch: refetchOnChain } = useUserBalance(wagmiAddress);
  const [liveBalance, setLiveBalance] = useState(null);
  const [successTx, setSuccessTx] = useState(null);
  const [walletBnb, setWalletBnb] = useState(0);

  useEffect(() => {
    if (!wagmiAddress) { setWalletBnb(0); return; }
    fetch('https://bsc-dataseed.binance.org/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getBalance', params: [wagmiAddress, 'latest'], id: 1 }),
    })
      .then(r => r.json())
      .then(data => { if (data.result) setWalletBnb(Number(BigInt(data.result)) / 1e18); })
      .catch(() => {});
  }, [wagmiAddress]);

  useEffect(() => {
    if (address) { fetchTxs(); fetchActiveInvestments(); }
  }, [address]);

  useEffect(() => {
    const calc = () => {
      const now = Date.now();
      const pending = activeInvestments.reduce((sum, inv) => {
        const start = new Date(inv.startDate).getTime();
        const end = new Date(inv.endDate).getTime();
        const elapsed = Math.min(now, end) - start;
        const days = elapsed / 86400000;
        const rate = (inv.dailyRateBps || 0) / 10000;
        return sum + Math.max(0, inv.amount * rate * days - (inv.claimedEarnings || 0));
      }, 0);
      setLiveAiPending(pending);
    };
    calc();
    const t = setInterval(() => { calc(); setTick(n => n + 1); }, 1000);
    return () => clearInterval(t);
  }, [activeInvestments]);

  const fetchTxs = async () => {
    try {
      const r = await getTransactions(address, '', 20);
      setTxs(r.data.data || []);
    } catch (e) {}
  };

  const fetchActiveInvestments = async () => {
    try {
      const r = await getAiInvestments(address);
      setActiveInvestments((r.data.data || []).filter(i => i.status === 'active'));
    } catch (e) {}
  };

  const showMsg = (m, err) => {
    setMsg({ text: m, err });
    setTimeout(() => setMsg(''), 3500);
  };

  const handleDeposit = async () => {
    const usd = parseFloat(depositAmt);
    if (!usd || usd <= 0) return showMsg('Enter a valid amount', true);
    if (!address) return showMsg('Wallet not connected', true);
    const bnbAmt = usd / bnbPrice;
    setLoading('deposit');
    try {
      // Auto-register on-chain if not yet registered (or if read is still loading)
      if (!onChainBal?.exists) {
        showMsg('Setting up your account on-chain...');
        try {
          const ref = new URLSearchParams(window.location.search).get('ref') || ZERO_ADDRESS;
          const regHash = await contract.register(ref);
          showMsg('Account ready! Processing deposit...');
          await waitForTx(regHash);
        } catch (regErr) {
          // "Already registered" is fine — just proceed to deposit
          const msg = regErr?.shortMessage || regErr?.message || '';
          if (!msg.toLowerCase().includes('already')) throw regErr;
        }
      }
      showMsg('Confirm in your wallet...');
      const depositHash = await contract.deposit(bnbAmt);
      showMsg('Confirming on BSC...');
      await waitForTx(depositHash);
      const fresh = await fetchOnChainBalance(wagmiAddress, CONTRACT_ADDRESS);
      if (fresh) setLiveBalance(fresh);
      const newBal = fresh?.tradingBalance ?? 0;
      setDepositAmt('');
      setShowFundsModal(false);
      setMsg('');
      setSuccessTx({
        title: 'Deposit Confirmed!',
        subtitle: 'Funds added to your trading balance',
        amount: `+$${fmtUsd(bnbAmt, bnbPrice)}`,
        hash: depositHash,
      });
      refreshBalance();
      fetchTxs();
      await refetchOnChain();
    } catch (e) {
      showMsg(e.shortMessage || e.message || 'Transaction failed', true);
    } finally {
      setLoading('');
    }
  };

  const handleWithdraw = async () => {
    const usd = parseFloat(withdrawAmt);
    if (!usd || usd <= 0) return showMsg('Enter a valid amount', true);
    const earningsUsd = aiEarnings * bnbPrice;
    if (usd > earningsUsd) return showMsg('Insufficient earnings balance', true);
    if (!address) return showMsg('Wallet not connected', true);
    const bnbAmt = usd / bnbPrice;
    setLoading('withdraw');
    try {
      showMsg('Confirm in your wallet...');
      const wHash = await contract.requestWithdrawal(bnbAmt);
      showMsg('Confirming on BSC...');
      await waitForTx(wHash);
      setWithdrawAmt('');
      setShowFundsModal(false);
      setMsg('');
      setSuccessTx({
        title: 'Withdrawal Submitted!',
        subtitle: 'BNB will arrive in your wallet shortly',
        amount: `-$${usd.toFixed(2)}`,
        hash: wHash,
      });
      const fresh = await fetchOnChainBalance(wagmiAddress, CONTRACT_ADDRESS);
      if (fresh) setLiveBalance(fresh);
      refreshBalance();
    } catch (e) {
      showMsg(e.shortMessage || e.message || 'Withdrawal failed', true);
    } finally {
      setLoading('');
    }
  };

  const handleCompound = async () => {
    setLoading('compound');
    try {
      const r = await compound({ address });
      if (!r.data.success) return showMsg(r.data.error || 'Failed to compound', true);
      showMsg('Earnings compounded to trading balance!');
      refreshBalance();
    } catch (e) {
      showMsg('Failed to compound', true);
    } finally {
      setLoading('');
    }
  };

  // Prefer live on-chain balance (updated instantly after tx) over API balance
  const bal = liveBalance || onChainBal || balance || {};
  const tradingBal = bal.tradingBalance || 0;
  const totalWithdrawn = bal.totalWithdrawn || 0;
  const aiEarnings = (bal.aiEarnings || 0) + liveAiPending;
  const referralEarnings = bal.referralEarnings || 0;
  const stakingEarnings = bal.stakingEarnings || 0;
  const totalEarnings = aiEarnings + referralEarnings + stakingEarnings;

  const displayName = user?.username || 'Trader';
  const firstInvestment = activeInvestments[0];
  const activeRate = firstInvestment?.dailyRateBps
    ? (firstInvestment.dailyRateBps / 100).toFixed(1)
    : null;

  const earningsProgress = (totalEarnings + totalWithdrawn) > 0
    ? Math.min(100, (totalEarnings / (totalEarnings + totalWithdrawn)) * 100)
    : 0;

  return (
    <div>
      <TxSuccess data={successTx} onClose={() => setSuccessTx(null)} />

      {/* Greeting */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
          {getGreeting()},&nbsp;<span style={{ color: '#fcd535' }}>{displayName}</span>
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Here's your portfolio overview</div>
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

      {/* WALLET BALANCE — hero card */}
      <div className="card" style={{ padding: '20px', marginBottom: 12, borderTop: '2px solid #fcd535' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700 }}>
            Wallet Balance
          </div>
          <IconBox color="#fcd535">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="6" width="20" height="14" rx="2" />
              <path d="M16 12h.01" strokeWidth="3" strokeLinecap="round" />
              <path d="M2 10h20" />
            </svg>
          </IconBox>
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: '#fff', letterSpacing: -1.2, lineHeight: 1 }}>
          {fmtUsd(walletBnb, bnbPrice)}&nbsp;
          <span style={{ fontSize: 16, fontWeight: 600, color: '#fcd535' }}>USDT</span>
        </div>
        <div style={{ fontSize: 13, color: '#666', marginTop: 6 }}>{walletBnb.toFixed(4)} BNB</div>
        {wagmiAddress && (
          <div style={{ fontSize: 10, color: '#444', marginTop: 8, fontFamily: 'monospace', letterSpacing: 0.3 }}>
            {wagmiAddress.slice(0, 8)}···{wagmiAddress.slice(-6)}
          </div>
        )}
      </div>

      {/* TRADING BALANCE */}
      <div className="card" style={{ padding: '20px', marginBottom: 12, borderTop: '2px solid #3b9eff' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 1.4, fontWeight: 700 }}>
              Trading Balance
            </div>
            {activeInvestments.length > 0 && (
              <span style={{
                fontSize: 10, color: '#00c076', background: 'rgba(0,192,118,0.1)',
                border: '1px solid rgba(0,192,118,0.2)', borderRadius: 4,
                padding: '1px 7px', fontWeight: 700,
              }}>
                ↗ +{activeRate}%
              </span>
            )}
          </div>
          <IconBox color="#3b9eff">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </IconBox>
        </div>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#fff', letterSpacing: -0.8, lineHeight: 1 }}>
          {fmtUsd(tradingBal, bnbPrice)}&nbsp;
          <span style={{ fontSize: 14, fontWeight: 600, color: '#3b9eff' }}>USDT</span>
        </div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 5, marginBottom: 16 }}>{fmt(tradingBal)} BNB</div>
        <button
          onClick={() => { setActiveTab('deposit'); setShowFundsModal(true); }}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 8, fontSize: 11, fontWeight: 800,
            background: 'rgba(59,158,255,0.07)', border: '1px solid rgba(59,158,255,0.2)',
            color: '#3b9eff', cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Add Funds
        </button>
        <button
          onClick={() => { setActiveTab('withdraw'); setShowFundsModal(true); }}
          style={{
            width: '100%', padding: '11px 0', borderRadius: 8, fontSize: 11, fontWeight: 800,
            background: 'rgba(0,192,118,0.07)', border: '1px solid rgba(0,192,118,0.2)',
            color: '#00c076', cursor: 'pointer', letterSpacing: 2, textTransform: 'uppercase',
          }}
        >
          Take Profit
        </button>
      </div>

      {/* EARNINGS + WITHDRAWN */}
      <div className="card" style={{
        padding: '18px 20px', marginBottom: 12,
        borderTop: '2px solid #00c076', background: 'rgba(0,192,118,0.03)',
      }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
          <IconBox color="#00c076" size={44}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
          </IconBox>
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
                Earnings
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#00c076', lineHeight: 1 }}>
                {fmtUsd(totalEarnings, bnbPrice)}&nbsp;
                <span style={{ fontSize: 10, fontWeight: 600 }}>USDT</span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
                Withdrawn
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                {fmtUsd(totalWithdrawn, bnbPrice)}&nbsp;
                <span style={{ fontSize: 10, fontWeight: 600, color: '#555' }}>USDT</span>
              </div>
            </div>
          </div>
        </div>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${earningsProgress}%`,
            background: 'linear-gradient(90deg,#00c076,#fcd535)',
            borderRadius: 2, transition: 'width 0.5s',
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
          <span style={{ fontSize: 9, color: '#444' }}>{fmt(totalEarnings)} BNB</span>
          <span style={{ fontSize: 9, color: '#444' }}>{fmt(totalWithdrawn)} BNB out</span>
        </div>
      </div>

      {/* 2-col mini stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
        <div className="card" style={{ padding: '14px 16px', borderTop: '2px solid #fcd535' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <IconBox color="#fcd535" size={32}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="8" r="4" />
                <path d="M2 20c0-4 4-7 10-7s10 3 10 7" />
                <path d="M12 4V2m-4 6H6m12 0h-2" />
              </svg>
            </IconBox>
            <span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
              AI Earnings
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#fcd535', lineHeight: 1 }}>
            {fmtUsd(aiEarnings, bnbPrice)}
          </div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>USDT</div>
        </div>
        <div className="card" style={{ padding: '14px 16px', borderTop: '2px solid #a78bfa' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <IconBox color="#a78bfa" size={32}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
            </IconBox>
            <span style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 0.8, fontWeight: 700 }}>
              AI Referrals
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>
            {fmtUsd(referralEarnings, bnbPrice)}
          </div>
          <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>USDT</div>
        </div>
      </div>

      {/* Funds Modal */}
      {showFundsModal && (
        <div
          onClick={() => setShowFundsModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 300,
            background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            className="sheet-slide-up"
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 460,
              background: '#111',
              border: `1px solid rgba(255,255,255,0.07)`,
              borderTop: `2px solid ${activeTab === 'deposit' ? '#fcd535' : '#00c076'}`,
              borderRadius: 18,
              boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
              overflow: 'hidden',
            }}
          >
            {/* Modal header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 20px 0',
            }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>
                {activeTab === 'deposit' ? '↓ Add Funds' : '↑ Take Profit'}
              </div>
              <button
                onClick={() => setShowFundsModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
                  width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#888', cursor: 'pointer', fontSize: 16, lineHeight: 1,
                }}
              >✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', margin: '12px 20px 0' }}>
              {['deposit', 'withdraw'].map(tab => {
                const isActive = activeTab === tab;
                const color = tab === 'deposit' ? '#fcd535' : '#00c076';
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      flex: 1, padding: '10px 0', background: 'none', border: 'none',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                      color: isActive ? color : '#444',
                      borderBottom: isActive ? `2px solid ${color}` : '2px solid transparent',
                      letterSpacing: 0.5,
                    }}
                  >
                    {tab === 'deposit' ? '↓ Add Funds' : '↑ Take Profit'}
                  </button>
                );
              })}
            </div>

            {activeTab === 'deposit' && (
              <div style={{ padding: '16px 20px 32px' }}>
                {/* Balance row + MAX */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: '#555' }}>
                    Wallet:{' '}
                    <span style={{ color: '#fcd535', fontWeight: 700 }}>{walletBnb.toFixed(4)} BNB</span>
                    <span style={{ color: '#444', marginLeft: 6 }}>(${(walletBnb * bnbPrice).toFixed(2)})</span>
                  </span>
                  <button
                    onClick={() => setDepositAmt(((walletBnb * bnbPrice) * 0.99).toFixed(2))}
                    style={{
                      fontSize: 10, fontWeight: 800, color: '#fcd535',
                      background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.2)',
                      borderRadius: 5, padding: '3px 8px', cursor: 'pointer', letterSpacing: 0.5,
                    }}
                  >MAX</button>
                </div>

                {/* Quick amounts */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {[1, 25, 100, 500].map(v => (
                    <button
                      key={v}
                      onClick={() => setDepositAmt(String(v))}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: depositAmt === String(v) ? 'rgba(252,213,53,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${depositAmt === String(v) ? 'rgba(252,213,53,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        color: depositAmt === String(v) ? '#fcd535' : '#555',
                        cursor: 'pointer',
                      }}
                    >
                      ${v}
                    </button>
                  ))}
                </div>

                {/* Input */}
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 14, fontWeight: 700, color: '#555', pointerEvents: 'none',
                  }}>$</span>
                  <input
                    type="number" placeholder="1" value={depositAmt}
                    onChange={e => setDepositAmt(e.target.value)}
                    style={{
                      width: '100%', background: '#0d0d0d',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 10, padding: '11px 14px 11px 26px', color: '#fff', fontSize: 14,
                      outline: 'none', fontWeight: 700, boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* Preview */}
                {depositAmt && parseFloat(depositAmt) > 0 && (
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 12 }}>
                    ≈ <span style={{ color: '#fcd535', fontWeight: 700 }}>
                      {(parseFloat(depositAmt) / bnbPrice).toFixed(6)} BNB
                    </span>
                    <span style={{ color: '#333', marginLeft: 8 }}>→ trading balance</span>
                    {walletBnb > 0 && parseFloat(depositAmt) > walletBnb * bnbPrice && (
                      <span style={{ color: '#ff4d4d', marginLeft: 10, fontWeight: 700 }}>Exceeds wallet</span>
                    )}
                  </div>
                )}

                <button
                  className="btn-primary"
                  onClick={handleDeposit}
                  disabled={loading === 'deposit' || !depositAmt || parseFloat(depositAmt) <= 0}
                  style={{ width: '100%', borderRadius: 10, padding: '13px 0', fontSize: 13 }}
                >
                  {loading === 'deposit' ? 'Awaiting confirmation...' : `Add Funds${depositAmt ? ` $${depositAmt}` : ''}`}
                </button>
              </div>
            )}

            {activeTab === 'withdraw' && (
              <div style={{ padding: '16px 20px 32px' }}>
                {/* Earnings + MAX */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 11, color: '#555' }}>
                    Earnings:{' '}
                    <span style={{ color: '#00c076', fontWeight: 700 }}>${fmtUsd(aiEarnings, bnbPrice)}</span>
                    <span style={{ color: '#444', marginLeft: 6 }}>({fmt(aiEarnings)} BNB)</span>
                  </span>
                  <button
                    onClick={() => setWithdrawAmt((aiEarnings * bnbPrice).toFixed(2))}
                    style={{
                      fontSize: 10, fontWeight: 800, color: '#00c076', background: 'rgba(0,192,118,0.08)',
                      border: '1px solid rgba(0,192,118,0.2)', borderRadius: 5, padding: '3px 8px',
                      cursor: 'pointer', letterSpacing: 0.5,
                    }}
                  >
                    MAX
                  </button>
                </div>

                {/* Quick amounts */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                  {[1, 10, 25, 50].map(v => (
                    <button
                      key={v}
                      onClick={() => setWithdrawAmt(String(v))}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                        background: withdrawAmt === String(v) ? 'rgba(0,192,118,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${withdrawAmt === String(v) ? 'rgba(0,192,118,0.3)' : 'rgba(255,255,255,0.06)'}`,
                        color: withdrawAmt === String(v) ? '#00c076' : '#555',
                        cursor: 'pointer',
                      }}
                    >
                      ${v}
                    </button>
                  ))}
                </div>

                {/* USD input */}
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 14, fontWeight: 700, color: '#555', pointerEvents: 'none',
                  }}>$</span>
                  <input
                    type="number" placeholder="0" value={withdrawAmt}
                    onChange={e => setWithdrawAmt(e.target.value)}
                    style={{
                      width: '100%', background: '#0d0d0d',
                      border: `1px solid ${withdrawAmt && parseFloat(withdrawAmt) > aiEarnings * bnbPrice ? 'rgba(255,77,77,0.4)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 10, padding: '11px 14px 11px 26px', color: '#fff', fontSize: 14,
                      outline: 'none', fontWeight: 700, boxSizing: 'border-box',
                    }}
                  />
                </div>

                {/* BNB equivalent preview */}
                {withdrawAmt && parseFloat(withdrawAmt) > 0 && (
                  <div style={{ fontSize: 11, color: '#555', marginBottom: 12 }}>
                    ≈ <span style={{ color: '#00c076', fontWeight: 700 }}>
                      {(parseFloat(withdrawAmt) / bnbPrice).toFixed(6)} BNB
                    </span>
                    <span style={{ color: '#333', marginLeft: 8 }}>→ your wallet</span>
                  </div>
                )}

                <button
                  className="btn-primary" onClick={handleWithdraw}
                  disabled={loading === 'withdraw' || !withdrawAmt || parseFloat(withdrawAmt) <= 0}
                  style={{ width: '100%', borderRadius: 10, padding: '12px 0', fontSize: 13, marginBottom: 10 }}
                >
                  {loading === 'withdraw' ? (loading === 'withdraw' ? 'Confirming...' : 'Processing...') : `Take Profit${withdrawAmt ? ` $${withdrawAmt}` : ''}`}
                </button>

                <button
                  onClick={handleCompound} disabled={loading === 'compound'}
                  style={{
                    width: '100%', padding: '11px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                    background: 'rgba(252,213,53,0.07)', border: '1px solid rgba(252,213,53,0.2)',
                    color: '#fcd535', cursor: 'pointer',
                  }}
                >
                  {loading === 'compound' ? '...' : '↻ Compound All Earnings'}
                </button>
              </div>
            )}
            {/* Drag handle */}
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 12px' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
            </div>
          </div>
        </div>
      )}

      {/* Active Deployments */}
      {activeInvestments.length > 0 && (
        <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>
              Active Deployments
            </span>
            <span style={{
              fontSize: 10, color: '#fcd535', background: 'rgba(252,213,53,0.1)',
              border: '1px solid rgba(252,213,53,0.2)', borderRadius: 10, padding: '1px 7px', fontWeight: 700,
            }}>
              {activeInvestments.length}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#00c076', fontWeight: 800 }}>
              +{liveAiPending.toFixed(6)} BNB
            </span>
          </div>
          {activeInvestments.map(inv => {
            const now = Date.now();
            const start = new Date(inv.startDate).getTime();
            const end = new Date(inv.endDate).getTime();
            const elapsed = Math.min(now, end) - start;
            const days = elapsed / 86400000;
            const rate = (inv.dailyRateBps || 0) / 10000;
            const pending = Math.max(0, inv.amount * rate * days - (inv.claimedEarnings || 0));
            const progress = Math.min(100, ((now - start) / (end - start)) * 100);
            return (
              <div key={inv._id} style={{
                display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center',
                padding: '10px 12px', borderRadius: 10, marginBottom: 8,
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#fcd535' }}>{inv.packageName}</span>
                    <span style={{ fontSize: 10, color: '#555' }}>{fmt(inv.amount)} BNB</span>
                  </div>
                  <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                    <div style={{
                      height: '100%', width: `${progress}%`,
                      background: 'linear-gradient(90deg,#fcd535,#ff8c00)',
                      borderRadius: 2, transition: 'width 1s linear',
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#00c076' }}>+{pending.toFixed(6)}</div>
                  <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#555', marginTop: 3 }}>
                    {cdFull(inv.endDate)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Our Products */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>
          Our Products
        </div>
        <div className="grid-2" style={{ marginBottom: 0 }}>
          {[
            {
              label: 'AI Agents',
              path: '/ai-agents',
              color: '#fcd535',
              desc: 'Automated AI trading up to 2%/day',
              stat: `+${fmt(aiEarnings)} BNB`,
              statLabel: 'earned',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="8" r="4"/><path d="M2 20c0-4 4-7 10-7s10 3 10 7"/>
                  <path d="M12 4V2m-4 6H6m12 0h-2"/>
                </svg>
              ),
            },
            {
              label: 'Copy Trading',
              path: '/copy-trading',
              color: '#818cf8',
              desc: 'Mirror top traders automatically',
              stat: null,
              statLabel: 'active',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2"/>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                </svg>
              ),
            },
            {
              label: 'Staking',
              path: '/staking',
              color: '#00c076',
              desc: 'Lock BNB · earn up to 2.8%/day',
              stat: `+${fmt(stakingEarnings)} BNB`,
              statLabel: 'earned',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              ),
            },
            {
              label: 'Manual Trading',
              path: '/trading',
              color: '#3b9eff',
              desc: 'Long / short with up to 100x leverage',
              stat: null,
              statLabel: 'positions',
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
                  <polyline points="16 7 22 7 22 13"/>
                </svg>
              ),
            },
          ].map(({ label, path, color, desc, stat, statLabel, icon }) => (
            <div
              key={path}
              onClick={() => navigate(path)}
              className="card"
              style={{
                padding: '16px', cursor: 'pointer', transition: 'all 0.18s',
                borderTop: `2px solid ${color}`,
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 8px 28px ${color}18`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: `${color}15`, border: `1px solid ${color}25`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color,
                }}>
                  {icon}
                </div>
                <div style={{ textAlign: 'right' }}>
                  {stat && <div style={{ fontSize: 12, fontWeight: 800, color }}>{stat}</div>}
                  <div style={{ fontSize: 9, color: '#444', textTransform: 'uppercase', letterSpacing: 0.8 }}>{statLabel}</div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 10, color: '#555', lineHeight: 1.5 }}>{desc}</div>
              <div style={{
                position: 'absolute', right: 14, bottom: 14,
                fontSize: 11, color, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3,
              }}>
                Open <span style={{ fontSize: 13 }}>→</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transactions */}
      <div className="card" style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Recent Transactions
        </div>
        {txs.length === 0 ? (
          <div style={{ color: '#444', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>No transactions yet</div>
        ) : txs.slice(0, 15).map((tx, i) => {
          const color = TX_COLORS[tx.type] || TX_COLORS.default;
          const label = TX_LABELS[tx.type] || tx.type;
          const isDebit = ['withdrawal', 'fee', 'ai_investment', 'loan_repay'].includes(tx.type);
          return (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '9px 10px', marginBottom: 4, borderRadius: 8,
              background: 'rgba(255,255,255,0.015)', borderLeft: `3px solid ${color}`,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ccc' }}>{label}</div>
                <div style={{ fontSize: 10, color: '#444', marginTop: 1 }}>
                  {new Date(tx.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  {tx.status && tx.status !== 'completed' && (
                    <span style={{
                      marginLeft: 6, fontSize: 9, padding: '1px 5px', borderRadius: 3,
                      background: tx.status === 'pending' ? 'rgba(252,213,53,0.1)' : 'rgba(0,192,118,0.1)',
                      color: tx.status === 'pending' ? '#fcd535' : '#00c076',
                      fontWeight: 700, textTransform: 'uppercase',
                    }}>
                      {tx.status}
                    </span>
                  )}
                </div>
              </div>
              <div style={{ fontWeight: 800, fontSize: 13, color: isDebit ? '#ff4d4d' : '#00c076' }}>
                {isDebit ? '−' : '+'}{fmt(tx.amount)} BNB
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
