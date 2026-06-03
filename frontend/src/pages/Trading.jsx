import { useEffect, useRef, useState } from 'react';
import { useApp } from '../App.jsx';
import { getTrades, openTrade, closeTrade } from '../api.js';
import TradingChart from '../components/TradingChart.jsx';

const fmt = (n) => (n || 0).toFixed(4);

const ASSETS = [
  { pair: 'BNB/USDT',   symbol: 'BINANCE:BNBUSDT',   id: 'binancecoin',   color: '#fcd535' },
  { pair: 'BTC/USDT',   symbol: 'BINANCE:BTCUSDT',    id: 'bitcoin',       color: '#f7931a' },
  { pair: 'ETH/USDT',   symbol: 'BINANCE:ETHUSDT',    id: 'ethereum',      color: '#818cf8' },
  { pair: 'SOL/USDT',   symbol: 'BINANCE:SOLUSDT',    id: 'solana',        color: '#00ffa3' },
  { pair: 'XRP/USDT',   symbol: 'BINANCE:XRPUSDT',    id: 'ripple',        color: '#00aff0' },
  { pair: 'DOGE/USDT',  symbol: 'BINANCE:DOGEUSDT',   id: 'dogecoin',      color: '#c3a634' },
  { pair: 'ADA/USDT',   symbol: 'BINANCE:ADAUSDT',    id: 'cardano',       color: '#0033ad' },
  { pair: 'AVAX/USDT',  symbol: 'BINANCE:AVAXUSDT',   id: 'avalanche-2',   color: '#e84142' },
  { pair: 'DOT/USDT',   symbol: 'BINANCE:DOTUSDT',    id: 'polkadot',      color: '#e6007a' },
  { pair: 'MATIC/USDT', symbol: 'BINANCE:MATICUSDT',  id: 'matic-network', color: '#8247e5' },
  { pair: 'LINK/USDT',  symbol: 'BINANCE:LINKUSDT',   id: 'chainlink',     color: '#2a5ada' },
  { pair: 'UNI/USDT',   symbol: 'BINANCE:UNIUSDT',    id: 'uniswap',       color: '#ff007a' },
  { pair: 'LTC/USDT',   symbol: 'BINANCE:LTCUSDT',    id: 'litecoin',      color: '#a0a0a0' },
  { pair: 'ATOM/USDT',  symbol: 'BINANCE:ATOMUSDT',   id: 'cosmos',        color: '#6f7390' },
  { pair: 'NEAR/USDT',  symbol: 'BINANCE:NEARUSDT',   id: 'near',          color: '#00c08b' },
  { pair: 'OP/USDT',    symbol: 'BINANCE:OPUSDT',     id: 'optimism',      color: '#ff0420' },
  { pair: 'ARB/USDT',   symbol: 'BINANCE:ARBUSDT',    id: 'arbitrum',      color: '#28a0f0' },
  { pair: 'SUI/USDT',   symbol: 'BINANCE:SUIUSDT',    id: 'sui',           color: '#4da2ff' },
  { pair: 'TRX/USDT',   symbol: 'BINANCE:TRXUSDT',    id: 'tron',          color: '#ff0013' },
  { pair: 'FTM/USDT',   symbol: 'BINANCE:FTMUSDT',    id: 'fantom',        color: '#1969ff' },
  { pair: 'INJ/USDT',   symbol: 'BINANCE:INJUSDT',    id: 'injective-protocol', color: '#00b4d8' },
  { pair: 'APT/USDT',   symbol: 'BINANCE:APTUSDT',    id: 'aptos',         color: '#00c9a7' },
  { pair: 'WLD/USDT',   symbol: 'BINANCE:WLDUSDT',    id: 'worldcoin-wld', color: '#a8edea' },
  { pair: 'PEPE/USDT',  symbol: 'BINANCE:PEPEUSDT',   id: 'pepe',          color: '#4caf50' },
  { pair: 'SHIB/USDT',  symbol: 'BINANCE:SHIBUSDT',   id: 'shiba-inu',     color: '#ff9800' },
];

