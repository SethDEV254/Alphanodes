import { useEffect, useRef, useState } from 'react';
import { useApp } from '../App.jsx';
import { getAiInvestments, compoundAiInvestment } from '../api.js';

const fmtUsd = (n) => n >= 1000 ? `$${(n / 1000).toFixed(0)}K` : `$${n}`;
import { useAlphaNodes } from '../hooks/useContract.js';
import NeuralNetwork from '../components/NeuralNetwork.jsx';

const fmt = (n) => (n || 0).toFixed(4);
const ICONS = { 'alpha-x': '◈', core: '◎', max: '⬡' };

const PACKAGES = [
  { _id: 'alpha-x', contractId: 0, name: 'Alpha X', dailyRate: 1.0, minUsd: 0,    maxUsd: 99,   duration: 30 },
  { _id: 'core',    contractId: 1, name: 'Core',    dailyRate: 1.5, minUsd: 100,  maxUsd: 999,  duration: 60 },
  { _id: 'max',     contractId: 2, name: 'Max',     dailyRate: 2.0, minUsd: 1000, maxUsd: null, duration: 90 },
];

const COINS = [
  { symbol: 'BNB',  label: 'BNB Chain',   color: '#fcd535' },
  { symbol: 'BTC',  label: 'Bitcoin',     color: '#f7931a' },
  { symbol: 'ETH',  label: 'Ethereum',    color: '#818cf8' },
  { symbol: 'SOL',  label: 'Solana',      color: '#00ffa3' },
  { symbol: 'XRP',  label: 'XRP',         color: '#00aff0' },
  { symbol: 'ADA',  label: 'Cardano',     color: '#0033ad' },
  { symbol: 'DOGE', label: 'Dogecoin',    color: '#c3a634' },
  { symbol: 'AVAX', label: 'Avalanche',   color: '#e84142' },
  { symbol: 'DOT',  label: 'Polkadot',    color: '#e6007a' },
  { symbol: 'MATIC',label: 'Polygon',     color: '#8247e5' },
  { symbol: 'LINK', label: 'Chainlink',   color: '#2a5ada' },
  { symbol: 'UNI',  label: 'Uniswap',     color: '#ff007a' },
  { symbol: 'LTC',  label: 'Litecoin',    color: '#a0a0a0' },
  { symbol: 'ATOM', label: 'Cosmos',      color: '#6f7390' },
  { symbol: 'FTM',  label: 'Fantom',      color: '#1969ff' },
  { symbol: 'NEAR', label: 'NEAR Protocol', color: '#00c08b' },
  { symbol: 'OP',   label: 'Optimism',    color: '#ff0420' },
  { symbol: 'ARB',  label: 'Arbitrum',    color: '#28a0f0' },
  { symbol: 'SUI',  label: 'Sui',         color: '#4da2ff' },
  { symbol: 'TRX',  label: 'TRON',        color: '#ff0013' },
];

function countdown(endDate) {
  const diff = Math.max(0, new Date(endDate).getTime() - Date.now());
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return `${d}d ${h}h ${m}m ${s}s`;
}

