import { useState, useEffect, useRef } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useSignMessage, useConnect, useDisconnect } from 'wagmi';
import {
  adminVerify, adminStats, adminAccounts, adminUpdateAccount,
  adminWithdrawals, adminUpdateWithdrawal, adminCredit,
  adminGetTraders, adminCreateTrader, adminUpdateTrader, adminDeleteTrader,
  adminContractInfo, adminFundContract, adminSetPaused, adminEmergencyWithdraw, adminSetTreasury,
  adminGetInvestments, adminManageInvestment, adminGetStakes, adminGetPlatform, adminSetPlatform,
  adminGetAiRates, adminSetAiRates,
  adminPreviewPayouts, adminExecutePayouts, adminPayoutHistory,
  adminAuthNonce, adminAuthVerify, adminAuthLogout, adminAuthSession,
  adminGetTickets, adminReplyTicket, adminUpdateTicket,
  adminGetDistribution, adminAddDistributionWallet, adminDeleteDistributionWallet,
  adminExecuteDistribution, adminDistributionHistory,
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
    { id: 'investments', label: 'AI Investments', icon: '◆' },
    { id: 'ai-rates', label: 'AI Rates', icon: '◈' },
    { id: 'payouts', label: 'Daily Payouts', icon: '⇄' },
    { id: 'stakes', label: 'Stakes', icon: '⊟' },
    { id: 'copytrades', label: 'Copy Trades', icon: '⊡' },
    { id: 'withdrawals', label: 'Withdrawals', icon: '⊠' },
    { id: 'tickets', label: 'Tickets', icon: '✉' },
    { id: 'distribution', label: 'Distribution', icon: '⛃' },
  ],
  SYSTEM: [
    { id: 'contract', label: 'Contract', icon: '⬡' },
    { id: 'platform', label: 'Platform', icon: '⚙' },
  ],
};

const EMPTY_TRADER = { name: '', avatar: '', roiPercent: '', dailyRate: '', winRate: '', totalTrades: '', followers: '', aum: '', minCopyAmount: '0.01', description: '', strategy: '', active: true };

const ROI_COLOR = (roi) => roi >= 20 ? '#00c076' : roi >= 10 ? '#fcd535' : '#3b9eff';

// ─── Design system ──────────────────────────────────────────────────────────
// Shared tokens + presentational primitives so every tab renders from one
// consistent visual language instead of each redefining its own card/input/
// button styles. Pure styling layer — no data or behavior lives here.

const THEME = {
  color: {
    panel: 'rgba(12,14,20,0.95)',
    panelAlt: 'rgba(14,17,24,0.85)',
    border: 'rgba(255,255,255,0.07)',
    text: '#f5f6f8',
    textMuted: '#8a93a6',
    textFaint: '#4b5568',
    gold: '#fcd535',
    goldDeep: '#f59e0b',
    green: '#00c076',
    red: '#ff4d4d',
    blue: '#3b9eff',
    blue2: '#4e8ef7',
    purple: '#a855f7',
  },
  radius: { sm: 8, md: 10, lg: 16, xl: 20, pill: 999 },
  font: { xs: 10, sm: 11, base: 12, md: 13, lg: 15, xl: 18, xxl: 22 },
  shadow: { card: '0 4px 22px rgba(0,0,0,0.32)' },
};

function GlobalAdminStyles() {
  return (
    <style>{`
      .admin-scroll::-webkit-scrollbar { width: 8px; height: 8px; }
      .admin-scroll::-webkit-scrollbar-track { background: transparent; }
      .admin-scroll::-webkit-scrollbar-thumb { background: rgba(252,213,53,0.15); border-radius: 8px; }
      .admin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(252,213,53,0.3); }

      .admin-tab-panel { animation: adminFadeIn 0.28s cubic-bezier(0.22,1,0.36,1) both; }
      @keyframes adminFadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }

      .admin-card { transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease; }
      .admin-card--hoverable:hover { transform: translateY(-2px); box-shadow: 0 14px 36px rgba(0,0,0,0.45); border-color: rgba(252,213,53,0.22); }

      .admin-nav-btn { position: relative; transition: background 0.15s ease, color 0.15s ease, padding-left 0.15s ease; }
      .admin-nav-btn:hover:not(.admin-nav-btn--active) { background: rgba(255,255,255,0.045); color: #cdd3de; padding-left: 19px; }

      .admin-row { transition: background 0.12s ease; }
      .admin-row:hover { background: rgba(255,255,255,0.028); }

      .admin-btn { transition: transform 0.12s ease, box-shadow 0.15s ease, opacity 0.12s ease, background 0.15s ease, border-color 0.15s ease, filter 0.15s ease; }
      .admin-btn:hover:not(:disabled) { filter: brightness(1.08); }
      .admin-btn:active:not(:disabled) { transform: scale(0.97); }
      .admin-btn:disabled { cursor: not-allowed; }

      .admin-input { transition: border-color 0.15s ease, background 0.15s ease; }
      .admin-input:focus { border-color: rgba(252,213,53,0.5) !important; background: rgba(255,255,255,0.065) !important; }

      .admin-link { transition: opacity 0.15s ease; }
      .admin-link:hover { opacity: 0.75; }
    `}</style>
  );
}