function PairDropdown({ value, onChange, prices }) {
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
    ? ASSETS.filter(a =>
        a.pair.toLowerCase().includes(search.toLowerCase())
      )
    : ASSETS;

  const p = prices[value.id];
  const change = p?.usd_24h_change;

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 14 }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          background: open ? 'rgba(0,192,118,0.06)' : 'rgba(255,255,255,0.03)',
          border: `1px solid ${open ? 'rgba(0,192,118,0.4)' : 'rgba(255,255,255,0.08)'}`,
          borderTop: `2px solid ${value.color}`,
          borderRadius: 12, padding: '12px 16px', cursor: 'pointer',
          transition: 'all 0.15s', outline: 'none',
        }}
      >
        <span style={{
          width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
          background: value.color, boxShadow: `0 0 8px ${value.color}80`,
        }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', flex: 1, textAlign: 'left' }}>
          {value.pair}
        </span>
        {p?.usd && (
          <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>
            ${p.usd.toLocaleString(undefined, { maximumFractionDigits: p.usd < 1 ? 6 : 2 })}
          </span>
        )}
        {change !== undefined && (
          <span style={{
            fontSize: 11, fontWeight: 700, minWidth: 52, textAlign: 'right',
            color: change >= 0 ? '#00c076' : '#ff4d4d',
          }}>
            {change >= 0 ? '+' : ''}{change.toFixed(2)}%
          </span>
        )}
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}
        >
          <path d="M2 4.5L6 8.5L10 4.5" stroke="#555" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 200,
          background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.7)',
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search pair…"
              style={{
                width: '100%', background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8,
                padding: '7px 12px', color: '#fff', fontSize: 12, outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          {/* List */}
          <div style={{ maxHeight: 280, overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: 14, fontSize: 12, color: '#555', textAlign: 'center' }}>No results</div>
            ) : filtered.map(a => {
              const ap = prices[a.id];
              const ac = ap?.usd_24h_change;
              const isSel = value.pair === a.pair;
              return (
                <div
                  key={a.pair}
                  onClick={() => { onChange(a); setOpen(false); setSearch(''); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px', cursor: 'pointer',
                    background: isSel ? `${a.color}10` : 'transparent',
                    borderLeft: `2px solid ${isSel ? a.color : 'transparent'}`,
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; }}
                  onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: isSel ? a.color : '#ccc', minWidth: 90 }}>
                    {a.pair}
                  </span>
                  <span style={{ flex: 1, fontSize: 12, color: '#fff', fontWeight: 600 }}>
                    {ap?.usd ? `$${ap.usd.toLocaleString(undefined, { maximumFractionDigits: ap.usd < 1 ? 6 : 2 })}` : '—'}
                  </span>
                  {ac !== undefined && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: ac >= 0 ? '#00c076' : '#ff4d4d' }}>
                      {ac >= 0 ? '+' : ''}{ac.toFixed(2)}%
                    </span>
                  )}
                  {isSel && <span style={{ fontSize: 10, color: a.color, fontWeight: 700 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function IconBox({ color, size = 38, children }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: `${color}18`, border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
    }}>{children}</div>
  );
}