function CoinDropdown({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filtered = search
    ? COINS.filter(c =>
        c.symbol.toLowerCase().includes(search.toLowerCase()) ||
        c.label.toLowerCase().includes(search.toLowerCase())
      )
    : COINS;

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1, minWidth: 160 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          background: open ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? value.color + '60' : 'rgba(255,255,255,0.08)'}`,
          borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
          transition: 'all 0.15s', outline: 'none',
        }}
      >
        <span style={{
          width: 10, height: 10, borderRadius: '50%',
          background: value.color, flexShrink: 0,
          boxShadow: `0 0 6px ${value.color}80`,
        }} />
        <span style={{ fontWeight: 800, fontSize: 13, color: value.color, letterSpacing: 0.5 }}>
          {value.symbol}
        </span>
        <span style={{ fontSize: 11, color: '#555', flex: 1, textAlign: 'left' }}>
          {value.label}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}
        >
          <path d="M2 3.5L5 6.5L8 3.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: '#0f0f12', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search coin or symbol..."
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 7,
                padding: '7px 10px', color: '#fff', fontSize: 11, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {/* List */}
          <div style={{ maxHeight: 240, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '14px', fontSize: 11, color: '#555', textAlign: 'center' }}>No results</div>
            ) : filtered.map(coin => {
              const isSel = value.symbol === coin.symbol;
              return (
                <div
                  key={coin.symbol}
                  onClick={() => { onChange(coin); setOpen(false); setSearch(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', cursor: 'pointer',
                    background: isSel ? `${coin.color}10` : 'transparent',
                    borderLeft: `2px solid ${isSel ? coin.color : 'transparent'}`,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{
                    width: 7, height: 7, borderRadius: '50%',
                    background: coin.color, flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: isSel ? coin.color : '#ccc', minWidth: 40 }}>
                    {coin.symbol}
                  </span>
                  <span style={{ fontSize: 11, color: '#555' }}>{coin.label}</span>
                  {isSel && (
                    <span style={{ marginLeft: 'auto', fontSize: 9, color: coin.color, fontWeight: 700 }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AIAgents() {
  const { address, balance, refreshBalance, bnbPrice } = useApp();
  const contract = useAlphaNodes();
  const [investments, setInvestments] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedCoin, setSelectedCoin] = useState(COINS[0]);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');
  const [tick, setTick] = useState(0);
  const [showDeployModal, setShowDeployModal] = useState(false);

  useEffect(() => { if (address) fetchInvestments(); }, [address]);

  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchInvestments = async () => {
    try {
      const r = await getAiInvestments(address);
      setInvestments(r.data.data || []);
    } catch (e) {}
  };

  const showMsg = (text, err) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(''), 3500);
  };

  const handleDeploy = async () => {
    if (!selected) return showMsg('Select a package', true);
    const usd = parseFloat(amount);
    if (!usd || usd <= 0) return showMsg('Enter a valid amount', true);
    if (usd < selected.minUsd)
      return showMsg(`Min for ${selected.name} is $${selected.minUsd}`, true);
    if (selected.maxUsd !== null && usd > selected.maxUsd)
      return showMsg(`Max for ${selected.name} is $${selected.maxUsd}`, true);
    const bnbAmt = usd / bnbPrice;
    if (bnbAmt > (balance?.tradingBalance || 0))
      return showMsg('Insufficient trading balance', true);
    setLoading('deploy');
    try {
      await contract.investBalance(selected.contractId, bnbAmt);
      showMsg(`${selected.name} deployed on ${selectedCoin.symbol}!`);
      setAmount('');
      setShowDeployModal(false);
      fetchInvestments();
      refreshBalance();
    } catch (e) {
      showMsg(e.shortMessage || e.message || 'Deploy failed', true);
    } finally {
      setLoading('');
    }
  };

  const handleClaim = async (inv) => {
    const contractId = inv.contractId ?? inv._id;
    setLoading(inv._id);
    try {
      await contract.claimAIEarnings(contractId);
      showMsg('Profit taken!');
      fetchInvestments();
      refreshBalance();
    } catch (e) {
      showMsg(e.shortMessage || e.message || 'Claim failed', true);
    } finally {
      setLoading('');
    }
  };

  const handleCompound = async (id) => {
    setLoading(`compound-${id}`);
    try {
      const r = await compoundAiInvestment({ address, investmentId: id });
      if (!r.data.success) return showMsg(r.data.error || 'Compound failed', true);
      const { compounded, newAmount } = r.data.data;
      showMsg(`Compounded ${compounded.toFixed(6)} BNB → new principal: ${newAmount.toFixed(4)} BNB`);
      fetchInvestments();
      refreshBalance();
    } catch (e) {
      showMsg('Compound failed', true);
    } finally {
      setLoading('');
    }
  };

  const active = investments.filter(i => i.status === 'active');
  const completed = investments.filter(i => i.status !== 'active');
  const tradingBal = balance?.tradingBalance || 0;
  const tradingUsd = (tradingBal * bnbPrice).toFixed(2);
  const usdAmt = parseFloat(amount) || 0;
  const bnbEquiv = usdAmt > 0 ? (usdAmt / bnbPrice).toFixed(6) : null;
  const dailyEst = selected && usdAmt ? (usdAmt * selected.dailyRate / 100).toFixed(2) : null;
  const totalEst = selected && usdAmt ? (usdAmt * selected.dailyRate / 100 * selected.duration).toFixed(2) : null;

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>AI Agents</h2>
        <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>Select a package, pick a trading pair, and deploy your AI</div>
      </div>

      {msg && (
        <div style={{
          padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 12,
          background: msg.err ? 'rgba(255,77,77,0.1)' : 'rgba(0,192,118,0.1)',
          border: `1px solid ${msg.err ? 'rgba(255,77,77,0.2)' : 'rgba(0,192,118,0.2)'}`,
          color: msg.err ? '#ff4d4d' : '#00c076',
        }}>{msg.text}</div>
      )}

      {/* Packages */}
      <div className="grid-3" style={{ marginBottom: 12 }}>
        {PACKAGES.map(pkg => {
          const isSel = selected?._id === pkg._id;
          return (
            <div
              key={pkg._id}
              onClick={() => { setSelected(pkg); setAmount(''); setShowDeployModal(true); }}
              className="card"
              style={{
                padding: '12px 14px', cursor: 'pointer', transition: 'all 0.18s',
                border: isSel ? '1.5px solid #fcd535' : '1px solid rgba(252,213,53,0.08)',
                background: isSel ? 'rgba(252,213,53,0.07)' : undefined,
                boxShadow: isSel ? '0 0 20px rgba(252,213,53,0.1)' : undefined,
                position: 'relative', overflow: 'hidden',
              }}
            >
              {isSel && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, #fcd535, #ff8c00)' }} />}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: isSel ? '#fcd535' : '#fff' }}>
                  {ICONS[pkg._id]} {pkg.name}
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#00c076' }}>
                  {pkg.dailyRate}%<span style={{ fontSize: 10, fontWeight: 400, color: '#555' }}>/day</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#555', marginBottom: 8 }}>
                <span style={{ color: '#fcd535', fontWeight: 600 }}>
                  {fmtUsd(pkg.minUsd)}–{pkg.maxUsd !== null ? fmtUsd(pkg.maxUsd) : 'Max'}
                </span>
                <span>·</span>
                <span>{pkg.duration}d</span>
                <span>·</span>
                <span style={{ color: '#00c076', fontWeight: 700 }}>{(pkg.dailyRate * pkg.duration).toFixed(0)}% total</span>
              </div>
              <div style={{
                fontSize: 10, fontWeight: 700, color: isSel ? '#fcd535' : '#333',
                textTransform: 'uppercase', letterSpacing: 1,
                display: 'flex', alignItems: 'center', gap: 4,
              }}>
                Tap to Deploy <span style={{ fontSize: 12 }}>→</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Deploy Modal */}
      {showDeployModal && selected && (
        <div
          onClick={() => setShowDeployModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 420,
              background: '#111', borderRadius: 20,
              border: '1px solid rgba(252,213,53,0.12)',
              borderTop: '2px solid #fcd535',
              boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
              animation: 'modalPop 0.25s cubic-bezier(0.34,1.56,0.64,1) both',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '16px 18px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fcd535' }}>
                  {ICONS[selected._id]} {selected.name}
                </div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                  {selected.dailyRate}%/day · {selected.duration}d · {(selected.dailyRate * selected.duration).toFixed(0)}% total
                </div>
              </div>
              <button
                onClick={() => setShowDeployModal(false)}
                style={{
                  background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8,
                  width: 30, height: 30, color: '#888', cursor: 'pointer', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >✕</button>
            </div>

            <div style={{ padding: '14px 18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Available balance */}
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 10,
                background: 'rgba(59,158,255,0.06)', border: '1px solid rgba(59,158,255,0.12)',
              }}>
                <span style={{ fontSize: 11, color: '#555' }}>Available</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: '#3b9eff' }}>
                  ${tradingUsd} <span style={{ fontSize: 10, fontWeight: 400, color: '#444' }}>({fmt(tradingBal)} BNB)</span>
                </span>
              </div>

              {/* Coin picker */}
              <div>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 6, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  Trading Pair
                </div>
                <CoinDropdown value={selectedCoin} onChange={setSelectedCoin} />
              </div>

              {/* Amount input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 10, color: '#555', fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase' }}>Amount (USD)</span>
                  <span style={{ fontSize: 10, color: '#fcd535', fontWeight: 700 }}>
                    {fmtUsd(selected.minUsd)} – {selected.maxUsd !== null ? fmtUsd(selected.maxUsd) : 'No max'}
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                    fontSize: 14, fontWeight: 700, color: '#555', pointerEvents: 'none',
                  }}>$</span>
                  <input
                    autoFocus
                    type="number"
                    placeholder={`${selected.minUsd}–${selected.maxUsd ?? '∞'}`}
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    style={{
                      width: '100%', background: '#0d0d0d',
                      border: `1px solid ${amount && parseFloat(amount) > 0 ? 'rgba(252,213,53,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: 12, padding: '12px 14px 12px 28px',
                      color: '#fff', fontSize: 15, fontWeight: 700, outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                {bnbEquiv && (
                  <div style={{ fontSize: 11, color: '#555', marginTop: 5 }}>
                    ≈ <span style={{ color: '#fcd535', fontWeight: 700 }}>{bnbEquiv} BNB</span>
                  </div>
                )}
              </div>

              {/* Earnings preview */}
              {dailyEst && (
                <div style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
                }}>
                  <div style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(0,192,118,0.06)', border: '1px solid rgba(0,192,118,0.12)',
                  }}>
                    <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Daily</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#00c076' }}>+${dailyEst}</div>
                  </div>
                  <div style={{
                    padding: '10px 12px', borderRadius: 10,
                    background: 'rgba(252,213,53,0.06)', border: '1px solid rgba(252,213,53,0.12)',
                  }}>
                    <div style={{ fontSize: 9, color: '#555', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>Total ({selected.duration}d)</div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fcd535' }}>+${totalEst}</div>
                  </div>
                </div>
              )}

              {/* Deploy button */}
              <button
                className="btn-primary"
                onClick={handleDeploy}
                disabled={loading === 'deploy' || !amount || parseFloat(amount) <= 0}
                style={{ width: '100%', padding: '14px 0', fontSize: 14, borderRadius: 12, fontWeight: 800 }}
              >
                {loading === 'deploy' ? 'Deploying AI...' : `Deploy on ${selectedCoin.symbol}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active deployments */}
      <div className="card" style={{ padding: '14px 16px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: active.length ? 12 : 0 }}>Active Deployments</div>
        {active.length === 0 ? (
          <div style={{ color: '#555', fontSize: 11, marginTop: 4 }}>No active deployments yet</div>
        ) : active.map(inv => {
          const now = Date.now();
          const start = new Date(inv.startDate).getTime();
          const end = new Date(inv.endDate).getTime();
          const elapsed = Math.min(now, end) - start;
          const days = elapsed / 86400000;
          const rate = (inv.dailyRateBps || 0) / 10000;
          const pending = Math.max(0, inv.amount * rate * days - (inv.claimedEarnings || 0));
          const progress = Math.min(100, ((now - start) / (end - start)) * 100);
          const coinInfo = COINS.find(c => c.symbol === inv.coin) || COINS[0];
          const isCompounding = loading === `compound-${inv._id}`;
          const isClaiming = loading === inv._id;
          return (
            <div key={inv._id} style={{
              padding: '12px 14px', marginBottom: 8, borderRadius: 12,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
            }}>
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 700, color: '#fcd535', fontSize: 13 }}>{inv.packageName}</span>
                    <span style={{
                      fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                      background: `${coinInfo.color}15`, border: `1px solid ${coinInfo.color}35`,
                      color: coinInfo.color,
                    }}>
                      {coinInfo.symbol}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: '#555' }}>
                    {fmt(inv.amount)} BNB · {inv.dailyRateBps ? inv.dailyRateBps / 100 : 0}%/day
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#00c076', fontWeight: 800, fontSize: 14 }}>+{pending.toFixed(6)}</div>
                  <div style={{ fontSize: 10, color: '#555' }}>BNB accrued</div>
                </div>
              </div>

              {/* Progress + countdown */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 10, color: '#444' }}>{progress.toFixed(1)}% complete</span>
                  <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#666', fontWeight: 700 }}>
                    {countdown(inv.endDate)}
                  </span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%', width: `${progress}%`,
                    background: 'linear-gradient(90deg,#fcd535,#ff8c00)', borderRadius: 2,
                    transition: 'width 1s linear',
                  }} />
                </div>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {/* Compound */}
                <button
                  onClick={() => handleCompound(inv._id)}
                  disabled={isCompounding || pending <= 0}
                  style={{
                    flex: 1, fontSize: 11, padding: '8px 0', borderRadius: 8, fontWeight: 700,
                    background: pending > 0 ? 'rgba(252,213,53,0.1)' : 'rgba(255,255,255,0.03)',
                    color: pending > 0 ? '#fcd535' : '#333',
                    border: `1px solid ${pending > 0 ? 'rgba(252,213,53,0.25)' : 'rgba(255,255,255,0.05)'}`,
                    cursor: pending > 0 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s',
                  }}
                >
                  {isCompounding ? 'Compounding...' : '↻ Compound'}
                </button>

                {/* Take Profit */}
                <button
                  onClick={() => handleClaim(inv)}
                  disabled={isClaiming || pending <= 0}
                  style={{
                    flex: 1, fontSize: 11, padding: '8px 0', borderRadius: 8, fontWeight: 700,
                    background: pending > 0 ? 'linear-gradient(135deg,#00c076,#00a060)' : 'rgba(255,255,255,0.03)',
                    color: pending > 0 ? '#fff' : '#333',
                    border: 'none',
                    cursor: pending > 0 ? 'pointer' : 'not-allowed',
                    transition: 'all 0.15s',
                  }}
                >
                  {isClaiming ? 'Taking...' : '↑ Take Profit'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Completed */}
      {completed.length > 0 && (
        <div className="card" style={{ padding: '12px 16px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Completed Deployments</div>
          {completed.map(inv => {
            const coinInfo = COINS.find(c => c.symbol === inv.coin) || COINS[0];
            return (
              <div key={inv._id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#555' }}>{inv.packageName}</span>
                  <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: `${coinInfo.color}15`, color: coinInfo.color }}>
                    {coinInfo.symbol}
                  </span>
                  <span style={{ color: '#333' }}>{fmt(inv.amount)} BNB</span>
                </div>
                <span style={{ color: '#00c076', fontWeight: 700 }}>+{fmt(inv.claimedEarnings)} BNB earned</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Neural Engine */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700 }}>Neural Engine</div>
          <div style={{ fontSize: 10, color: '#555' }}>Live deep-learning signal propagation</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', background: '#00c076', boxShadow: '0 0 8px #00c076', animation: 'pulse-dot 2s ease-in-out infinite' }} />
          <span style={{ fontSize: 10, color: '#00c076', fontWeight: 700, letterSpacing: 1.5 }}>ACTIVE</span>
        </div>
      </div>

      <div style={{ borderRadius: 14, border: '1px solid rgba(252,213,53,0.15)', overflow: 'hidden', background: 'rgba(4,6,10,0.95)', boxShadow: '0 0 40px rgba(252,213,53,0.05)' }}>
        <div style={{ position: 'relative' }}>
          <NeuralNetwork height={300} />
          <div style={{ position: 'absolute', top: 14, left: 0, right: 0, display: 'flex', justifyContent: 'space-around', padding: '0 9%', pointerEvents: 'none' }}>
            {['INPUT LAYER', 'HIDDEN LAYER 1', 'HIDDEN LAYER 2', 'OUTPUT LAYER'].map(l => (
              <div key={l} style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.8, color: 'rgba(252,213,53,0.4)', textAlign: 'center' }}>{l}</div>
            ))}
          </div>
          <div style={{ position: 'absolute', top: 14, right: 20, background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.18)', borderRadius: 6, padding: '4px 10px', fontSize: 9, fontWeight: 700, letterSpacing: 2, color: 'rgba(252,213,53,0.7)' }}>
            PROCESSING ···
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', borderTop: '1px solid rgba(252,213,53,0.08)' }}>
          {[
            { label: 'Trades / Min', value: '247' },
            { label: 'Accuracy', value: '98.7%' },
            { label: 'Strategies', value: '12' },
            { label: 'Win Rate', value: '91.2%' },
            { label: 'Avg Return', value: '14.8%' },
          ].map(({ label, value }, i, arr) => (
            <div key={label} style={{ padding: '10px 0', textAlign: 'center', borderRight: i < arr.length - 1 ? '1px solid rgba(252,213,53,0.06)' : 'none' }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#fcd535' }}>{value}</div>
              <div style={{ fontSize: 9, color: '#444', marginTop: 3, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
