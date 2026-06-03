import { useState, useEffect, useRef } from 'react';
import {
  adminVerify, adminStats, adminAccounts, adminUpdateAccount,
  adminWithdrawals, adminUpdateWithdrawal,
} from '../api.js';

const fmt = (n) => Number(n || 0).toFixed(2);
const fmtBig = (n) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const SIDEBAR = {
  ANALYTICS: [
    { id: 'overview', label: 'Overview', icon: '⊞' },
    { id: 'earnings', label: 'Earnings', icon: '↗' },
    { id: 'referrals', label: 'Referrals', icon: '⌘' },
    { id: 'cycles', label: '3x Cycles', icon: '↺' },
  ],
  MANAGEMENT: [
    { id: 'accounts', label: 'Accounts', icon: '◎' },
    { id: 'traders', label: 'Traders', icon: '◈' },
    { id: 'copytrades', label: 'Copy Trades', icon: '⊡' },
    { id: 'stakes', label: 'Stakes', icon: '⊟' },
    { id: 'withdrawals', label: 'Withdrawals', icon: '⊠' },
    { id: 'livechat', label: 'Live Chat', icon: '□' },
  ],
};

// Login screen
function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    const tryVanta = () => {
      if (window.VANTA && window.THREE && vantaRef.current && !vantaEffect.current) {
        vantaEffect.current = window.VANTA.DOTS({
          el: vantaRef.current,
          THREE: window.THREE,
          mouseControls: true,
          color: 0xfcd535, color2: 0xff8800,
          backgroundColor: 0x080b10,
          size: 2.5, spacing: 28, showLines: true,
        });
      }
    };
    tryVanta();
    const t = setTimeout(tryVanta, 500);
    return () => { clearTimeout(t); if (vantaEffect.current) { vantaEffect.current.destroy(); vantaEffect.current = null; } };
  }, []);

  const handleLogin = async () => {
    setLoading(true); setError('');
    try {
      const r = await adminVerify(password);
      if (r.data.success) { onLogin(password); }
      else { setError('Invalid password'); }
    } catch { setError('Connection failed'); }
    finally { setLoading(false); }
  };

  return (
    <div ref={vantaRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        background: 'rgba(8,11,16,0.85)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(252,213,53,0.15)', borderRadius: 16,
        padding: '40px 36px', width: 380, position: 'relative', zIndex: 1,
        boxShadow: '0 0 60px rgba(252,213,53,0.08)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>⚙</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fcd535', textShadow: '0 0 20px rgba(252,213,53,0.5)' }}>
            ALPHA<span style={{ color: '#fff' }}>NODES</span>
          </div>
          <div style={{ fontSize: 12, color: '#555', marginTop: 4 }}>Admin Panel</div>
        </div>
        {error && (
          <div style={{ padding: '8px 12px', borderRadius: 8, marginBottom: 14, fontSize: 13, background: 'rgba(255,77,77,0.1)', color: '#ff4d4d', border: '1px solid rgba(255,77,77,0.2)' }}>
            {error}
          </div>
        )}
        <input
          type="password" placeholder="Admin password"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(252,213,53,0.2)', borderRadius: 8, padding: '12px 14px', color: '#fff', fontSize: 14, outline: 'none', marginBottom: 14, boxSizing: 'border-box' }}
        />
        <button
          onClick={handleLogin} disabled={loading}
          style={{ width: '100%', background: '#fcd535', color: '#0d0d0d', fontWeight: 800, border: 'none', borderRadius: 8, padding: '12px', cursor: 'pointer', fontSize: 14, boxShadow: '0 0 20px rgba(252,213,53,0.3)' }}
        >
          {loading ? 'Verifying...' : 'Login'}
        </button>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [page, setPage] = useState(1);
  const [withdrawals, setWithdrawals] = useState([]);
  const [wStatus, setWStatus] = useState('pending');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  useEffect(() => {
    if (!authed) return;
    const tryVanta = () => {
      if (window.VANTA && window.THREE && vantaRef.current && !vantaEffect.current) {
        vantaEffect.current = window.VANTA.DOTS({
          el: vantaRef.current,
          THREE: window.THREE,
          mouseControls: false, touchControls: false,
          color: 0xfcd535, color2: 0xff8800,
          backgroundColor: 0x080b10,
          size: 2, spacing: 24, showLines: true,
        });
      }
    };
    tryVanta();
    const t = setTimeout(tryVanta, 500);
    return () => { clearTimeout(t); if (vantaEffect.current) { vantaEffect.current.destroy(); vantaEffect.current = null; } };
  }, [authed]);

  useEffect(() => {
    if (!authed) return;
    if (tab === 'overview' || tab === 'earnings' || tab === 'referrals' || tab === 'cycles') fetchStats();
    if (tab === 'accounts') fetchAccounts(1);
    if (tab === 'withdrawals') fetchWithdrawals(wStatus);
  }, [tab, authed]);

  useEffect(() => {
    if (authed && tab === 'withdrawals') fetchWithdrawals(wStatus);
  }, [wStatus]);

  const showMsg = (text, err) => { setMsg({ text, err }); setTimeout(() => setMsg(''), 3500); };

  const fetchStats = async () => {
    try { const r = await adminStats(password); setStats(r.data.data || {}); } catch {}
  };

  const fetchAccounts = async (p = 1) => {
    try { const r = await adminAccounts(password, p); setAccounts(r.data.data || []); setPage(p); } catch {}
  };

  const fetchWithdrawals = async (status) => {
    try { const r = await adminWithdrawals(password, status); setWithdrawals(r.data.data || []); } catch {}
  };

  const handleUpdateAccount = async (address, field, value) => {
    setLoading('acc_' + address);
    try {
      const r = await adminUpdateAccount(address, { [field]: value }, password);
      if (!r.data.success) return showMsg(r.data.error || 'Failed', true);
      showMsg('Account updated'); fetchAccounts(page);
    } catch { showMsg('Failed', true); }
    finally { setLoading(''); }
  };

  const handleUpdateWithdrawal = async (id, status) => {
    setLoading('w_' + id);
    try {
      const r = await adminUpdateWithdrawal(id, { status }, password);
      if (!r.data.success) return showMsg(r.data.error || 'Failed', true);
      showMsg(`Withdrawal ${status}`); fetchWithdrawals(wStatus);
    } catch { showMsg('Failed', true); }
    finally { setLoading(''); }
  };

  if (!authed) {
    return <LoginScreen onLogin={(pwd) => { setPassword(pwd); setAuthed(true); }} />;
  }

  const s = stats || {};
  const bnbPrice = s.bnbPrice || 600;
  const toUSDT = (bnb) => (bnb * bnbPrice).toFixed(2);

  const filteredAccounts = accounts.filter(a => !search || a.address?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080b10', color: '#fff', fontFamily: "'Inter', sans-serif" }}>

      {/* Sidebar */}
      <aside style={{
        width: 200, background: 'rgba(10,13,20,0.95)', borderRight: '1px solid rgba(252,213,53,0.08)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100,
      }}>
        {/* Header */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(252,213,53,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(252,213,53,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fcd535' }}>◎</div>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fcd535', textShadow: '0 0 12px rgba(252,213,53,0.4)' }}>Admin Panel</span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
          {Object.entries(SIDEBAR).map(([section, items]) => (
            <div key={section}>
              <div style={{ padding: '10px 16px 4px', fontSize: 9, color: '#444', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {section}
              </div>
              {items.map(item => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    width: '100%', padding: '9px 16px', textAlign: 'left',
                    background: tab === item.id ? 'rgba(252,213,53,0.1)' : 'transparent',
                    borderLeft: tab === item.id ? '2px solid #fcd535' : '2px solid transparent',
                    border: 'none', color: tab === item.id ? '#fcd535' : '#667',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    textShadow: tab === item.id ? '0 0 10px rgba(252,213,53,0.3)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 13 }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* System */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(252,213,53,0.08)' }}>
          <div style={{ fontSize: 9, color: '#444', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>SYSTEM</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#00c076', boxShadow: '0 0 8px #00c076' }} />
            <span style={{ fontSize: 11, color: '#00c076', fontWeight: 700 }}>Connected</span>
          </div>
          <button
            onClick={() => setAuthed(false)}
            style={{ fontSize: 10, color: '#ff4d4d', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ marginLeft: 200, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Message */}
        {msg && (
          <div style={{
            position: 'fixed', top: 16, right: 16, zIndex: 200,
            padding: '10px 16px', borderRadius: 8, fontSize: 13,
            background: msg.err ? 'rgba(255,77,77,0.15)' : 'rgba(0,192,118,0.15)',
            border: `1px solid ${msg.err ? 'rgba(255,77,77,0.3)' : 'rgba(0,192,118,0.3)'}`,
            color: msg.err ? '#ff4d4d' : '#00c076',
          }}>
            {msg.text}
          </div>
        )}

        {/* Overview */}
        {(tab === 'overview' || tab === 'earnings' || tab === 'referrals' || tab === 'cycles') && (
          <div style={{ padding: '28px 32px' }}>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Total Users', value: s.totalUsers || 0, icon: '◎', color: '#4e8ef7', bg: 'rgba(78,142,247,0.12)', border: 'rgba(78,142,247,0.2)' },
                { label: 'Total Deposits', value: `${fmtBig(toUSDT(s.totalDeposited))} USDT`, icon: '$', color: '#00c076', bg: 'rgba(0,192,118,0.12)', border: 'rgba(0,192,118,0.2)' },
                { label: 'Active AI', value: s.activeAI || s.activeInvestments || 0, icon: '↗', color: '#b56cff', bg: 'rgba(181,108,255,0.12)', border: 'rgba(181,108,255,0.2)' },
                { label: 'Withdrawals', value: `${fmtBig(toUSDT(s.totalWithdrawn))} USDT`, icon: '⊠', color: '#fcd535', bg: 'rgba(252,213,53,0.12)', border: 'rgba(252,213,53,0.2)' },
              ].map(card => (
                <div key={card.label} style={{
                  background: card.bg, border: `1px solid ${card.border}`,
                  borderRadius: 12, padding: '20px',
                  boxShadow: `0 4px 20px rgba(0,0,0,0.3)`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 42, height: 42, borderRadius: 10,
                      background: card.bg, border: `1px solid ${card.border}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 18, color: card.color,
                      boxShadow: `0 0 16px ${card.bg}`,
                    }}>
                      {card.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{card.value}</div>
                      <div style={{ fontSize: 11, color: '#667', marginTop: 2 }}>{card.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Active Investments */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: '#ccc' }}>Active Investments</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {[
                  { label: 'AI Agents', value: s.activeAI || s.activeInvestments || 0, icon: '◈' },
                  { label: 'Stakes', value: s.activeStakes || 0, icon: '◎' },
                  { label: 'Copy Trades', value: s.activeCopyTrades || 0, icon: '⊡' },
                ].map(item => (
                  <div key={item.label} style={{
                    background: 'rgba(14,17,24,0.8)', border: '1px solid rgba(252,213,53,0.08)',
                    borderRadius: 12, padding: '24px', textAlign: 'center',
                    backdropFilter: 'blur(8px)',
                  }}>
                    <div style={{ fontSize: 26, color: '#fcd535', marginBottom: 8, textShadow: '0 0 16px rgba(252,213,53,0.4)' }}>{item.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>{item.value}</div>
                    <div style={{ fontSize: 12, color: '#667', marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Totals — with Vanta background */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: '#ccc' }}>Platform Totals</div>
              <div ref={vantaRef} style={{ borderRadius: 12, overflow: 'hidden', position: 'relative', minHeight: 160 }}>
                <div style={{
                  position: 'relative', zIndex: 1,
                  background: 'rgba(8,11,16,0.7)', backdropFilter: 'blur(4px)',
                  margin: '0 0', padding: '24px 28px',
                }}>
                  {[
                    { label: 'Total Trading Balance', value: `${fmtBig(toUSDT(s.totalTradingBalance || s.platformBalance))} USDT`, color: '#fff' },
                    { label: 'Total Earnings Paid', value: `${fmtBig(toUSDT(s.totalEarningsPaid || s.totalWithdrawn))} USDT`, color: '#00c076' },
                    { label: 'Total Staked', value: `${fmtBig(toUSDT(s.totalStaked))} USDT`, color: '#4e8ef7' },
                    { label: 'Pending Withdrawals', value: s.pendingWithdrawals || 0, color: '#fcd535' },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <span style={{ fontSize: 13, color: '#889' }}>{row.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 14, color: '#ccc' }}>Quick Actions</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'Manage Users', icon: '◎', action: () => setTab('accounts') },
                  { label: 'Withdrawals', icon: '⊠', action: () => setTab('withdrawals') },
                  { label: 'Refresh', icon: '↺', action: fetchStats },
                ].map(btn => (
                  <button
                    key={btn.label}
                    onClick={btn.action}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700,
                      background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.2)',
                      color: '#fcd535', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(252,213,53,0.15)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(252,213,53,0.08)'}
                  >
                    <span>{btn.icon}</span> {btn.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Accounts tab */}
        {tab === 'accounts' && (
          <div style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Accounts</div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input
                type="text" placeholder="Search by address..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(252,213,53,0.15)', borderRadius: 8, padding: '9px 14px', color: '#fff', fontSize: 13, outline: 'none' }}
              />
              <button onClick={() => fetchAccounts(1)} style={{ padding: '9px 16px', background: 'rgba(252,213,53,0.1)', border: '1px solid rgba(252,213,53,0.2)', borderRadius: 8, color: '#fcd535', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Refresh</button>
            </div>
            <div style={{ background: 'rgba(14,17,24,0.8)', borderRadius: 12, border: '1px solid rgba(252,213,53,0.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(252,213,53,0.08)' }}>
                    {['Address', 'Balance (BNB)', 'Deposited', 'Withdrawn', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#556', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map(acc => (
                    <tr key={acc.address} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px 16px', color: '#889', fontFamily: 'monospace' }}>
                        {acc.address?.slice(0, 8)}...{acc.address?.slice(-4)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#fcd535', fontWeight: 700 }}>
                        {Number(acc.tradingBalance || 0).toFixed(4)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#00c076' }}>
                        {Number(acc.depositBaseline || 0).toFixed(4)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#ff4d4d' }}>
                        {Number(acc.withdrawnEarnings || 0).toFixed(4)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: 10, padding: '3px 8px', borderRadius: 4,
                          background: acc.isSuspended ? 'rgba(255,77,77,0.12)' : 'rgba(0,192,118,0.12)',
                          color: acc.isSuspended ? '#ff4d4d' : '#00c076',
                        }}>{acc.isSuspended ? 'Suspended' : 'Active'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleUpdateAccount(acc.address, 'isSuspended', !acc.isSuspended)}
                            disabled={loading === 'acc_' + acc.address}
                            style={{ fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', background: acc.isSuspended ? 'rgba(0,192,118,0.1)' : 'rgba(255,77,77,0.1)', border: acc.isSuspended ? '1px solid rgba(0,192,118,0.2)' : '1px solid rgba(255,77,77,0.2)', color: acc.isSuspended ? '#00c076' : '#ff4d4d' }}
                          >{acc.isSuspended ? 'Unsuspend' : 'Suspend'}</button>
                          <button
                            onClick={() => handleUpdateAccount(acc.address, 'withdrawalsBlocked', !acc.withdrawalsBlocked)}
                            disabled={loading === 'acc_' + acc.address}
                            style={{ fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.15)', color: '#fcd535' }}
                          >{acc.withdrawalsBlocked ? 'Unblock' : 'Block W.'}</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredAccounts.length === 0 && <div style={{ padding: 24, color: '#556', fontSize: 13, textAlign: 'center' }}>No accounts found</div>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
              <button onClick={() => fetchAccounts(page - 1)} disabled={page <= 1} style={{ padding: '6px 14px', background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.15)', borderRadius: 6, color: '#fcd535', fontSize: 12, cursor: 'pointer' }}>Previous</button>
              <span style={{ padding: '6px 14px', fontSize: 12, color: '#556' }}>Page {page}</span>
              <button onClick={() => fetchAccounts(page + 1)} disabled={accounts.length < 20} style={{ padding: '6px 14px', background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.15)', borderRadius: 6, color: '#fcd535', fontSize: 12, cursor: 'pointer' }}>Next</button>
            </div>
          </div>
        )}

        {/* Withdrawals tab */}
        {tab === 'withdrawals' && (
          <div style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Withdrawals</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['pending', 'completed', 'rejected'].map(s => (
                <button key={s} onClick={() => setWStatus(s)} style={{ padding: '7px 16px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer', background: wStatus === s ? '#fcd535' : 'rgba(252,213,53,0.08)', color: wStatus === s ? '#0d0d0d' : '#667', border: wStatus === s ? 'none' : '1px solid rgba(252,213,53,0.15)' }}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
            <div style={{ background: 'rgba(14,17,24,0.8)', borderRadius: 12, border: '1px solid rgba(252,213,53,0.08)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(252,213,53,0.08)' }}>
                    {['Address', 'Amount (BNB)', 'USDT Value', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#556', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px 16px', color: '#889', fontFamily: 'monospace' }}>{w.address?.slice(0, 8)}...{w.address?.slice(-4)}</td>
                      <td style={{ padding: '12px 16px', color: '#fcd535', fontWeight: 700 }}>{Number(w.amount || 0).toFixed(4)}</td>
                      <td style={{ padding: '12px 16px', color: '#00c076' }}>{toUSDT(w.amount)} USDT</td>
                      <td style={{ padding: '12px 16px', color: '#556' }}>{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 4, background: w.status === 'pending' ? 'rgba(252,213,53,0.12)' : w.status === 'completed' ? 'rgba(0,192,118,0.12)' : 'rgba(255,77,77,0.12)', color: w.status === 'pending' ? '#fcd535' : w.status === 'completed' ? '#00c076' : '#ff4d4d' }}>{w.status}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {w.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleUpdateWithdrawal(w._id, 'completed')} disabled={loading === 'w_' + w._id} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', background: 'rgba(0,192,118,0.1)', border: '1px solid rgba(0,192,118,0.2)', color: '#00c076' }}>Approve</button>
                            <button onClick={() => handleUpdateWithdrawal(w._id, 'rejected')} disabled={loading === 'w_' + w._id} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', color: '#ff4d4d' }}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {withdrawals.length === 0 && <div style={{ padding: 24, color: '#556', fontSize: 13, textAlign: 'center' }}>No {wStatus} withdrawals</div>}
            </div>
          </div>
        )}

        {/* Placeholder tabs */}
        {['traders', 'copytrades', 'stakes', 'livechat'].includes(tab) && (
          <div style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20, textTransform: 'capitalize' }}>{tab.replace('copytrades', 'Copy Trades').replace('livechat', 'Live Chat')}</div>
            <div style={{ background: 'rgba(14,17,24,0.8)', borderRadius: 12, border: '1px solid rgba(252,213,53,0.08)', padding: 32, textAlign: 'center', color: '#445' }}>
              Coming soon
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
