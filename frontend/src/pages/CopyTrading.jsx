import { useEffect, useState } from 'react';
import { useApp } from '../App.jsx';
import {
  getTraders, getCopyTrades, startCopyTrade, stopCopyTrade,
  takeCopyTradeProfit, takeCopyTradeCapital,
} from '../api.js';

const fmt = (n) => (n || 0).toFixed(4);

function IconBox({ color, size = 38, children }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 10, flexShrink: 0,
      background: `${color}18`, border: `1px solid ${color}30`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', color,
    }}>{children}</div>
  );
}

export default function CopyTrading() {
  const { address, balance, refreshBalance } = useApp();
  const [traders, setTraders] = useState([]);
  const [copyTrades, setCopyTrades] = useState([]);
  const [selectedTrader, setSelectedTrader] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (address) fetchData();
  }, [address]);

  const fetchData = async () => {
    try {
      const [trRes, ctRes] = await Promise.all([
        getTraders(),
        getCopyTrades(address),
      ]);
      setTraders(trRes.data.data || []);
      setCopyTrades(ctRes.data.data || []);
    } catch (e) {}
  };

  const showMsg = (text, err) => {
    setMsg({ text, err });
    setTimeout(() => setMsg(''), 3500);
  };

  const handleStart = async () => {
    if (!selectedTrader) return showMsg('Select a trader', true);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return showMsg('Enter amount', true);
    if (amt > (balance?.tradingBalance || 0)) return showMsg('Insufficient balance', true);
    setLoading('start');
    try {
      const r = await startCopyTrade({ address, traderId: selectedTrader._id, amount: amt });
      if (!r.data.success) return showMsg(r.data.error || 'Failed to start', true);
      showMsg('Copy trading started!');
      setAmount('');
      setSelectedTrader(null);
      fetchData();
      refreshBalance();
    } catch (e) {
      showMsg('Failed to start copy trade', true);
    } finally {
      setLoading('');
    }
  };

  const handleStop = async (id) => {
    setLoading('stop_' + id);
    try {
      const r = await stopCopyTrade(id, { address });
      if (!r.data.success) return showMsg(r.data.error || 'Failed to stop', true);
      showMsg('Copy trade stopped');
      fetchData();
    } catch (e) {
      showMsg('Failed to stop', true);
    } finally {
      setLoading('');
    }
  };

  const handleTakeProfit = async (id) => {
    setLoading('profit_' + id);
    try {
      const r = await takeCopyTradeProfit({ address, copyTradeId: id });
      if (!r.data.success) return showMsg(r.data.error || 'Failed', true);
      showMsg('Profit claimed!');
      fetchData();
      refreshBalance();
    } catch (e) {
      showMsg('Failed to claim profit', true);
    } finally {
      setLoading('');
    }
  };

  const handleTakeCapital = async (id) => {
    setLoading('capital_' + id);
    try {
      const r = await takeCopyTradeCapital({ address, copyTradeId: id });
      if (!r.data.success) return showMsg(r.data.error || 'Failed', true);
      showMsg('Capital returned!');
      fetchData();
      refreshBalance();
    } catch (e) {
      showMsg('Failed to return capital', true);
    } finally {
      setLoading('');
    }
  };

  const active = copyTrades.filter(c => c.status === 'active');
  const stopped = copyTrades.filter(c => c.status === 'stopped');

  const ROI_COLOR = (roi) => {
    if (roi >= 20) return '#00c076';
    if (roi >= 10) return '#fcd535';
    return '#3b9eff';
  };

  return (
    <div style={{ paddingBottom: 32 }}>

      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(147,51,234,0.1)', border: '1px solid rgba(147,51,234,0.2)',
          borderRadius: 20, padding: '4px 12px', marginBottom: 10,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9333ea' }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#9333ea', letterSpacing: 1.5 }}>
            COPY TRADING
          </span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>
          Mirror Top <span style={{ color: '#9333ea' }}>Traders</span>
        </div>
        <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>
          Copy winning strategies · Share in the profits
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

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
        {[
          { label: 'Active Copies', value: active.length, color: '#9333ea' },
          {
            label: 'Total Profit',
            value: `${fmt(active.reduce((s, c) => s + (c.profit || c.earnings || 0), 0))} BNB`,
            color: '#00c076',
          },
          { label: 'Traders', value: traders.length, color: '#fcd535' },
        ].map(s => (
          <div key={s.label} style={{
            borderRadius: 12, padding: '12px 10px', textAlign: 'center',
            background: '#111', border: '1px solid rgba(255,255,255,0.06)',
            borderTop: `2px solid ${s.color}`,
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#555', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Available traders */}
      <div style={{
        borderRadius: 14, padding: 18, marginBottom: 14,
        background: '#111', border: '1px solid rgba(255,255,255,0.06)',
        borderTop: '2px solid #9333ea',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <IconBox color="#9333ea" size={34}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          </IconBox>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Available Traders</div>
            <div style={{ fontSize: 11, color: '#555' }}>Select a trader to copy</div>
          </div>
        </div>

        {traders.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px 0', color: '#444', fontSize: 13,
            border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 10,
          }}>No traders available</div>
        ) : traders.map(t => {
          const roi = t.roiPercent || t.monthlyRoi || 0;
          const roiColor = ROI_COLOR(roi);
          const isSel = selectedTrader?._id === t._id;
          return (
            <div
              key={t._id}
              onClick={() => setSelectedTrader(isSel ? null : t)}
              style={{
                padding: '14px', borderRadius: 10, cursor: 'pointer', marginBottom: 8,
                background: isSel ? 'rgba(147,51,234,0.06)' : 'rgba(255,255,255,0.02)',
                border: isSel ? '1px solid rgba(147,51,234,0.3)' : '1px solid rgba(255,255,255,0.05)',
                borderLeft: `3px solid ${isSel ? '#9333ea' : 'rgba(255,255,255,0.08)'}`,
                transition: 'all 0.15s',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: `${roiColor}18`, border: `1px solid ${roiColor}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 800, color: roiColor,
                  }}>
                    {(t.name || 'T')[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#555' }}>
                      {t.totalTrades || 0} trades · {t.winRate || 0}% win rate
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: 14, fontWeight: 800, color: roiColor,
                  background: `${roiColor}12`, padding: '4px 10px', borderRadius: 8,
                }}>
                  +{roi}%
                </div>
              </div>
              {isSel && (
                <div style={{
                  marginTop: 8, padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(147,51,234,0.06)', border: '1px solid rgba(147,51,234,0.15)',
                  fontSize: 11, color: '#9333ea', fontWeight: 600,
                }}>
                  Selected — enter amount below to start copying
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Start copy trade form */}
      {selectedTrader && (
        <div style={{
          borderRadius: 14, padding: 18, marginBottom: 14,
          background: '#111', border: '1px solid rgba(147,51,234,0.2)',
          borderTop: '2px solid #9333ea',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
            Copy <span style={{ color: '#9333ea' }}>{selectedTrader.name}</span>
          </div>
          <div style={{ fontSize: 11, color: '#555', marginBottom: 14 }}>
            +{selectedTrader.roiPercent || selectedTrader.monthlyRoi || 0}% ROI · {selectedTrader.winRate || 0}% win rate
          </div>

          <div style={{ fontSize: 11, color: '#555', marginBottom: 6 }}>Allocation (BNB)</div>
          <input
            type="number"
            placeholder="0.0000"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{
              width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, fontWeight: 600,
              outline: 'none', marginBottom: 6, boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: 11, color: '#555', marginBottom: 16 }}>
            Available: <span style={{ color: '#3b9eff', fontWeight: 700 }}>{fmt(balance?.tradingBalance)} BNB</span>
          </div>
          <button
            onClick={handleStart} disabled={loading === 'start'}
            style={{
              width: '100%',
              background: loading === 'start' ? '#333' : 'linear-gradient(135deg, #9333ea, #9333eabb)',
              color: '#fff', fontWeight: 800, border: 'none', borderRadius: 10,
              padding: '12px 0', cursor: 'pointer', fontSize: 13,
            }}
          >
            {loading === 'start' ? 'Starting...' : 'Start Copy Trade'}
          </button>
        </div>
      )}

      {/* Active copy trades */}
      <div style={{
        borderRadius: 14, padding: 18, marginBottom: 14,
        background: '#111', border: '1px solid rgba(255,255,255,0.06)',
        borderTop: '2px solid #00c076',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <IconBox color="#00c076" size={34}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
              <polyline points="16 7 22 7 22 13" />
            </svg>
          </IconBox>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>Active Copy Trades</div>
            <div style={{ fontSize: 11, color: '#555' }}>{active.length} running</div>
          </div>
        </div>

        {active.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '24px 0', color: '#444', fontSize: 13,
            border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 10,
          }}>No active copy trades</div>
        ) : active.map(ct => (
          <div key={ct._id} style={{
            padding: '14px', borderRadius: 10, marginBottom: 10,
            background: 'rgba(255,255,255,0.02)', borderLeft: '3px solid #00c076',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>
                  {ct.traderName || ct.trader?.name || 'Trader'}
                </div>
                <div style={{ fontSize: 11, color: '#555' }}>
                  Capital: {fmt(ct.amount)} BNB · ROI: {ct.roiPercent || 0}%
                </div>
              </div>
              <span style={{
                fontSize: 10, padding: '3px 8px', borderRadius: 6, height: 'fit-content',
                background: 'rgba(0,192,118,0.1)', border: '1px solid rgba(0,192,118,0.2)',
                color: '#00c076', fontWeight: 700,
              }}>ACTIVE</span>
            </div>
            <div style={{
              fontSize: 16, fontWeight: 800, color: '#00c076', marginBottom: 12,
            }}>
              +{fmt(ct.profit || ct.earnings || 0)} BNB profit
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => handleTakeProfit(ct._id)} disabled={!!loading}
                style={{
                  flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 8, fontWeight: 700,
                  background: 'rgba(0,192,118,0.1)', border: '1px solid rgba(0,192,118,0.2)',
                  color: '#00c076', cursor: 'pointer',
                }}
              >{loading === 'profit_' + ct._id ? '...' : 'Take Profit'}</button>
              <button
                onClick={() => handleStop(ct._id)} disabled={!!loading}
                style={{
                  flex: 1, fontSize: 12, padding: '8px 0', borderRadius: 8, fontWeight: 700,
                  background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)',
                  color: '#ff4d4d', cursor: 'pointer',
                }}
              >{loading === 'stop_' + ct._id ? '...' : 'Stop'}</button>
            </div>
          </div>
        ))}
      </div>

      {/* Stopped trades */}
      {stopped.length > 0 && (
        <div style={{
          borderRadius: 14, padding: 18,
          background: '#111', border: '1px solid rgba(255,255,255,0.06)',
          borderTop: '2px solid #3b9eff',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <IconBox color="#3b9eff" size={34}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="6" y="4" width="4" height="16" />
                <rect x="14" y="4" width="4" height="16" />
              </svg>
            </IconBox>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>Stopped Trades</div>
              <div style={{ fontSize: 11, color: '#555' }}>{stopped.length} completed</div>
            </div>
          </div>

          {stopped.map(ct => (
            <div key={ct._id} style={{
              padding: '12px', borderRadius: 10, marginBottom: 8,
              background: 'rgba(255,255,255,0.02)',
              borderLeft: '3px solid rgba(255,255,255,0.1)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <div>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{ct.traderName || 'Trader'}</span>
                  <span style={{ color: '#444', marginLeft: 8, fontSize: 11 }}>
                    {fmt(ct.amount)} BNB
                  </span>
                </div>
                <span style={{ color: '#00c076', fontWeight: 700, fontSize: 13 }}>
                  +{fmt(ct.profit || 0)} BNB
                </span>
              </div>
              {(ct.amount > 0 || ct.capitalReturned === false) && (
                <button
                  onClick={() => handleTakeCapital(ct._id)} disabled={!!loading}
                  style={{
                    fontSize: 11, padding: '6px 14px', borderRadius: 8, fontWeight: 700,
                    background: 'rgba(59,158,255,0.08)', border: '1px solid rgba(59,158,255,0.2)',
                    color: '#3b9eff', cursor: 'pointer', marginTop: 4,
                  }}
                >{loading === 'capital_' + ct._id ? '...' : 'Return Capital'}</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