export default function Trading() {
  const { address, balance, refreshBalance } = useApp();
  const [trades, setTrades] = useState([]);
  const [selectedAsset, setSelectedAsset] = useState(ASSETS[0]);
  const [direction, setDirection] = useState('long');
  const [amount, setAmount] = useState('');
  const [leverage, setLeverage] = useState('10');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');
  const [prices, setPrices] = useState({});

  useEffect(() => {
    if (address) fetchTrades();
    fetchPrices();
    const t = setInterval(fetchPrices, 15000);
    return () => clearInterval(t);
  }, [address]);

  const fetchTrades = async () => {
    try {
      const r = await getTrades(address);
      setTrades(r.data.data || []);
    } catch (e) {}
  };

  const fetchPrices = async () => {
    try {
      const ids = ASSETS.map(a => a.id).join(',');
      const r = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
      );
      const json = await r.json();
      setPrices(json);
    } catch (e) {}
  };

  const showMsg = (text, err) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(''), 3500);
  };

  const handleOpen = async () => {
    const amt = parseFloat(amount);
    const lev = parseInt(leverage);
    if (!amt || amt <= 0) return showMsg('Enter amount', true);
    if (lev < 1 || lev > 100) return showMsg('Leverage must be 1-100x', true);
    if (amt > (balance?.tradingBalance || 0)) return showMsg('Insufficient balance', true);
    setLoading('open');
    try {
      const r = await openTrade({ address, asset: selectedAsset.pair, direction, amount: amt, leverage: lev });
      if (!r.data.success) return showMsg(r.data.error || 'Failed to open trade', true);
      showMsg(`${direction.toUpperCase()} trade opened!`);
      setAmount('');
      fetchTrades();
      refreshBalance();
    } catch (e) {
      showMsg('Failed to open trade', true);
    } finally {
      setLoading('');
    }
  };

  const handleClose = async (id) => {
    setLoading(id);
    try {
      const r = await closeTrade(id, { address });
      if (!r.data.success) return showMsg(r.data.error || 'Failed to close', true);
      showMsg('Trade closed!');
      fetchTrades();
      refreshBalance();
    } catch (e) {
      showMsg('Failed to close trade', true);
    } finally {
      setLoading('');
    }
  };

  const open = trades.filter(t => t.status === 'open');
  const closed = trades.filter(t => t.status !== 'open');
  const positionSize = ((parseFloat(amount) || 0) * parseInt(leverage || 1)).toFixed(4);
  const dirColor = direction === 'long' ? '#00c076' : '#ff4d4d';

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(0,192,118,0.1)', border: '1px solid rgba(0,192,118,0.2)',
          borderRadius: 20, padding: '4px 12px', marginBottom: 10,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c076' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#00c076', letterSpacing: 1.5 }}>TRADING</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
          Leveraged <span style={{ color: '#00c076' }}>Markets</span>
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          {ASSETS.length} pairs · Up to 100x leverage
        </div>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13,
          background: msg.err ? 'rgba(255,77,77,0.08)' : 'rgba(0,192,118,0.08)',
          border: `1px solid ${msg.err ? 'rgba(255,77,77,0.2)' : 'rgba(0,192,118,0.2)'}`,
          color: msg.err ? '#ff4d4d' : '#00c076',
        }}>{msg.text}</div>
      )}

      {/* Pair dropdown */}
      <PairDropdown value={selectedAsset} onChange={setSelectedAsset} prices={prices} />

      {/* Chart */}
      <div style={{
        borderRadius: 14, overflow: 'hidden', marginBottom: 14,
        border: '1px solid rgba(255,255,255,0.06)',
        borderTop: `2px solid ${selectedAsset.color}`,
        background: '#111',
      }}>
        <div style={{
          padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{selectedAsset.pair}</span>
            {prices[selectedAsset.id]?.usd && (
              <span style={{ fontSize: 14, fontWeight: 800, color: selectedAsset.color }}>
                ${prices[selectedAsset.id].usd.toLocaleString(undefined, {
                  maximumFractionDigits: prices[selectedAsset.id].usd < 1 ? 6 : 2,
                })}
              </span>
            )}
            {prices[selectedAsset.id]?.usd_24h_change !== undefined && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: prices[selectedAsset.id].usd_24h_change >= 0 ? '#00c076' : '#ff4d4d',
              }}>
                {prices[selectedAsset.id].usd_24h_change >= 0 ? '+' : ''}
                {prices[selectedAsset.id].usd_24h_change.toFixed(2)}%
              </span>
            )}
          </div>
          <span style={{ fontSize: 10, color: '#444' }}>TradingView</span>
        </div>
        <TradingChart symbol={selectedAsset.symbol} interval="15" height={340} />
      </div>

      {/* Trade form */}
      <div style={{
        borderRadius: 14, padding: 18, marginBottom: 14,
        background: '#111', border: '1px solid rgba(255,255,255,0.06)',
        borderTop: `2px solid ${dirColor}`,
      }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, color: '#fff' }}>Open Trade</div>

        {/* Direction */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>Direction</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['long', 'short'].map(d => {
              const dc = d === 'long' ? '#00c076' : '#ff4d4d';
              return (
                <button key={d} onClick={() => setDirection(d)} style={{
                  flex: 1, padding: '10px 0', borderRadius: 10, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', textTransform: 'uppercase', transition: 'all 0.15s',
                  border: direction === d ? `1px solid ${dc}` : '1px solid rgba(255,255,255,0.06)',
                  background: direction === d ? `${dc}18` : 'rgba(255,255,255,0.02)',
                  color: direction === d ? dc : '#555',
                }}>
                  {d === 'long' ? '▲ Long' : '▼ Short'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amount */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>Amount (BNB)</div>
          <input
            type="number" placeholder="0.0000" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{
              width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, fontWeight: 600,
              outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 11, color: '#555', marginTop: 5 }}>
            Available: <span style={{ color: '#3b9eff', fontWeight: 700 }}>{fmt(balance?.tradingBalance)} BNB</span>
          </div>
        </div>

        {/* Leverage */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
            <span style={{ color: '#555' }}>Leverage</span>
            <span style={{ color: dirColor, fontWeight: 700 }}>{leverage}x</span>
          </div>
          <input
            type="range" min="1" max="100" value={leverage}
            onChange={e => setLeverage(e.target.value)}
            style={{ width: '100%', accentColor: dirColor }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#333', marginTop: 3 }}>
            <span>1x</span><span>25x</span><span>50x</span><span>100x</span>
          </div>
        </div>

        {/* Position summary */}
        {amount && (
          <div style={{
            padding: '10px 12px', borderRadius: 10, marginBottom: 14,
            background: `${dirColor}08`, border: `1px solid ${dirColor}18`, fontSize: 12,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
              <span style={{ color: '#555' }}>Position Size</span>
              <span style={{ fontWeight: 700 }}>{positionSize} BNB</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#555' }}>Asset</span>
              <span style={{ fontWeight: 700, color: dirColor }}>{selectedAsset.pair}</span>
            </div>
          </div>
        )}

        <button
          onClick={handleOpen} disabled={loading === 'open'}
          style={{
            width: '100%',
            background: loading === 'open' ? '#333' : `linear-gradient(135deg, ${dirColor}, ${dirColor}bb)`,
            color: '#fff', fontWeight: 800, border: 'none', borderRadius: 10,
            padding: '12px 0', cursor: 'pointer', fontSize: 13, letterSpacing: 0.5,
          }}
        >
          {loading === 'open' ? 'Opening...' : `Open ${direction === 'long' ? 'Long ▲' : 'Short ▼'}`}
        </button>
      </div>

      {/* Open positions */}
      <div style={{
        borderRadius: 14, padding: 18, marginBottom: 14,
        background: '#111', border: '1px solid rgba(255,255,255,0.06)',
        borderTop: '2px solid #fcd535',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <IconBox color="#fcd535" size={34}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </IconBox>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Open Positions</div>
            <div style={{ fontSize: 11, color: '#555' }}>{open.length} active trade{open.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        {open.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px 0', color: '#444', fontSize: 13,
            border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 10,
          }}>No open positions</div>
        ) : open.map(t => (
          <div key={t._id} style={{
            padding: '14px', borderRadius: 10, marginBottom: 10,
            background: 'rgba(255,255,255,0.02)',
            borderLeft: `3px solid ${t.direction === 'long' ? '#00c076' : '#ff4d4d'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>{t.asset}</span>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 4, fontWeight: 700,
                  background: t.direction === 'long' ? 'rgba(0,192,118,0.12)' : 'rgba(255,77,77,0.12)',
                  color: t.direction === 'long' ? '#00c076' : '#ff4d4d',
                }}>{t.direction?.toUpperCase()} {t.leverage}x</span>
              </div>
              <button
                onClick={() => handleClose(t._id)} disabled={loading === t._id}
                style={{
                  fontSize: 11, padding: '4px 12px', borderRadius: 6,
                  background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)',
                  color: '#ff4d4d', cursor: 'pointer',
                }}
              >{loading === t._id ? '...' : 'Close'}</button>
            </div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
              <span>Size: <span style={{ color: '#ccc' }}>{fmt(t.amount)} BNB</span></span>
              <span>Entry: <span style={{ color: '#ccc' }}>${(t.entryPrice || 0).toFixed(2)}</span></span>
              <span style={{ color: (t.pnl || 0) >= 0 ? '#00c076' : '#ff4d4d', fontWeight: 700 }}>
                PnL: {(t.pnl || 0) >= 0 ? '+' : ''}{fmt(t.pnl)} BNB
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Trade history */}
      {closed.length > 0 && (
        <div style={{
          borderRadius: 14, padding: 18,
          background: '#111', border: '1px solid rgba(255,255,255,0.06)',
          borderTop: '2px solid #3b9eff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <IconBox color="#3b9eff" size={34}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </IconBox>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Trade History</div>
              <div style={{ fontSize: 11, color: '#555' }}>{closed.length} closed trade{closed.length !== 1 ? 's' : ''}</div>
            </div>
          </div>

          {closed.slice(0, 10).map(t => (
            <div key={t._id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 12,
            }}>
              <div>
                <span style={{ fontWeight: 700 }}>{t.asset}</span>
                <span style={{
                  marginLeft: 8, padding: '1px 6px', borderRadius: 3, fontSize: 10,
                  background: t.direction === 'long' ? 'rgba(0,192,118,0.12)' : 'rgba(255,77,77,0.12)',
                  color: t.direction === 'long' ? '#00c076' : '#ff4d4d',
                }}>{t.direction?.toUpperCase()}</span>
                <span style={{ color: '#444', marginLeft: 8 }}>
                  {new Date(t.closedAt || t.createdAt).toLocaleDateString()}
                </span>
              </div>
              <div style={{ fontWeight: 700, color: (t.pnl || 0) >= 0 ? '#00c076' : '#ff4d4d' }}>
                {(t.pnl || 0) >= 0 ? '+' : ''}{fmt(t.pnl)} BNB
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
