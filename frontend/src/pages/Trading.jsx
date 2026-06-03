import { useEffect, useState } from 'react';
import { useApp } from '../App.jsx';
import { getTrades, openTrade, closeTrade } from '../api.js';
import TradingChart from '../components/TradingChart.jsx';

const fmt = (n) => (n || 0).toFixed(4);

const ASSETS = [
  { pair: 'BNB/USDT',  symbol: 'BINANCE:BNBUSDT',  id: 'binancecoin' },
  { pair: 'BTC/USDT',  symbol: 'BINANCE:BTCUSDT',   id: 'bitcoin' },
  { pair: 'ETH/USDT',  symbol: 'BINANCE:ETHUSDT',   id: 'ethereum' },
  { pair: 'SOL/USDT',  symbol: 'BINANCE:SOLUSDT',   id: 'solana' },
  { pair: 'DOGE/USDT', symbol: 'BINANCE:DOGEUSDT',  id: 'dogecoin' },
  { pair: 'XRP/USDT',  symbol: 'BINANCE:XRPUSDT',   id: 'ripple' },
  { pair: 'ADA/USDT',  symbol: 'BINANCE:ADAUSDT',   id: 'cardano' },
  { pair: 'AVAX/USDT', symbol: 'BINANCE:AVAXUSDT',  id: 'avalanche-2' },
];

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
  const selPrice = prices[selectedAsset.id];
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
          <span style={{ fontSize: 10, fontWeight: 700, color: '#00c076', letterSpacing: 1.5 }}>
            TRADING
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
          Leveraged <span style={{ color: '#00c076' }}>Markets</span>
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Live charts · Up to 100x leverage</div>
      </div>

      {msg && (
        <div style={{
          padding: '10px 16px', borderRadius: 10, marginBottom: 16, fontSize: 13,
          background: msg.err ? 'rgba(255,77,77,0.08)' : 'rgba(0,192,118,0.08)',
          border: `1px solid ${msg.err ? 'rgba(255,77,77,0.2)' : 'rgba(0,192,118,0.2)'}`,
          color: msg.err ? '#ff4d4d' : '#00c076',
        }}>{msg.text}</div>
      )}

      {/* Asset picker */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14,
        overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch',
      }}>
        {ASSETS.map(a => {
          const p = prices[a.id];
          const change = p?.usd_24h_change;
          const isUp = (change || 0) >= 0;
          const isSel = selectedAsset.pair === a.pair;
          return (
            <div
              key={a.pair}
              onClick={() => setSelectedAsset(a)}
              style={{
                flex: '0 0 auto', padding: '8px 12px', borderRadius: 10, cursor: 'pointer',
                background: isSel ? 'rgba(0,192,118,0.08)' : 'rgba(255,255,255,0.02)',
                border: isSel ? '1px solid rgba(0,192,118,0.3)' : '1px solid rgba(255,255,255,0.06)',
                borderTop: isSel ? '2px solid #00c076' : '2px solid transparent',
                minWidth: 96, transition: 'all 0.15s',
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: isSel ? '#00c076' : '#999' }}>{a.pair}</div>
              <div style={{ fontSize: 12, fontWeight: 800, marginTop: 2, color: '#fff' }}>
                {p?.usd ? `$${p.usd.toLocaleString(undefined, { maximumFractionDigits: p.usd < 1 ? 5 : 2 })}` : '—'}
              </div>
              {change !== undefined && (
                <div style={{ fontSize: 10, color: isUp ? '#00c076' : '#ff4d4d', fontWeight: 600, marginTop: 1 }}>
                  {isUp ? '+' : ''}{change.toFixed(2)}%
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div style={{
        borderRadius: 14, overflow: 'hidden', marginBottom: 14,
        border: '1px solid rgba(255,255,255,0.06)',
        borderTop: '2px solid #00c076',
        background: '#111',
      }}>
        <div style={{
          padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 14, fontWeight: 800 }}>{selectedAsset.pair}</span>
            {selPrice?.usd && (
              <span style={{ fontSize: 14, fontWeight: 800, color: '#00c076' }}>
                ${selPrice.usd.toLocaleString(undefined, { maximumFractionDigits: selPrice.usd < 1 ? 5 : 2 })}
              </span>
            )}
            {selPrice?.usd_24h_change !== undefined && (
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: selPrice.usd_24h_change >= 0 ? '#00c076' : '#ff4d4d',
              }}>
                {selPrice.usd_24h_change >= 0 ? '+' : ''}{selPrice.usd_24h_change.toFixed(2)}%
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