function Card({ children, hoverable, accent, className = '', style, ...rest }) {
  return (
    <div
      className={`admin-card${hoverable ? ' admin-card--hoverable' : ''} ${className}`}
      style={{
        background: THEME.color.panel,
        border: `1px solid ${accent ? accent + '28' : THEME.color.border}`,
        borderRadius: THEME.radius.lg,
        padding: 24,
        boxShadow: THEME.shadow.card,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

function Badge({ color = THEME.color.textMuted, dot = true, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      fontSize: THEME.font.xs, fontWeight: 700, padding: '4px 10px',
      borderRadius: THEME.radius.pill, background: `${color}18`, color,
      border: `1px solid ${color}30`, letterSpacing: 0.3, whiteSpace: 'nowrap',
    }}>
      {dot && <span style={{ width: 5, height: 5, borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />}
      {children}
    </span>
  );
}

function StatTile({ icon, label, value, color = THEME.color.gold, sub }) {
  return (
    <div className="admin-card admin-card--hoverable" style={{
      background: `${color}0d`, border: `1px solid ${color}22`,
      borderRadius: THEME.radius.lg, padding: '20px 22px',
      display: 'flex', alignItems: 'center', gap: 14,
      boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
    }}>
      <div style={{
        width: 44, height: 44, borderRadius: THEME.radius.md, flexShrink: 0,
        background: `${color}16`, border: `1px solid ${color}30`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 19, color, boxShadow: `0 0 18px ${color}20`,
      }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: THEME.font.xxl, fontWeight: 900, color: '#fff', lineHeight: 1.15, letterSpacing: '-0.3px' }}>{value}</div>
        <div style={{ fontSize: THEME.font.sm, color: THEME.color.textMuted, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: THEME.font.xs, color: THEME.color.textFaint, marginTop: 1 }}>{sub}</div>}
      </div>
    </div>
  );
}

function EmptyState({ icon = '◇', title, subtitle }) {
  return (
    <div style={{
      padding: '46px 24px', textAlign: 'center', color: THEME.color.textFaint,
      background: 'rgba(255,255,255,0.015)', borderRadius: THEME.radius.lg,
      border: '1px dashed rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontSize: 30, marginBottom: 12, opacity: 0.25 }}>{icon}</div>
      <div style={{ fontSize: THEME.font.lg, fontWeight: 800, marginBottom: 6, color: THEME.color.textMuted }}>{title}</div>
      {subtitle && <div style={{ fontSize: THEME.font.base, color: THEME.color.textFaint }}>{subtitle}</div>}
    </div>
  );
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.4px', color: '#fff' }}>{title}</div>
        {subtitle && <div style={{ fontSize: THEME.font.base, color: THEME.color.textMuted, marginTop: 4 }}>{subtitle}</div>}
      </div>
      {action}
    </div>
  );
}

const BTN_VARIANTS = {
  primary: { background: `linear-gradient(135deg,${THEME.color.gold},${THEME.color.goldDeep})`, color: '#0d0d0d', border: 'none', boxShadow: '0 4px 16px rgba(252,213,53,0.25)' },
  info: { background: 'linear-gradient(135deg,#3b9eff,#2563eb)', color: '#fff', border: 'none', boxShadow: '0 4px 16px rgba(59,158,255,0.22)' },
  secondary: { background: 'rgba(255,255,255,0.05)', color: '#c3c9d4', border: '1px solid rgba(255,255,255,0.1)' },
  danger: { background: 'rgba(255,77,77,0.1)', color: THEME.color.red, border: '1px solid rgba(255,77,77,0.25)' },
  success: { background: 'rgba(0,192,118,0.1)', color: THEME.color.green, border: '1px solid rgba(0,192,118,0.22)' },
  ghost: { background: 'transparent', color: THEME.color.textMuted, border: '1px solid transparent' },
};

function Button({ variant = 'primary', size = 'md', style, disabled, className = '', children, ...rest }) {
  const pad = size === 'sm' ? '7px 13px' : size === 'lg' ? '14px 0' : '10px 18px';
  const fontSize = size === 'sm' ? THEME.font.sm : THEME.font.md;
  return (
    <button
      className={`admin-btn ${className}`}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        padding: pad, borderRadius: THEME.radius.md, fontSize, fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer', letterSpacing: 0.2,
        opacity: disabled ? 0.5 : 1,
        ...BTN_VARIANTS[variant], ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}

function FormField({ label, color, children }) {
  return (
    <div>
      {label && <label style={{ fontSize: THEME.font.xs, color: color || THEME.color.textMuted, marginBottom: 6, display: 'block', fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase' }}>{label}</label>}
      {children}
    </div>
  );
}

const inputStyle = (extra) => ({
  background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(255,255,255,0.09)',
  borderRadius: THEME.radius.sm, padding: '10px 14px', color: '#fff', fontSize: THEME.font.md,
  outline: 'none', width: '100%', boxSizing: 'border-box', ...extra,
});

const labelStyle = (extra) => ({
  fontSize: THEME.font.xs, color: THEME.color.textMuted, marginBottom: 6, display: 'block',
  fontWeight: 700, letterSpacing: 0.9, textTransform: 'uppercase', ...extra,
});

const tableWrapStyle = { background: THEME.color.panel, borderRadius: THEME.radius.lg, border: `1px solid ${THEME.color.border}`, overflow: 'hidden', boxShadow: THEME.shadow.card };
const thStyle = { padding: '13px 16px', textAlign: 'left', color: THEME.color.textFaint, fontWeight: 700, fontSize: THEME.font.xs, textTransform: 'uppercase', letterSpacing: 0.8 };
const tdStyle = { padding: '12px 16px' };

function TradersTab({ password, showMsg }) {
  const [traders, setTraders] = useState([]);
  const [loading, setLoading] = useState('');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_TRADER);
  const [showForm, setShowForm] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => { fetchTraders(); }, []);

  const fetchTraders = async () => {
    try { const r = await adminGetTraders(password); setTraders(r.data.data || []); } catch {}
  };

  const openCreate = () => { setEditId(null); setForm(EMPTY_TRADER); setShowForm(true); };
  const openEdit = (t) => {
    setEditId(t._id);
    setForm({ name: t.name||'', avatar: t.avatar||'', roiPercent: t.roiPercent??'', dailyRate: t.dailyRate??'', winRate: t.winRate??'', totalTrades: t.totalTrades??'', followers: t.followers??'', aum: t.aum??'', minCopyAmount: t.minCopyAmount??'0.01', description: t.description||'', strategy: t.strategy||'', active: t.active !== false });
    setShowForm(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, avatar: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return showMsg('Name is required', true);
    setLoading('save');
    try {
      const r = editId ? await adminUpdateTrader(editId, form, password) : await adminCreateTrader(form, password);
      if (!r.data.success) return showMsg(r.data.error || 'Failed', true);
      showMsg(editId ? 'Trader updated' : 'Trader created');
      setShowForm(false);
      fetchTraders();
    } catch { showMsg('Request failed', true); }
    finally { setLoading(''); }
  };

  const handleToggle = async (t) => {
    try { await adminUpdateTrader(t._id, { active: !t.active }, password); fetchTraders(); } catch { showMsg('Failed', true); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trader?')) return;
    try { await adminDeleteTrader(id, password); showMsg('Deleted'); fetchTraders(); } catch { showMsg('Failed', true); }
  };

  const inp = inputStyle();
  const lbl = labelStyle();

  return (
    <div className="admin-tab-panel" style={{ padding: '28px 32px' }}>
      <SectionHeader
        title="Copy Traders"
        subtitle={`${traders.length} traders · ${traders.filter(t=>t.active).length} active`}
        action={
          <Button onClick={openCreate}>
            <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Add Trader
          </Button>
        }
      />

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(320px,1fr))', gap: 20 }}>
        {traders.map(t => {
          const color = ROI_COLOR(t.roiPercent || 0);
          return (
            <div key={t._id} style={{
              background: 'rgba(10,12,18,0.98)', borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.06)',
              overflow: 'hidden', opacity: t.active ? 1 : 0.4,
              transition: 'transform 0.18s, box-shadow 0.18s',
              boxShadow: '0 2px 16px rgba(0,0,0,0.4)',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 12px 40px rgba(0,0,0,0.5), 0 0 0 1px ${color}20`; }}
              onMouseLeave={e => { e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 2px 16px rgba(0,0,0,0.4)'; }}
            >
              {/* Gradient header band */}
              <div style={{ height: 4, background: `linear-gradient(90deg, ${color}, ${color}66, transparent)` }} />

              <div style={{ padding: '22px 22px 18px' }}>
                {/* Profile + ROI */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ width: 68, height: 68, borderRadius: 18, overflow: 'hidden', background: `${color}12`, border: `2px solid ${color}30`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 900, color, boxShadow: `0 0 20px ${color}20` }}>
                      {t.avatar ? <img src={t.avatar} alt={t.name} style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : (t.name||'T').slice(0,2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 900, fontSize: 17, color: '#fff', letterSpacing: '-0.3px' }}>{t.name}</div>
                      <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        {!t.active && <Badge color={THEME.color.red}>Inactive</Badge>}
                        {t.followers > 0 && <span style={{ fontSize: 11, color: '#445' }}>{t.followers} followers</span>}
                        {t.totalTrades > 0 && <span style={{ fontSize: 11, color: '#334' }}>· {t.totalTrades.toLocaleString()} trades</span>}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color, lineHeight: 1 }}>+{t.roiPercent||0}%</div>
                    <div style={{ fontSize: 10, color: '#445', marginTop: 3, letterSpacing: 0.5, textTransform: 'uppercase' }}>per month</div>
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 18 }}>
                  {[
                    ['Win', `${t.winRate||0}%`, '#4e8ef7'],
                    ['Daily', `${t.dailyRate||0}%`, '#fcd535'],
                    ['AUM', `${(t.aum||0).toFixed(1)}`, '#9333ea'],
                    ['Min', `${t.minCopyAmount||0.01}`, '#00c076'],
                  ].map(([l,v,c]) => (
                    <div key={l} style={{ background:`${c}08`, border:`1px solid ${c}18`, borderRadius:10, padding:'10px 4px', textAlign:'center' }}>
                      <div style={{ fontSize:14,fontWeight:800,color:c }}>{v}</div>
                      <div style={{ fontSize:9,color:'#334',marginTop:3,textTransform:'uppercase',letterSpacing:0.6 }}>{l}</div>
                    </div>
                  ))}
                </div>

                {/* Description */}
                {t.description && (
                  <div style={{ fontSize: 12, color: '#445', lineHeight: 1.65, marginBottom: 16, padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 10, borderLeft: `2px solid ${color}30` }}>
                    {t.description.slice(0, 100)}{t.description.length > 100 ? '…' : ''}
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => openEdit(t)} style={{ flex:1, fontSize:13, padding:'10px 0', borderRadius:10, cursor:'pointer', background:'rgba(252,213,53,0.08)', border:'1px solid rgba(252,213,53,0.18)', color:'#fcd535', fontWeight:700, transition:'all 0.15s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='rgba(252,213,53,0.16)'; e.currentTarget.style.borderColor='rgba(252,213,53,0.35)'; }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='rgba(252,213,53,0.08)'; e.currentTarget.style.borderColor='rgba(252,213,53,0.18)'; }}>
                    Edit
                  </button>
                  <button onClick={() => handleToggle(t)} style={{ flex:1, fontSize:13, padding:'10px 0', borderRadius:10, cursor:'pointer', fontWeight:700, transition:'all 0.15s', background:t.active?'rgba(255,77,77,0.06)':'rgba(0,192,118,0.08)', border:t.active?'1px solid rgba(255,77,77,0.18)':'1px solid rgba(0,192,118,0.22)', color:t.active?'#ff4d4d':'#00c076' }}>
                    {t.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(t._id)} style={{ padding:'10px 14px', borderRadius:10, cursor:'pointer', background:'rgba(255,77,77,0.05)', border:'1px solid rgba(255,77,77,0.12)', color:'#ff4d4d', fontSize:14 }}>✕</button>
                </div>
              </div>
            </div>
          );
        })}
        {traders.length === 0 && (
          <div style={{ gridColumn: '1/-1' }}>
            <EmptyState icon="◈" title="No traders yet" subtitle='Click "+ Add Trader" to create your first copy trader profile' />
          </div>
        )}
      </div>

      {/* Modal */}
      {showForm && (
        <div style={{ position:'fixed',inset:0,zIndex:300,background:'rgba(0,0,0,0.85)',backdropFilter:'blur(12px)',display:'flex',alignItems:'center',justifyContent:'center',padding:20 }} onClick={() => setShowForm(false)}>
          <div style={{ background:'#080b12',border:'1px solid rgba(255,255,255,0.07)',borderRadius:22,width:'100%',maxWidth:860,maxHeight:'94vh',overflowY:'auto',boxShadow:'0 32px 100px rgba(0,0,0,0.8)',display:'flex',flexDirection:'column' }} onClick={e => e.stopPropagation()}>

            {/* Header bar */}
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'20px 28px',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0 }}>
              <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                <div style={{ width:36,height:36,borderRadius:10,background:'rgba(252,213,53,0.1)',border:'1px solid rgba(252,213,53,0.2)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fcd535',fontSize:16 }}>◈</div>
                <div>
                  <div style={{ fontSize:15,fontWeight:800 }}>{editId ? 'Edit Trader Profile' : 'New Trader Profile'}</div>
                  <div style={{ fontSize:11,color:'#445' }}>Shown on the copy trading page</div>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} style={{ width:34,height:34,borderRadius:9,background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',color:'#556',cursor:'pointer',fontSize:18,lineHeight:1,display:'flex',alignItems:'center',justifyContent:'center' }}>✕</button>
            </div>

            {/* Two-panel body */}
            <div style={{ display:'flex',gap:0,flex:1,minHeight:0 }}>

              {/* LEFT — Live preview */}
              <div style={{ width:260,flexShrink:0,padding:'24px 20px',borderRight:'1px solid rgba(255,255,255,0.05)',display:'flex',flexDirection:'column',gap:16 }}>
                <div style={{ fontSize:10,color:'#445',fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',marginBottom:4 }}>Live Preview</div>

                {/* Preview card */}
                {(() => {
                  const c = ROI_COLOR(parseFloat(form.roiPercent) || 0);
                  return (
                    <div style={{ background:'rgba(12,14,20,0.95)',borderRadius:14,border:'1px solid rgba(255,255,255,0.06)',overflow:'hidden' }}>
                      <div style={{ height:3,background:`linear-gradient(90deg,${c},transparent)` }} />
                      <div style={{ padding:'14px 14px' }}>
                        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:12 }}>
                          <div onClick={() => fileRef.current?.click()} style={{ width:46,height:46,borderRadius:11,overflow:'hidden',background:`${c}15`,border:`1.5px ${form.avatar?'solid':'dashed'} ${form.avatar?`${c}40`:'rgba(255,255,255,0.15)'}`,flexShrink:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:800,color:c }}>
                            {form.avatar ? <img src={form.avatar} style={{ width:'100%',height:'100%',objectFit:'cover' }} /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>}
                          </div>
                          <div style={{ flex:1,minWidth:0 }}>
                            <div style={{ fontSize:13,fontWeight:800,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{form.name||'Trader Name'}</div>
                            <span style={{ fontSize:10,fontWeight:800,color:c,background:`${c}15`,padding:'1px 6px',borderRadius:5 }}>+{form.roiPercent||0}%/mo</span>
                          </div>
                        </div>
                        <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,marginBottom:10 }}>
                          {[['Win',`${form.winRate||0}%`,'#4e8ef7'],['Daily',`${form.dailyRate||0}%`,'#fcd535'],['Trades',form.totalTrades||0,'#9333ea']].map(([l,v,col])=>(
                            <div key={l} style={{ background:'rgba(255,255,255,0.03)',borderRadius:6,padding:'6px 4px',textAlign:'center' }}>
                              <div style={{ fontSize:11,fontWeight:800,color:col }}>{v}</div>
                              <div style={{ fontSize:8,color:'#445',marginTop:1,textTransform:'uppercase',letterSpacing:0.4 }}>{l}</div>
                            </div>
                          ))}
                        </div>
                        {form.description && <div style={{ fontSize:10,color:'#556',lineHeight:1.5,borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:8 }}>{form.description.slice(0,80)}{form.description.length>80?'…':''}</div>}
                      </div>
                    </div>
                  );
                })()}

                {/* Upload hint */}
                <div style={{ padding:'12px 14px',background:'rgba(147,51,234,0.05)',border:'1px solid rgba(147,51,234,0.1)',borderRadius:12 }}>
                  <div style={{ fontSize:11,fontWeight:700,color:'#a855f7',marginBottom:6 }}>Profile Photo</div>
                  <div style={{ fontSize:10,color:'#445',marginBottom:10,lineHeight:1.5 }}>Square image · PNG or JPG · Click avatar to upload</div>
                  <div style={{ display:'flex',gap:6 }}>
                    <button onClick={() => fileRef.current?.click()} style={{ flex:1,fontSize:11,padding:'7px 0',borderRadius:8,cursor:'pointer',background:'rgba(147,51,234,0.15)',border:'1px solid rgba(147,51,234,0.3)',color:'#a855f7',fontWeight:700 }}>Upload</button>
                    {form.avatar && <button onClick={() => setForm(f=>({...f,avatar:''}))} style={{ flex:1,fontSize:11,padding:'7px 0',borderRadius:8,cursor:'pointer',background:'rgba(255,77,77,0.06)',border:'1px solid rgba(255,77,77,0.15)',color:'#ff4d4d',fontWeight:700 }}>Remove</button>}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleImageUpload} style={{ display:'none' }} />
                </div>

                {/* Active toggle */}
                <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 14px',background:form.active?'rgba(0,192,118,0.05)':'rgba(255,255,255,0.02)',border:`1px solid ${form.active?'rgba(0,192,118,0.15)':'rgba(255,255,255,0.05)'}`,borderRadius:12,cursor:'pointer' }} onClick={() => setForm(f=>({...f,active:!f.active}))}>
                  <div style={{ width:36,height:20,borderRadius:10,background:form.active?'#00c076':'rgba(255,255,255,0.1)',position:'relative',transition:'background 0.2s',flexShrink:0 }}>
                    <div style={{ width:16,height:16,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:form.active?18:2,transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.3)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize:12,fontWeight:700,color:form.active?'#00c076':'#556' }}>{form.active?'Active':'Inactive'}</div>
                    <div style={{ fontSize:10,color:'#445' }}>{form.active?'Visible to users':'Hidden from users'}</div>
                  </div>
                </div>
              </div>

              {/* RIGHT — Form */}
              <div style={{ flex:1,padding:'24px 28px',overflowY:'auto' }}>
                {/* Section: Identity */}
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:10,color:'#fcd535',fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ height:1,background:'rgba(252,213,53,0.2)',flex:1 }} /> Identity <div style={{ height:1,background:'rgba(252,213,53,0.2)',flex:1 }} />
                  </div>
                  <label style={lbl}>Display Name *</label>
                  <input style={inp} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. Alpha Wolf"
                    onFocus={e=>e.target.style.borderColor='rgba(252,213,53,0.5)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                </div>

                {/* Section: Performance */}
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:10,color:'#00c076',fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ height:1,background:'rgba(0,192,118,0.2)',flex:1 }} /> Performance <div style={{ height:1,background:'rgba(0,192,118,0.2)',flex:1 }} />
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10 }}>
                    {[['roiPercent','Monthly ROI %','18.4','#00c076'],['dailyRate','Daily Rate %','0.6','#fcd535'],['winRate','Win Rate %','74','#4e8ef7']].map(([key,label,ph,col])=>(
                      <div key={key}>
                        <label style={{ ...lbl,color:col }}>{label}</label>
                        <input style={{ ...inp,borderColor:`${col}20` }} type="number" value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                          onFocus={e=>e.target.style.borderColor=`${col}60`} onBlur={e=>e.target.style.borderColor=`${col}20`} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section: Stats */}
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:10,color:'#9333ea',fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ height:1,background:'rgba(147,51,234,0.2)',flex:1 }} /> Stats & Limits <div style={{ height:1,background:'rgba(147,51,234,0.2)',flex:1 }} />
                  </div>
                  <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:10 }}>
                    {[['totalTrades','Total Trades','1842'],['followers','Followers','340'],['aum','AUM (BNB)','120'],['minCopyAmount','Min Copy (BNB)','0.01']].map(([key,label,ph])=>(
                      <div key={key}>
                        <label style={lbl}>{label}</label>
                        <input style={inp} type="number" value={form[key]} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
                          onFocus={e=>e.target.style.borderColor='rgba(252,213,53,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Section: Bio */}
                <div style={{ marginBottom:22 }}>
                  <div style={{ fontSize:10,color:'#3b9eff',fontWeight:700,letterSpacing:1.2,textTransform:'uppercase',marginBottom:12,display:'flex',alignItems:'center',gap:8 }}>
                    <div style={{ height:1,background:'rgba(59,158,255,0.2)',flex:1 }} /> Bio <div style={{ height:1,background:'rgba(59,158,255,0.2)',flex:1 }} />
                  </div>
                  <div style={{ marginBottom:10 }}>
                    <label style={lbl}>Description</label>
                    <textarea style={{ ...inp,resize:'vertical',minHeight:72,lineHeight:1.6 }} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Brief bio and trading style..."
                      onFocus={e=>e.target.style.borderColor='rgba(252,213,53,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                  </div>
                  <label style={lbl}>Strategy</label>
                  <textarea style={{ ...inp,resize:'vertical',minHeight:72,lineHeight:1.6 }} value={form.strategy} onChange={e=>setForm(f=>({...f,strategy:e.target.value}))} placeholder="Trading methodology and approach..."
                    onFocus={e=>e.target.style.borderColor='rgba(252,213,53,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
                </div>

                {/* Actions */}
                <div style={{ display:'flex',gap:10,paddingTop:4 }}>
                  <button onClick={handleSave} disabled={loading==='save'} style={{ flex:1,background:'linear-gradient(135deg,#fcd535,#f59e0b)',color:'#0d0d0d',fontWeight:800,border:'none',borderRadius:12,padding:'13px',cursor:'pointer',fontSize:14,boxShadow:'0 4px 20px rgba(252,213,53,0.3)',opacity:loading==='save'?0.6:1,letterSpacing:0.3 }}>
                    {loading==='save'?'Saving...':(editId?'Save Changes':'Create Trader')}
                  </button>
                  <button onClick={() => setShowForm(false)} style={{ padding:'13px 20px',background:'rgba(255,255,255,0.04)',color:'#556',border:'1px solid rgba(255,255,255,0.07)',borderRadius:12,cursor:'pointer',fontSize:13,fontWeight:600 }}>Cancel</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ContractTab({ password, showMsg }) {
  const [info, setInfo] = useState(null);
  const [fundAmt, setFundAmt] = useState('');
  const [treasuryAddr, setTreasuryAddr] = useState('');
  const [loading, setLoading] = useState('');
  const [msgs, setMsgs] = useState({});

  useEffect(() => { fetchInfo(); }, []);

  const fetchInfo = async () => {
    try { const r = await adminContractInfo(password); if (r.data.success) setInfo(r.data.data); } catch {}
  };

  const setMsg = (key, text, isErr) => {
    setMsgs(m => ({ ...m, [key]: { text, isErr } }));
    setTimeout(() => setMsgs(m => ({ ...m, [key]: null })), 4000);
  };

  const Msg = ({ k }) => msgs[k] ? <div style={{ marginTop:10,fontSize:12,color:msgs[k].isErr?'#ff4d4d':'#00c076',padding:'8px 12px',borderRadius:8,background:msgs[k].isErr?'rgba(255,77,77,0.08)':'rgba(0,192,118,0.08)' }}>{msgs[k].text}</div> : null;

  const inp = inputStyle();

  const handleFund = async () => {
    if (!fundAmt || parseFloat(fundAmt) <= 0) return setMsg('fund','Enter a valid amount',true);
    setLoading('fund');
    try {
      const r = await adminFundContract({ amount: fundAmt }, password);
      if (r.data.success) { setMsg('fund',`✓ Funded ${fundAmt} BNB — tx: ${r.data.data?.txHash?.slice(0,18)}...`); setFundAmt(''); fetchInfo(); }
      else setMsg('fund', r.data.error||'Failed', true);
    } catch { setMsg('fund','Request failed',true); }
    finally { setLoading(''); }
  };

  const handlePause = async (paused) => {
    if (!window.confirm(paused ? 'Pause contract? Blocks all deposits and withdrawals.' : 'Unpause contract?')) return;
    setLoading('pause');
    try {
      const r = await adminSetPaused(paused, password);
      if (r.data.success) { setMsg('pause', paused ? '⏸ Contract paused' : '▶ Contract unpaused'); fetchInfo(); }
      else setMsg('pause', r.data.error||'Failed', true);
    } catch { setMsg('pause','Request failed',true); }
    finally { setLoading(''); }
  };

  const handleSetTreasury = async () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(treasuryAddr)) return setMsg('treasury', 'Enter a valid 0x wallet address', true);
    if (!window.confirm(`Set treasury to ${treasuryAddr}?`)) return;
    setLoading('treasury');
    try {
      const r = await adminSetTreasury(treasuryAddr, password);
      if (r.data.success) { setMsg('treasury', `✓ Treasury updated — tx: ${r.data.data?.txHash?.slice(0,18)}...`); setTreasuryAddr(''); }
      else setMsg('treasury', r.data.error || 'Failed', true);
    } catch { setMsg('treasury', 'Request failed', true); }
    finally { setLoading(''); }
  };

  const handleEmergency = async () => {
    if (!window.confirm('EMERGENCY WITHDRAW: Transfer ALL contract BNB to treasury? This cannot be undone.')) return;
    setLoading('emergency');
    try {
      const r = await adminEmergencyWithdraw(password);
      if (r.data.success) { setMsg('emergency',`✓ Withdrawn — tx: ${r.data.data?.txHash?.slice(0,18)}...`); fetchInfo(); }
      else setMsg('emergency', r.data.error||'Failed', true);
    } catch { setMsg('emergency','Request failed',true); }
    finally { setLoading(''); }
  };

  const CONTRACT_ADDR = info?.address || '0xe69dA690A090A2226fDD249b1d786414CcEfE1dA';

  return (
    <div className="admin-tab-panel" style={{ padding:'28px 32px', maxWidth: 700 }}>
      <SectionHeader title="Contract" subtitle="BSC Mainnet · Smart contract management" />

      {/* Info cards */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16 }}>
        <StatTile icon="⬡" label="Contract Balance" color={THEME.color.gold}
          value={info?.balance != null ? `${Number(info.balance).toFixed(4)} BNB` : '—'} />
        <StatTile icon="🔗" label="Network" color={THEME.color.green} value="BSC Mainnet" />
      </div>

      {/* Address */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 14 }}>Contract Address</div>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <code style={{ flex:1,fontSize:12,color:THEME.color.gold,background:'rgba(252,213,53,0.06)',padding:'10px 14px',borderRadius:THEME.radius.sm,wordBreak:'break-all',border:'1px solid rgba(252,213,53,0.12)' }}>{CONTRACT_ADDR}</code>
          <Button variant="secondary" size="sm" onClick={() => navigator.clipboard.writeText(CONTRACT_ADDR)} style={{ color: THEME.color.gold, background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.2)' }}>Copy</Button>
          <a href={`https://bscscan.com/address/${CONTRACT_ADDR}`} target="_blank" rel="noreferrer" className="admin-link" style={{ flexShrink:0,padding:'8px 14px',background:'rgba(59,158,255,0.08)',border:'1px solid rgba(59,158,255,0.2)',borderRadius:THEME.radius.md,color:THEME.color.blue,fontSize:THEME.font.sm,fontWeight:700,textDecoration:'none' }}>BSCScan ↗</a>
        </div>
      </Card>

      {/* Fund contract */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 4 }}>Fund Contract</div>
        <div style={{ fontSize: THEME.font.base, color: THEME.color.textMuted, marginBottom: 16 }}>Send BNB from the owner wallet to fund user withdrawals.</div>
        <FormField label="Amount (BNB)">
          <div style={{ display:'flex',gap:10 }}>
            <input className="admin-input" style={{ ...inp,flex:1 }} type="number" value={fundAmt} onChange={e=>setFundAmt(e.target.value)} placeholder="e.g. 1.0" step="0.01" />
            <Button onClick={handleFund} disabled={loading==='fund'}>{loading==='fund'?'Sending...':'Fund'}</Button>
          </div>
        </FormField>
        <Msg k="fund" />
      </Card>

      {/* Pause / Unpause */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 4 }}>Pause / Unpause Contract</div>
        <div style={{ fontSize: THEME.font.base, color: THEME.color.textMuted, marginBottom: 16 }}>Pausing blocks all on-chain deposits and withdrawals.</div>
        <div style={{ display:'flex',gap:10 }}>
          <Button variant="danger" onClick={() => handlePause(true)} disabled={loading==='pause'} style={{ flex: 1 }}>⏸ Pause Contract</Button>
          <Button variant="success" onClick={() => handlePause(false)} disabled={loading==='pause'} style={{ flex: 1 }}>▶ Unpause Contract</Button>
        </div>
        <Msg k="pause" />
      </Card>

      {/* Treasury wallet */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 4 }}>Treasury Wallet</div>
        <div style={{ fontSize: THEME.font.base, color: THEME.color.textMuted, marginBottom: 16 }}>Change the wallet address that receives funds from emergency withdrawals.</div>
        <FormField label="New Treasury Address">
          <div style={{ display:'flex',gap:10 }}>
            <input className="admin-input" style={{ ...inp,flex:1,fontFamily:'monospace',fontSize:12 }} type="text" value={treasuryAddr} onChange={e=>setTreasuryAddr(e.target.value)} placeholder="0x..." />
            <Button variant="info" onClick={handleSetTreasury} disabled={loading==='treasury'}>{loading==='treasury'?'Setting...':'Set Wallet'}</Button>
          </div>
        </FormField>
        <Msg k="treasury" />
      </Card>

      {/* Emergency */}
      <Card accent={THEME.color.red}>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 4, color: THEME.color.red }}>⚠ Emergency Withdraw</div>
        <div style={{ fontSize: THEME.font.base, color: THEME.color.textMuted, marginBottom: 16 }}>Transfers ALL contract BNB to the treasury wallet. Use only in emergencies — this cannot be undone.</div>
        <Button variant="danger" onClick={handleEmergency} disabled={loading==='emergency'}>{loading==='emergency'?'Processing...':'Emergency Withdraw'}</Button>
        <Msg k="emergency" />
      </Card>
    </div>
  );
}

function InvestmentsTab({ password, showMsg }) {
  const [investments, setInvestments] = useState([]);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState('');

  useEffect(() => { fetch(); }, []);

  const fetch = async () => {
    try { const r = await adminGetInvestments(password, search, status); setInvestments(r.data.data || []); } catch {}
  };

  const manage = async (id, action) => {
    const label = action === 'cancel' ? 'Cancel investment and refund principal?' : 'Force-complete and pay accrued earnings?';
    if (!window.confirm(label)) return;
    setLoading(id + action);
    try {
      const r = await adminManageInvestment(id, action, password);
      if (r.data.success) { showMsg(action === 'cancel' ? 'Investment cancelled' : 'Investment completed'); fetch(); }
      else showMsg(r.data.error || 'Failed', true);
    } catch { showMsg('Failed', true); }
    finally { setLoading(''); }
  };

  const STATUS_COLOR = { active: THEME.color.green, claimed: THEME.color.blue, cancelled: THEME.color.red };

  return (
    <div className="admin-tab-panel" style={{ padding: '28px 32px' }}>
      <SectionHeader title="AI Investments" />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input className="admin-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by address..."
          style={inputStyle({ flex: 1, minWidth: 200, borderColor: 'rgba(252,213,53,0.15)' })} />
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={inputStyle({ width: 'auto', borderColor: 'rgba(252,213,53,0.15)' })}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="claimed">Claimed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <Button variant="secondary" onClick={fetch} style={{ color: THEME.color.gold, background: 'rgba(252,213,53,0.1)', border: '1px solid rgba(252,213,53,0.2)' }}>Search</Button>
      </div>
      <div style={tableWrapStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: THEME.font.base }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${THEME.color.border}` }}>
              {['Address','Package','Amount','Daily Rate','End Date','Claimed','Status','Actions'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {investments.map(inv => (
              <tr key={inv._id} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ ...tdStyle, color: '#9aa3b5', fontFamily: 'monospace' }}>{inv.address?.slice(0,8)}...{inv.address?.slice(-4)}</td>
                <td style={{ ...tdStyle, color: '#dfe3ea' }}>{inv.packageName}</td>
                <td style={{ ...tdStyle, color: THEME.color.gold, fontWeight: 700 }}>{Number(inv.amount||0).toFixed(4)} BNB</td>
                <td style={{ ...tdStyle, color: '#aab' }}>{((inv.dailyRateBps||0)/100).toFixed(1)}%</td>
                <td style={{ ...tdStyle, color: THEME.color.textFaint }}>{inv.endDate ? new Date(inv.endDate).toLocaleDateString() : '—'}</td>
                <td style={{ ...tdStyle, color: THEME.color.green }}>{Number(inv.claimedEarnings||0).toFixed(4)} BNB</td>
                <td style={tdStyle}>
                  <Badge color={STATUS_COLOR[inv.status] || THEME.color.textMuted}>{inv.status}</Badge>
                </td>
                <td style={tdStyle}>
                  {inv.status === 'active' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Button variant="success" size="sm" onClick={() => manage(inv._id, 'complete')} disabled={loading===inv._id+'complete'} style={{ fontSize: 10, padding: '4px 10px' }}>Complete</Button>
                      <Button variant="danger" size="sm" onClick={() => manage(inv._id, 'cancel')} disabled={loading===inv._id+'cancel'} style={{ fontSize: 10, padding: '4px 10px' }}>Cancel</Button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {investments.length === 0 && <EmptyState icon="◆" title="No investments found" />}
      </div>
    </div>
  );
}

function StakesTab({ password }) {
  const [stakes, setStakes] = useState([]);
  const [search, setSearch] = useState('');

  const fetch = async () => {
    if (!search.trim()) return;
    try { const r = await adminGetStakes(search.trim()); setStakes(r.data.data || []); } catch {}
  };

  const STATUS_COLOR = { active: THEME.color.green, completed: THEME.color.blue, earlyUnlocked: THEME.color.gold };

  return (
    <div className="admin-tab-panel" style={{ padding: '28px 32px' }}>
      <SectionHeader title="Stakes" />
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input className="admin-input" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && fetch()} placeholder="Enter wallet address..."
          style={inputStyle({ flex: 1, borderColor: 'rgba(252,213,53,0.15)' })} />
        <Button variant="secondary" onClick={fetch} style={{ color: THEME.color.gold, background: 'rgba(252,213,53,0.1)', border: '1px solid rgba(252,213,53,0.2)' }}>Search</Button>
      </div>
      <div style={tableWrapStyle}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: THEME.font.base }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${THEME.color.border}` }}>
              {['Address','Amount','Duration','Daily Rate','End Date','Earnings','Status'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stakes.map(s => {
              const statusKey = s.status || (s.earlyUnlocked ? 'earlyUnlocked' : s.active ? 'active' : 'completed');
              return (
                <tr key={s._id} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ ...tdStyle, color: '#9aa3b5', fontFamily: 'monospace' }}>{s.address?.slice(0,8)}...{s.address?.slice(-4)}</td>
                  <td style={{ ...tdStyle, color: THEME.color.gold, fontWeight: 700 }}>{Number(s.amount||0).toFixed(4)} BNB</td>
                  <td style={{ ...tdStyle, color: '#aab' }}>{s.durationDays || '—'} days</td>
                  <td style={{ ...tdStyle, color: '#aab' }}>{((s.dailyRateBps||0)/100).toFixed(1)}%</td>
                  <td style={{ ...tdStyle, color: THEME.color.textFaint }}>{s.endDate ? new Date(s.endDate).toLocaleDateString() : '—'}</td>
                  <td style={{ ...tdStyle, color: THEME.color.green }}>{Number(s.claimedEarnings||0).toFixed(4)} BNB</td>
                  <td style={tdStyle}>
                    <Badge color={STATUS_COLOR[statusKey] || THEME.color.textMuted}>{statusKey}</Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {stakes.length === 0 && <EmptyState icon="⊟" title="Search for a wallet" subtitle="Enter a wallet address above to look up its stakes" />}
      </div>
    </div>
  );
}

function PlatformTab({ password, showMsg }) {
  const [paused, setPaused] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState('');

  useEffect(() => { fetchStatus(); }, []);

  const fetchStatus = async () => {
    try { const r = await adminGetPlatform(password); if (r.data.success) { setPaused(r.data.data.paused); setMessage(r.data.data.message || ''); } } catch {}
  };

  const handlePause = async (val) => {
    if (!window.confirm(val ? 'Pause the platform? Users cannot deposit or invest.' : 'Resume the platform?')) return;
    setLoading('pause');
    try {
      const r = await adminSetPlatform({ paused: val }, password);
      if (r.data.success) { setPaused(val); showMsg(val ? '⏸ Platform paused' : '▶ Platform resumed'); }
      else showMsg(r.data.error || 'Failed', true);
    } catch { showMsg('Failed', true); }
    finally { setLoading(''); }
  };

  const handleSaveMessage = async () => {
    setLoading('msg');
    try {
      const r = await adminSetPlatform({ message }, password);
      if (r.data.success) showMsg('Message saved');
      else showMsg(r.data.error || 'Failed', true);
    } catch { showMsg('Failed', true); }
    finally { setLoading(''); }
  };

  const inp = inputStyle();

  return (
    <div className="admin-tab-panel" style={{ padding: '28px 32px' }}>
      <SectionHeader title="Platform Control" subtitle="Manage platform-wide settings and maintenance mode" />

      <Card style={{ marginBottom: 16, maxWidth: 620 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 8 }}>Platform Status</div>
            <Badge color={paused ? THEME.color.red : THEME.color.green}>{paused ? 'Paused' : 'Running'}</Badge>
            <div style={{ fontSize: THEME.font.sm, color: THEME.color.textMuted, marginTop: 8 }}>{paused ? 'Deposits and new investments are blocked' : 'All features active'}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button variant="danger" onClick={() => handlePause(true)} disabled={paused || loading==='pause'}>⏸ Pause</Button>
            <Button variant="success" onClick={() => handlePause(false)} disabled={!paused || loading==='pause'}>▶ Resume</Button>
          </div>
        </div>
      </Card>

      <Card style={{ maxWidth: 620 }}>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 4 }}>Maintenance Message</div>
        <div style={{ fontSize: THEME.font.base, color: THEME.color.textMuted, marginBottom: 14 }}>Shown to users when the platform is paused.</div>
        <input className="admin-input" style={inp} value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Platform under maintenance. Back soon." />
        <Button onClick={handleSaveMessage} disabled={loading==='msg'} style={{ marginTop: 12 }}>
          {loading==='msg' ? 'Saving...' : 'Save Message'}
        </Button>
      </Card>
    </div>
  );
}

function AiRatesTab({ password, showMsg }) {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState('');

  useEffect(() => { fetchRates(); }, []);

  const fetchRates = async () => {
    try {
      const r = await adminGetAiRates(password);
      if (r.data.success) setRates(r.data.data);
    } catch {}
  };

  const setField = (id, field, value) => {
    setRates(r => ({ ...r, [id]: { ...r[id], [field]: value } }));
  };

  const handleSave = async () => {
    for (const id of Object.keys(rates || {})) {
      const min = Number(rates[id].min);
      const max = Number(rates[id].max);
      if (!Number.isFinite(min) || !Number.isFinite(max) || min < 0 || max < min) {
        return showMsg(`Invalid range for ${rates[id].name || id}`, true);
      }
    }
    setLoading('save');
    try {
      const r = await adminSetAiRates(rates, password);
      if (r.data.success) showMsg('AI rates updated');
      else showMsg(r.data.error || 'Failed', true);
    } catch { showMsg('Request failed', true); }
    finally { setLoading(''); }
  };

  const inp = inputStyle();

  if (!rates) return <div className="admin-tab-panel" style={{ padding: '28px 32px', color: THEME.color.textMuted }}>Loading...</div>;

  return (
    <div className="admin-tab-panel" style={{ padding: '28px 32px' }}>
      <SectionHeader
        title="AI Rates"
        subtitle="Daily return range per AI package. Each new deployment locks in a random rate within its band — actual returns average out across the range shown."
      />

      <div style={{ maxWidth: 680 }}>
        {Object.entries(rates).map(([id, r]) => (
          <Card key={id} style={{ marginBottom: 16 }}>
            <div style={{ fontSize: THEME.font.lg, fontWeight: 700, marginBottom: 16 }}>{r.name || id}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <FormField label="Min Daily %">
                <input className="admin-input" style={inp} type="number" step="0.01" min="0" value={r.min}
                  onChange={e => setField(id, 'min', e.target.value)} />
              </FormField>
              <FormField label="Max Daily %">
                <input className="admin-input" style={inp} type="number" step="0.01" min="0" value={r.max}
                  onChange={e => setField(id, 'max', e.target.value)} />
              </FormField>
            </div>
          </Card>
        ))}

        <Button onClick={handleSave} disabled={loading === 'save'}>
          {loading === 'save' ? 'Saving...' : 'Save Rates'}
        </Button>
      </div>
    </div>
  );
}

const CATEGORY_LABELS = {
  roi: 'ROI',
  affiliate_l1: 'Affiliate L1',
  affiliate_l2: 'Affiliate L2',
  affiliate_l3: 'Affiliate L3',
};

function PayoutsTab({ password, showMsg }) {
  const [preview, setPreview] = useState(null);
  const [history, setHistory] = useState([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [loading, setLoading] = useState('');

  useEffect(() => { fetchPreview(); fetchHistory(); }, []);

  const fetchPreview = async () => {
    setLoading('preview');
    try {
      const r = await adminPreviewPayouts(password);
      if (r.data.success) setPreview(r.data.data);
      else showMsg(r.data.error || 'Failed to load preview', true);
    } catch { showMsg('Request failed', true); }
    finally { setLoading(''); }
  };

  const fetchHistory = async () => {
    try { const r = await adminPayoutHistory(password); setHistory(r.data.data || []); } catch {}
  };

  const handleExecute = async () => {
    if (!preview?.recipients?.length) return;
    if (!window.confirm(
      `Send ${preview.totalAmount.toFixed(6)} BNB to ${preview.recipients.length} wallet(s) right now? This is a real, irreversible on-chain transaction.`
    )) return;
    setLoading('execute');
    try {
      const r = await adminExecutePayouts(password);
      if (r.data.success) {
        showMsg(`Paid ${r.data.data.totalAmount.toFixed(6)} BNB to ${r.data.data.recipientCount} wallet(s)`);
        fetchPreview();
        fetchHistory();
      } else {
        showMsg(r.data.error || 'Execute failed', true);
      }
    } catch { showMsg('Request failed', true); }
    finally { setLoading(''); }
  };

  if (!preview) return <div className="admin-tab-panel" style={{ padding: '28px 32px', color: THEME.color.textMuted }}>Loading...</div>;

  const insufficient = preview.sufficientBalance === false;
  const statusColor = insufficient ? THEME.color.red : THEME.color.green;

  return (
    <div className="admin-tab-panel" style={{ padding: '28px 32px', maxWidth: 920 }}>
      <SectionHeader
        title="Daily Payouts"
        subtitle={`AI ROI + 3-tier affiliate commissions (${preview.affiliateRates.map(r => `${r * 100}%`).join(' / ')}), sent as real on-chain BNB.`}
        action={<Button variant="secondary" size="sm" onClick={fetchPreview} disabled={loading === 'preview'}>{loading === 'preview' ? 'Refreshing...' : '↺ Refresh'}</Button>}
      />

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
        <StatTile icon="⇄" label="Owed Now" color={THEME.color.gold} value={`${preview.totalAmount.toFixed(6)} BNB`} sub={`${preview.recipients.length} wallet(s)`} />
        <StatTile icon="⬡" label="Contract Balance" color={THEME.color.blue} value={preview.contractBalance != null ? `${preview.contractBalance.toFixed(6)} BNB` : '—'} />
        <StatTile icon={insufficient ? '⚠' : '✓'} label="Status" color={statusColor} value={preview.sufficientBalance == null ? 'Unknown' : insufficient ? 'Insufficient' : 'Ready'} />
      </div>

      <Button
        size="lg"
        onClick={handleExecute}
        disabled={loading === 'execute' || !preview.recipients.length || insufficient}
        variant={(!preview.recipients.length || insufficient) ? 'secondary' : 'primary'}
        style={{ width: '100%', marginBottom: 20 }}
      >
        {loading === 'execute' ? 'Sending on-chain...' : !preview.recipients.length ? 'Nothing pending' : insufficient ? 'Fund the contract first' : `Execute Payout — ${preview.totalAmount.toFixed(6)} BNB`}
      </Button>

      {/* Recipients */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 14 }}>Recipients</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: THEME.font.base }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${THEME.color.border}` }}>
              {['Address', 'Amount (BNB)'].map(h => (
                <th key={h} style={{ ...thStyle, padding: '8px 0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.recipients.map(r => (
              <tr key={r.address} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '9px 0', color: '#9aa3b5', fontFamily: 'monospace' }}>{r.address.slice(0, 8)}...{r.address.slice(-4)}</td>
                <td style={{ padding: '9px 0', color: THEME.color.gold, fontWeight: 700 }}>{r.amount.toFixed(8)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!preview.recipients.length && <EmptyState icon="⇄" title="Nothing pending right now" />}

        <button className="admin-link" onClick={() => setShowBreakdown(v => !v)} style={{ marginTop: 14, fontSize: THEME.font.sm, background: 'none', border: 'none', color: THEME.color.blue, cursor: 'pointer', padding: 0, fontWeight: 600 }}>
          {showBreakdown ? '− Hide' : '+ Show'} per-investment breakdown
        </button>

        {showBreakdown && (
          <div style={{ marginTop: 12 }}>
            {preview.breakdown.map(d => (
              <div key={d.investmentId} style={{ padding: '10px 0', borderTop: '1px solid rgba(255,255,255,0.04)', fontSize: THEME.font.sm }}>
                <div style={{ color: '#9aa3b5' }}>
                  <span style={{ fontFamily: 'monospace' }}>{d.address.slice(0, 8)}...{d.address.slice(-4)}</span>
                  {' — '}{d.packageName} — ROI <span style={{ color: THEME.color.green, fontWeight: 700 }}>{d.roi.toFixed(8)} BNB</span>
                </div>
                {d.affiliates.map(a => (
                  <div key={a.level} style={{ paddingLeft: 16, color: THEME.color.textMuted, marginTop: 3 }}>
                    ↳ Level {a.level} → <span style={{ fontFamily: 'monospace' }}>{a.address.slice(0, 8)}...{a.address.slice(-4)}</span>
                    {' '}<span style={{ color: THEME.color.gold }}>+{a.commission.toFixed(8)} BNB</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* History */}
      <Card>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 14 }}>Recent Batches</div>
        {history.length === 0 ? (
          <EmptyState icon="◷" title="No payout batches executed yet" />
        ) : history.map(b => (
          <div key={b._id} className="admin-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: THEME.font.base, borderRadius: THEME.radius.sm }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge color={b.status === 'executed' ? THEME.color.green : THEME.color.red}>{b.status}</Badge>
              {b.category && <Badge color={THEME.color.blue}>{CATEGORY_LABELS[b.category] || b.category}</Badge>}
              <span style={{ color: THEME.color.textFaint }}>{new Date(b.createdAt).toLocaleString()}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: THEME.color.gold, fontWeight: 700 }}>{Number(b.totalAmount).toFixed(6)} BNB</span>
              <span style={{ color: THEME.color.textMuted }}>{b.recipientCount} wallet(s)</span>
              {b.txHash && <a href={`https://bscscan.com/tx/${b.txHash}`} target="_blank" rel="noreferrer" className="admin-link" style={{ color: THEME.color.blue, textDecoration: 'none', fontWeight: 600 }}>View ↗</a>}
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

const TICKET_STATUS_COLOR = { open: THEME.color.gold, answered: THEME.color.green, closed: THEME.color.textFaint };

function TicketsTab({ password, showMsg }) {
  const [tickets, setTickets] = useState([]);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState('');
  const [openId, setOpenId] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => { fetchTickets(); }, [status]);

  const fetchTickets = async () => {
    try { const r = await adminGetTickets(password, status); setTickets(r.data.data || []); } catch {}
  };

  const handleReply = async (id) => {
    if (!replyText.trim()) return;
    setLoading('reply-' + id);
    try {
      const r = await adminReplyTicket(id, replyText.trim(), password);
      if (!r.data.success) return showMsg(r.data.error || 'Failed', true);
      setReplyText('');
      showMsg('Reply sent');
      fetchTickets();
    } catch { showMsg('Request failed', true); }
    finally { setLoading(''); }
  };

  const handleStatus = async (id, newStatus) => {
    try {
      const r = await adminUpdateTicket(id, newStatus, password);
      if (!r.data.success) return showMsg(r.data.error || 'Failed', true);
      fetchTickets();
    } catch { showMsg('Request failed', true); }
  };

  return (
    <div className="admin-tab-panel" style={{ padding: '28px 32px', maxWidth: 920 }}>
      <SectionHeader
        title="Support Tickets"
        subtitle={`${tickets.length} ticket(s)`}
        action={
          <select
            value={status}
            onChange={e => setStatus(e.target.value)}
            style={{ ...inputStyle(), width: 160, padding: '8px 10px', fontSize: THEME.font.sm }}
          >
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="answered">Answered</option>
            <option value="closed">Closed</option>
          </select>
        }
      />

      <Card>
        {tickets.length === 0 ? (
          <EmptyState icon="✉" title="No tickets" />
        ) : tickets.map(t => (
          <div key={t._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', padding: '12px 4px' }}>
            <div
              onClick={() => setOpenId(openId === t._id ? null : t._id)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
            >
              <div>
                <div style={{ fontSize: THEME.font.md, fontWeight: 700, color: '#fff' }}>{t.subject}</div>
                <div style={{ fontSize: THEME.font.sm, color: THEME.color.textFaint, marginTop: 2, fontFamily: 'monospace' }}>
                  {t.address.slice(0, 8)}...{t.address.slice(-4)} · {new Date(t.createdAt).toLocaleString()}
                </div>
              </div>
              <Badge color={TICKET_STATUS_COLOR[t.status]}>{t.status}</Badge>
            </div>

            {openId === t._id && (
              <div style={{ marginTop: 12, paddingLeft: 4 }}>
                <div style={{ fontSize: THEME.font.base, color: '#ccc', marginBottom: 10, lineHeight: 1.6 }}>{t.message}</div>
                {t.replies.map((r, i) => (
                  <div key={i} style={{
                    padding: '8px 10px', marginBottom: 6, borderRadius: THEME.radius.sm, fontSize: THEME.font.base,
                    background: r.from === 'admin' ? 'rgba(252,213,53,0.06)' : 'rgba(255,255,255,0.03)',
                    borderLeft: `2px solid ${r.from === 'admin' ? THEME.color.gold : '#555'}`,
                  }}>
                    <div style={{ fontSize: THEME.font.xs, fontWeight: 700, color: r.from === 'admin' ? THEME.color.gold : '#888', marginBottom: 3 }}>
                      {r.from === 'admin' ? 'Admin' : 'User'} · {new Date(r.createdAt).toLocaleString()}
                    </div>
                    {r.message}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <input
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder="Reply as admin..."
                    style={{ ...inputStyle(), flex: 1, padding: '9px 12px', fontSize: THEME.font.sm }}
                  />
                  <Button size="sm" onClick={() => handleReply(t._id)} disabled={loading === 'reply-' + t._id}>Reply</Button>
                  {t.status !== 'closed' && (
                    <Button size="sm" variant="secondary" onClick={() => handleStatus(t._id, 'closed')}>Close</Button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </Card>
    </div>
  );
}

function DistributionTab({ password, showMsg }) {
  const [wallets, setWallets] = useState([]);
  const [owner, setOwner] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState({ address: '', label: '', percent: '' });
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [d, h] = await Promise.all([adminGetDistribution(password), adminDistributionHistory(password)]);
      if (d.data.success) { setWallets(d.data.data.wallets || []); setOwner(d.data.data.owner); }
      setHistory(h.data.data || []);
    } catch {}
  };

  const handleAdd = async () => {
    if (!form.address.trim() || !form.percent) return showMsg('Address and percent required', true);
    setLoading('add');
    try {
      const r = await adminAddDistributionWallet(
        { address: form.address.trim(), label: form.label.trim(), percent: Number(form.percent) },
        password
      );
      if (!r.data.success) return showMsg(r.data.error || 'Failed', true);
      setForm({ address: '', label: '', percent: '' });
      showMsg('Wallet added');
      fetchAll();
    } catch { showMsg('Request failed', true); }
    finally { setLoading(''); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this distribution wallet?')) return;
    try { await adminDeleteDistributionWallet(id, password); showMsg('Removed'); fetchAll(); }
    catch { showMsg('Failed', true); }
  };

  const handleExecute = async () => {
    const amt = Number(amount);
    if (!(amt > 0)) return showMsg('Enter a valid amount', true);
    if (!window.confirm(
      `Distribute ${amt} BNB across ${wallets.filter(w => w.active).length} active wallet(s) right now? This is a real, irreversible on-chain transaction.`
    )) return;
    setLoading('execute');
    try {
      const r = await adminExecuteDistribution(amt, password);
      if (r.data.success) {
        showMsg(`Distributed ${amt} BNB — status: ${r.data.data.status}`);
        setAmount('');
        fetchAll();
      } else {
        showMsg(r.data.error || 'Execute failed', true);
      }
    } catch { showMsg('Request failed', true); }
    finally { setLoading(''); }
  };

  const activeCount = wallets.filter(w => w.active).length;

  return (
    <div className="admin-tab-panel" style={{ padding: '28px 32px', maxWidth: 920 }}>
      <SectionHeader
        title="Distribution Wallets"
        subtitle="Admin-configurable wallets that receive a manually-triggered share of BNB from the owner wallet."
        action={<Button variant="secondary" size="sm" onClick={fetchAll}>↺ Refresh</Button>}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
        <StatTile icon="⬡" label="Owner Wallet Balance" color={THEME.color.blue} value={owner ? `${owner.balance.toFixed(6)} BNB` : '—'} sub={owner?.address ? `${owner.address.slice(0, 8)}...${owner.address.slice(-4)}` : ''} />
        <StatTile icon="⛃" label="Active Wallets" color={THEME.color.gold} value={activeCount} sub={`${wallets.length} total configured`} />
      </div>

      {/* Add wallet */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 12 }}>Add Distribution Wallet</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: 8 }}>
          <input placeholder="0x..." value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} style={{ ...inputStyle(), padding: '9px 12px', fontSize: THEME.font.sm }} />
          <input placeholder="Label (optional)" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} style={{ ...inputStyle(), padding: '9px 12px', fontSize: THEME.font.sm }} />
          <input placeholder="%" type="number" value={form.percent} onChange={e => setForm(f => ({ ...f, percent: e.target.value }))} style={{ ...inputStyle(), padding: '9px 12px', fontSize: THEME.font.sm }} />
          <Button size="sm" onClick={handleAdd} disabled={loading === 'add'}>Add</Button>
        </div>
      </Card>

      {/* Wallet list */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 14 }}>Configured Wallets</div>
        {wallets.length === 0 ? (
          <EmptyState icon="⛃" title="No distribution wallets configured" />
        ) : wallets.map(w => (
          <div key={w._id} className="admin-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: THEME.font.base }}>
            <div>
              <span style={{ fontFamily: 'monospace', color: '#9aa3b5' }}>{w.address.slice(0, 8)}...{w.address.slice(-4)}</span>
              {w.label && <span style={{ color: THEME.color.textFaint, marginLeft: 8 }}>{w.label}</span>}
              {!w.active && <Badge color={THEME.color.red}>Inactive</Badge>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: THEME.color.gold, fontWeight: 700 }}>{w.percent}%</span>
              <button className="admin-link" onClick={() => handleDelete(w._id)} style={{ background: 'none', border: 'none', color: THEME.color.red, cursor: 'pointer', fontSize: THEME.font.sm, fontWeight: 600 }}>Remove</button>
            </div>
          </div>
        ))}
      </Card>

      {/* Execute */}
      <Card style={{ marginBottom: 16 }}>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 12 }}>Execute Distribution</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Amount (BNB)" type="number" value={amount}
            onChange={e => setAmount(e.target.value)}
            style={{ ...inputStyle(), flex: 1, padding: '11px 14px' }}
          />
          <Button onClick={handleExecute} disabled={loading === 'execute' || !activeCount}>
            {loading === 'execute' ? 'Sending...' : 'Distribute'}
          </Button>
        </div>
      </Card>

      {/* History */}
      <Card>
        <div style={{ fontSize: THEME.font.md, fontWeight: 700, marginBottom: 14 }}>Recent Batches</div>
        {history.length === 0 ? (
          <EmptyState icon="◷" title="No distributions executed yet" />
        ) : history.map(b => (
          <div key={b._id} className="admin-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 4px', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: THEME.font.base }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Badge color={b.status === 'executed' ? THEME.color.green : b.status === 'partial' ? THEME.color.gold : THEME.color.red}>{b.status}</Badge>
              <span style={{ color: THEME.color.textFaint }}>{new Date(b.createdAt).toLocaleString()}</span>
            </div>
            <span style={{ color: THEME.color.gold, fontWeight: 700 }}>{Number(b.totalAmount).toFixed(6)} BNB</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

// Login screen
function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [error, setError] = useState('');
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);
  const { open } = useWeb3Modal();
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const { connectAsync, connectors } = useConnect();
  const { disconnectAsync } = useDisconnect();
  // Go straight to the browser extension wallet (MetaMask etc.) instead of the
  // multi-wallet picker modal — this is an admin-only login, not a general
  // wallet-connect flow, so skip straight to the account switcher.
  const injectedConnector = connectors.find((c) => c.id === 'injected') || connectors[0];

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

  const handleWalletLogin = async () => {
    if (!isConnected || !address) {
      setWalletLoading(true); setError('');
      try {
        if (injectedConnector) {
          await connectAsync({ connector: injectedConnector });
        } else {
          open(); // no injected wallet found — fall back to the picker (e.g. WalletConnect)
        }
      } catch (e) {
        setError(e?.shortMessage || e?.message || 'Could not connect wallet');
      } finally {
        setWalletLoading(false);
      }
      return;
    }
    setWalletLoading(true); setError('');
    try {
      const nonceRes = await adminAuthNonce(address);
      if (!nonceRes.data.success) return setError(nonceRes.data.error || 'Failed to start sign-in');

      const signature = await signMessageAsync({ message: nonceRes.data.data.message });

      const verifyRes = await adminAuthVerify(address, signature);
      if (!verifyRes.data.success) return setError(verifyRes.data.error || 'Sign-in failed');

      onLogin('', address); // wallet session is cookie-based; no password needed downstream
    } catch (e) {
      setError(e?.shortMessage || e?.message || 'Wallet sign-in failed');
    } finally {
      setWalletLoading(false);
    }
  };

  return (
    <div ref={vantaRef} style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <GlobalAdminStyles />
      <div style={{
        background: 'rgba(8,11,16,0.85)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(252,213,53,0.15)', borderRadius: THEME.radius.xl,
        padding: '44px 38px', width: 380, position: 'relative', zIndex: 1,
        boxShadow: '0 0 60px rgba(252,213,53,0.08), 0 24px 60px rgba(0,0,0,0.5)',
        animation: 'adminFadeIn 0.4s cubic-bezier(0.22,1,0.36,1) both',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, margin: '0 auto 14px', borderRadius: THEME.radius.lg,
            background: 'rgba(252,213,53,0.1)', border: '1px solid rgba(252,213,53,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, boxShadow: '0 0 24px rgba(252,213,53,0.15)',
          }}>⚙</div>
          <div style={{ fontSize: 21, fontWeight: 900, color: THEME.color.gold, textShadow: '0 0 20px rgba(252,213,53,0.5)', letterSpacing: '-0.3px' }}>
            ALPHA<span style={{ color: '#fff' }}>NODES</span>
          </div>
          <div style={{ fontSize: THEME.font.base, color: THEME.color.textFaint, marginTop: 5, letterSpacing: 0.5 }}>Admin Panel</div>
        </div>
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: THEME.radius.sm, marginBottom: 14, fontSize: THEME.font.md, background: 'rgba(255,77,77,0.1)', color: THEME.color.red, border: '1px solid rgba(255,77,77,0.2)' }}>
            {error}
          </div>
        )}
        <Button
          onClick={handleWalletLogin}
          disabled={walletLoading}
          size="lg"
          style={{ width: '100%', marginBottom: 18, boxShadow: '0 0 20px rgba(252,213,53,0.3)' }}
        >
          {walletLoading ? 'Confirm in wallet...' : isConnected ? 'Sign In With Wallet' : 'Connect Wallet'}
        </Button>
        {isConnected && (
          <div style={{ textAlign: 'center', marginBottom: 18 }}>
            <span style={{ fontSize: THEME.font.sm, color: THEME.color.textFaint, fontFamily: 'monospace' }}>
              {address.slice(0, 8)}...{address.slice(-4)}
            </span>
            <button
              onClick={async () => { await disconnectAsync(); setError(''); }}
              style={{
                display: 'block', margin: '6px auto 0', fontSize: THEME.font.xs, color: THEME.color.blue,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 600,
              }}
            >
              Not the right wallet? Switch
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: THEME.font.sm, color: THEME.color.textFaint }}>or use password</span>
          <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
        </div>

        <input
          className="admin-input"
          type="password" placeholder="Admin password"
          value={password} onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={inputStyle({ border: '1px solid rgba(252,213,53,0.2)', padding: '13px 14px', fontSize: 14, marginBottom: 14 })}
        />
        <Button onClick={handleLogin} disabled={loading} variant="secondary" size="lg" style={{ width: '100%' }}>
          {loading ? 'Verifying...' : 'Login'}
        </Button>
      </div>
    </div>
  );
}

export default function AdminPanel() {
  const [password, setPassword] = useState('');
  const [authed, setAuthed] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [adminAddress, setAdminAddress] = useState(null);
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [page, setPage] = useState(1);
  const [withdrawals, setWithdrawals] = useState([]);
  const [wStatus, setWStatus] = useState('pending');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');
  const [search, setSearch] = useState('');
  const [fundsModal, setFundsModal] = useState(null); // { address }
  const [fundsField, setFundsField] = useState('tradingBalance');
  const [fundsAmount, setFundsAmount] = useState('');
  const [fundsMsg, setFundsMsg] = useState('');
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);

  // Restore a wallet-login session across page refreshes (the old password-only
  // auth had no persistence at all — this is new).
  useEffect(() => {
    adminAuthSession()
      .then((r) => {
        if (r.data?.data?.authed) {
          setAdminAddress(r.data.data.address);
          setAuthed(true);
        }
      })
      .catch(() => {})
      .finally(() => setCheckingSession(false));
  }, []);

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

  const openFundsModal = (address) => {
    setFundsModal({ address });
    setFundsField('tradingBalance');
    setFundsAmount('');
    setFundsMsg('');
  };

  const closeFundsModal = () => { setFundsModal(null); setFundsMsg(''); };

  const handleAddFunds = async () => {
    const amount = parseFloat(fundsAmount);
    if (!fundsModal?.address || isNaN(amount) || amount === 0) {
      setFundsMsg('Enter a valid non-zero amount');
      return;
    }
    setLoading('funds');
    setFundsMsg('');
    try {
      const r = await adminCredit({ address: fundsModal.address, field: fundsField, amount }, password);
      if (r.data.success) {
        showMsg(`${amount > 0 ? 'Added' : 'Deducted'} ${Math.abs(amount)} BNB`);
        fetchAccounts(page);
        closeFundsModal();
      } else {
        setFundsMsg(r.data.error || 'Failed');
      }
    } catch { setFundsMsg('Request failed'); }
    finally { setLoading(''); }
  };

  if (checkingSession) return null;

  if (!authed) {
    return <LoginScreen onLogin={(pwd, walletAddress) => { setPassword(pwd); if (walletAddress) setAdminAddress(walletAddress); setAuthed(true); }} />;
  }

  const s = stats || {};
  const bnbPrice = s.bnbPrice || 600;
  const toUSDT = (bnb) => (bnb * bnbPrice).toFixed(2);

  const filteredAccounts = accounts.filter(a => !search || a.address?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#080b10', color: '#fff', fontFamily: "'Inter', sans-serif" }}>
      <GlobalAdminStyles />

      {/* Sidebar */}
      <aside style={{
        width: 208, background: 'rgba(10,13,20,0.97)', borderRight: '1px solid rgba(252,213,53,0.08)',
        display: 'flex', flexDirection: 'column', position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100,
      }}>
        {/* Header */}
        <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid rgba(252,213,53,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: THEME.radius.sm, flexShrink: 0,
              background: 'linear-gradient(135deg, rgba(252,213,53,0.2), rgba(245,158,11,0.08))',
              border: '1px solid rgba(252,213,53,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: THEME.color.gold,
            }}>◎</div>
            <div>
              <div style={{ fontSize: THEME.font.md, fontWeight: 800, color: THEME.color.gold, textShadow: '0 0 12px rgba(252,213,53,0.4)', lineHeight: 1.2 }}>Admin Panel</div>
              <div style={{ fontSize: 9, color: THEME.color.textFaint, letterSpacing: 0.6 }}>AlphaNodes</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="admin-scroll" style={{ flex: 1, padding: '14px 0', overflowY: 'auto' }}>
          {Object.entries(SIDEBAR).map(([section, items]) => (
            <div key={section} style={{ marginBottom: 6 }}>
              <div style={{ padding: '10px 18px 6px', fontSize: 9, color: THEME.color.textFaint, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase' }}>
                {section}
              </div>
              {items.map(item => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    className={`admin-nav-btn${active ? ' admin-nav-btn--active' : ''}`}
                    onClick={() => setTab(item.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      width: '100%', padding: '9px 18px', textAlign: 'left',
                      background: active ? 'rgba(252,213,53,0.1)' : 'transparent',
                      borderLeft: active ? `2px solid ${THEME.color.gold}` : '2px solid transparent',
                      border: 'none', borderLeftWidth: 2, borderLeftStyle: 'solid',
                      color: active ? THEME.color.gold : THEME.color.textMuted,
                      fontSize: THEME.font.base, fontWeight: 600, cursor: 'pointer',
                      textShadow: active ? '0 0 10px rgba(252,213,53,0.3)' : 'none',
                    }}
                  >
                    <span style={{ fontSize: 13, width: 14, textAlign: 'center' }}>{item.icon}</span>
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* System */}
        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(252,213,53,0.08)' }}>
          <div style={{ fontSize: 9, color: THEME.color.textFaint, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 }}>System</div>
          <Badge color={THEME.color.green}>Connected</Badge>
          {adminAddress && (
            <div style={{ fontSize: THEME.font.xs, color: THEME.color.textFaint, fontFamily: 'monospace', marginTop: 8 }}>
              {adminAddress.slice(0, 8)}...{adminAddress.slice(-4)}
            </div>
          )}
          <button
            className="admin-link"
            onClick={async () => { try { await adminAuthLogout(); } catch {} setAuthed(false); setAdminAddress(null); }}
            style={{ display: 'block', marginTop: 12, fontSize: THEME.font.xs, color: THEME.color.red, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700 }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main */}
      <div style={{ marginLeft: 208, flex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>

        {/* Message */}
        {msg && (
          <div style={{
            position: 'fixed', top: 18, right: 18, zIndex: 200,
            padding: '11px 18px', borderRadius: THEME.radius.md, fontSize: THEME.font.md, fontWeight: 600,
            background: msg.err ? 'rgba(255,77,77,0.15)' : 'rgba(0,192,118,0.15)',
            border: `1px solid ${msg.err ? 'rgba(255,77,77,0.3)' : 'rgba(0,192,118,0.3)'}`,
            color: msg.err ? THEME.color.red : THEME.color.green,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            animation: 'adminFadeIn 0.2s ease both',
          }}>
            {msg.text}
          </div>
        )}

        {/* Overview */}
        {(tab === 'overview' || tab === 'earnings' || tab === 'referrals' || tab === 'cycles') && (
          <div className="admin-tab-panel" style={{ padding: '28px 32px' }}>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
              <StatTile icon="◎" label="Total Users" color={THEME.color.blue2} value={s.totalUsers || 0} />
              <StatTile icon="$" label="Total Deposits" color={THEME.color.green} value={`${fmtBig(toUSDT(s.totalDeposited))} USDT`} />
              <StatTile icon="↗" label="Active AI" color={THEME.color.purple} value={s.activeAI || s.activeInvestments || 0} />
              <StatTile icon="⊠" label="Withdrawals" color={THEME.color.gold} value={`${fmtBig(toUSDT(s.totalWithdrawn))} USDT`} />
            </div>

            {/* Active Investments */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: THEME.font.lg, fontWeight: 700, marginBottom: 14, color: '#dfe3ea' }}>Active Investments</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {[
                  { label: 'AI Agents', value: s.activeAI || s.activeInvestments || 0, icon: '◈' },
                  { label: 'Stakes', value: s.activeStakes || 0, icon: '◎' },
                  { label: 'Copy Trades', value: s.activeCopyTrades || 0, icon: '⊡' },
                ].map(item => (
                  <div key={item.label} className="admin-card admin-card--hoverable" style={{
                    background: THEME.color.panelAlt, border: '1px solid rgba(252,213,53,0.08)',
                    borderRadius: THEME.radius.lg, padding: '24px', textAlign: 'center',
                    backdropFilter: 'blur(8px)',
                  }}>
                    <div style={{ fontSize: 26, color: THEME.color.gold, marginBottom: 8, textShadow: '0 0 16px rgba(252,213,53,0.4)' }}>{item.icon}</div>
                    <div style={{ fontSize: 28, fontWeight: 900 }}>{item.value}</div>
                    <div style={{ fontSize: THEME.font.base, color: THEME.color.textMuted, marginTop: 4 }}>{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Platform Totals — with Vanta background */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: THEME.font.lg, fontWeight: 700, marginBottom: 14, color: '#dfe3ea' }}>Platform Totals</div>
              <div ref={vantaRef} style={{ borderRadius: THEME.radius.lg, overflow: 'hidden', position: 'relative', minHeight: 160, border: `1px solid ${THEME.color.border}` }}>
                <div style={{
                  position: 'relative', zIndex: 1,
                  background: 'rgba(8,11,16,0.7)', backdropFilter: 'blur(4px)',
                  margin: '0 0', padding: '24px 28px',
                }}>
                  {[
                    { label: 'Total Trading Balance', value: `${fmtBig(toUSDT(s.totalTradingBalance || s.platformBalance))} USDT`, color: '#fff' },
                    { label: 'Total Earnings Paid', value: `${fmtBig(toUSDT(s.totalEarningsPaid || s.totalWithdrawn))} USDT`, color: THEME.color.green },
                    { label: 'Total Staked', value: `${fmtBig(toUSDT(s.totalStaked))} USDT`, color: THEME.color.blue2 },
                    { label: 'Pending Withdrawals', value: s.pendingWithdrawals || 0, color: THEME.color.gold },
                  ].map((row, i, arr) => (
                    <div key={row.label} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                    }}>
                      <span style={{ fontSize: THEME.font.md, color: '#9aa3b5' }}>{row.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: row.color }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <div style={{ fontSize: THEME.font.lg, fontWeight: 700, marginBottom: 14, color: '#dfe3ea' }}>Quick Actions</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'Manage Users', icon: '◎', action: () => setTab('accounts') },
                  { label: 'Withdrawals', icon: '⊠', action: () => setTab('withdrawals') },
                  { label: 'Refresh', icon: '↺', action: fetchStats },
                ].map(btn => (
                  <Button key={btn.label} variant="secondary" onClick={btn.action} style={{ color: THEME.color.gold, background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.2)' }}>
                    <span>{btn.icon}</span> {btn.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Accounts tab */}
        {tab === 'accounts' && (
          <div className="admin-tab-panel" style={{ padding: '28px 32px' }}>
            <SectionHeader title="Accounts" />
            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              <input
                className="admin-input"
                type="text" placeholder="Search by address..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={inputStyle({ flex: 1, borderColor: 'rgba(252,213,53,0.15)' })}
              />
              <Button variant="secondary" onClick={() => fetchAccounts(1)} style={{ color: THEME.color.gold, background: 'rgba(252,213,53,0.1)', border: '1px solid rgba(252,213,53,0.2)' }}>Refresh</Button>
            </div>
            <div style={tableWrapStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: THEME.font.base }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${THEME.color.border}` }}>
                    {['Address', 'Balance (BNB)', 'Deposited', 'Withdrawn', 'Status', 'Actions'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map(acc => {
                    const bal = acc.balance || {};
                    return (
                    <tr key={acc.address} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ ...tdStyle, color: '#9aa3b5', fontFamily: 'monospace' }}>
                        {acc.address?.slice(0, 8)}...{acc.address?.slice(-4)}
                      </td>
                      <td style={{ ...tdStyle, color: THEME.color.gold, fontWeight: 700 }}>
                        {Number(bal.tradingBalance || 0).toFixed(4)}
                      </td>
                      <td style={{ ...tdStyle, color: THEME.color.green }}>
                        {Number(bal.totalDeposited || 0).toFixed(4)}
                      </td>
                      <td style={{ ...tdStyle, color: THEME.color.red }}>
                        {Number(bal.totalWithdrawn || 0).toFixed(4)}
                      </td>
                      <td style={tdStyle}>
                        <Badge color={acc.isSuspended ? THEME.color.red : THEME.color.green}>{acc.isSuspended ? 'Suspended' : 'Active'}</Badge>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button
                            variant={acc.isSuspended ? 'success' : 'danger'} size="sm"
                            onClick={() => handleUpdateAccount(acc.address, 'isSuspended', !acc.isSuspended)}
                            disabled={loading === 'acc_' + acc.address}
                            style={{ fontSize: 10, padding: '4px 10px' }}
                          >{acc.isSuspended ? 'Unsuspend' : 'Suspend'}</Button>
                          <Button
                            variant="secondary" size="sm"
                            onClick={() => handleUpdateAccount(acc.address, 'withdrawalsBlocked', !acc.withdrawalsBlocked)}
                            disabled={loading === 'acc_' + acc.address}
                            style={{ fontSize: 10, padding: '4px 10px', color: THEME.color.gold, background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.15)' }}
                          >{acc.withdrawalsBlocked ? 'Unblock' : 'Block W.'}</Button>
                          <Button
                            variant="success" size="sm"
                            onClick={() => openFundsModal(acc.address)}
                            style={{ fontSize: 10, padding: '4px 10px' }}
                          >+ Funds</Button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredAccounts.length === 0 && <EmptyState icon="◎" title="No accounts found" />}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
              <Button variant="secondary" size="sm" onClick={() => fetchAccounts(page - 1)} disabled={page <= 1} style={{ color: THEME.color.gold, background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.15)' }}>Previous</Button>
              <span style={{ padding: '6px 14px', fontSize: THEME.font.base, color: THEME.color.textMuted }}>Page {page}</span>
              <Button variant="secondary" size="sm" onClick={() => fetchAccounts(page + 1)} disabled={accounts.length < 20} style={{ color: THEME.color.gold, background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.15)' }}>Next</Button>
            </div>
          </div>
        )}

        {/* Withdrawals tab */}
        {tab === 'withdrawals' && (
          <div className="admin-tab-panel" style={{ padding: '28px 32px' }}>
            <SectionHeader title="Withdrawals" />
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {['pending', 'completed', 'rejected'].map(s => (
                <Button
                  key={s} size="sm" onClick={() => setWStatus(s)}
                  variant={wStatus === s ? 'primary' : 'secondary'}
                  style={wStatus === s ? {} : { color: THEME.color.textMuted, background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.15)' }}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </Button>
              ))}
            </div>
            <div style={tableWrapStyle}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: THEME.font.base }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${THEME.color.border}` }}>
                    {['Address', 'Amount (BNB)', 'USDT Value', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {withdrawals.map(w => (
                    <tr key={w._id} className="admin-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ ...tdStyle, color: '#9aa3b5', fontFamily: 'monospace' }}>{w.address?.slice(0, 8)}...{w.address?.slice(-4)}</td>
                      <td style={{ ...tdStyle, color: THEME.color.gold, fontWeight: 700 }}>{Number(w.amount || 0).toFixed(4)}</td>
                      <td style={{ ...tdStyle, color: THEME.color.green }}>{toUSDT(w.amount)} USDT</td>
                      <td style={{ ...tdStyle, color: THEME.color.textFaint }}>{new Date(w.createdAt).toLocaleDateString()}</td>
                      <td style={tdStyle}>
                        <Badge color={w.status === 'pending' ? THEME.color.gold : w.status === 'completed' ? THEME.color.green : THEME.color.red}>{w.status}</Badge>
                      </td>
                      <td style={tdStyle}>
                        {w.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <Button variant="success" size="sm" onClick={() => handleUpdateWithdrawal(w._id, 'approved')} disabled={loading === 'w_' + w._id} style={{ fontSize: 10, padding: '4px 10px' }}>Approve</Button>
                            <Button variant="danger" size="sm" onClick={() => handleUpdateWithdrawal(w._id, 'rejected')} disabled={loading === 'w_' + w._id} style={{ fontSize: 10, padding: '4px 10px' }}>Reject</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {withdrawals.length === 0 && <EmptyState icon="⊠" title={`No ${wStatus} withdrawals`} />}
            </div>
          </div>
        )}

        {tab === 'traders' && <TradersTab password={password} showMsg={showMsg} />}
        {tab === 'investments' && <InvestmentsTab password={password} showMsg={showMsg} />}
        {tab === 'ai-rates' && <AiRatesTab password={password} showMsg={showMsg} />}
        {tab === 'payouts' && <PayoutsTab password={password} showMsg={showMsg} />}
        {tab === 'tickets' && <TicketsTab password={password} showMsg={showMsg} />}
        {tab === 'distribution' && <DistributionTab password={password} showMsg={showMsg} />}
        {tab === 'stakes' && <StakesTab password={password} showMsg={showMsg} />}
        {tab === 'contract' && <ContractTab password={password} showMsg={showMsg} />}
        {tab === 'platform' && <PlatformTab password={password} showMsg={showMsg} />}

        {/* Placeholder tabs */}
        {['copytrades'].includes(tab) && (
          <div className="admin-tab-panel" style={{ padding: '28px 32px' }}>
            <SectionHeader title="Copy Trades" />
            <EmptyState icon="⊡" title="Coming soon" />
          </div>
        )}
      </div>

      {/* Add Funds Modal */}
      {fundsModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={closeFundsModal}>
          <div style={{
            background: '#0e1118', border: '1px solid rgba(252,213,53,0.2)',
            borderRadius: THEME.radius.lg, padding: '28px 28px', width: 380,
            boxShadow: '0 24px 60px rgba(0,0,0,0.6)',
            animation: 'adminFadeIn 0.22s cubic-bezier(0.22,1,0.36,1) both',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: THEME.font.lg, fontWeight: 800, marginBottom: 4 }}>Add / Deduct Funds</div>
            <div style={{ fontSize: THEME.font.sm, color: THEME.color.textFaint, marginBottom: 20, fontFamily: 'monospace' }}>
              {fundsModal.address}
            </div>

            <div style={{ marginBottom: 14 }}>
              <FormField label="Balance Field">
                <select
                  className="admin-input"
                  value={fundsField}
                  onChange={e => setFundsField(e.target.value)}
                  style={inputStyle({ border: '1px solid rgba(252,213,53,0.2)' })}
                >
                  <option value="tradingBalance">Trading Balance</option>
                  <option value="aiEarnings">AI Earnings</option>
                  <option value="stakingEarnings">Staking Earnings</option>
                  <option value="referralEarnings">Referral Earnings</option>
                </select>
              </FormField>
            </div>

            <div style={{ marginBottom: 8 }}>
              <FormField label="Amount (BNB) — negative to deduct">
                <input
                  className="admin-input"
                  type="number" step="any" placeholder="e.g. 0.5 or -0.1"
                  value={fundsAmount}
                  onChange={e => setFundsAmount(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddFunds()}
                  style={inputStyle({ border: '1px solid rgba(252,213,53,0.2)' })}
                />
              </FormField>
            </div>

            {fundsMsg && (
              <div style={{ fontSize: THEME.font.base, color: THEME.color.red, marginBottom: 10 }}>{fundsMsg}</div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Button variant="success" onClick={handleAddFunds} disabled={loading === 'funds'} style={{ flex: 1 }}>
                {loading === 'funds' ? 'Sending...' : 'Confirm'}
              </Button>
              <Button variant="secondary" onClick={closeFundsModal} style={{ flex: 1 }}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
