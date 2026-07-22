import { useState, useEffect, useRef } from 'react';
import {
  adminVerify, adminStats, adminAccounts, adminUpdateAccount,
  adminWithdrawals, adminUpdateWithdrawal, adminCredit,
  adminGetTraders, adminCreateTrader, adminUpdateTrader, adminDeleteTrader,
  adminContractInfo, adminFundContract, adminSetPaused, adminEmergencyWithdraw, adminSetTreasury,
  adminGetInvestments, adminManageInvestment, adminGetStakes, adminGetPlatform, adminSetPlatform,
  adminGetAiRates, adminSetAiRates,
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
    { id: 'stakes', label: 'Stakes', icon: '⊟' },
    { id: 'copytrades', label: 'Copy Trades', icon: '⊡' },
    { id: 'withdrawals', label: 'Withdrawals', icon: '⊠' },
  ],
  SYSTEM: [
    { id: 'contract', label: 'Contract', icon: '⬡' },
    { id: 'platform', label: 'Platform', icon: '⚙' },
  ],
};

const EMPTY_TRADER = { name: '', avatar: '', roiPercent: '', dailyRate: '', winRate: '', totalTrades: '', followers: '', aum: '', minCopyAmount: '0.01', description: '', strategy: '', active: true };

const ROI_COLOR = (roi) => roi >= 20 ? '#00c076' : roi >= 10 ? '#fcd535' : '#3b9eff';

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

  const inp = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box', transition: 'border-color 0.2s' };
  const lbl = { fontSize: 10, color: '#556', marginBottom: 5, display: 'block', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' };

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px' }}>Copy Traders</div>
          <div style={{ fontSize: 12, color: '#445', marginTop: 3 }}>{traders.length} traders · {traders.filter(t=>t.active).length} active</div>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', background: 'linear-gradient(135deg,#fcd535,#f59e0b)', color: '#0d0d0d', fontWeight: 800, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13, boxShadow: '0 4px 16px rgba(252,213,53,0.3)' }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add Trader
        </button>
      </div>

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
                        {!t.active && <span style={{ fontSize: 10, color: '#ff4d4d', background: 'rgba(255,77,77,0.1)', padding: '2px 7px', borderRadius: 5, fontWeight: 700 }}>Inactive</span>}
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
          <div style={{ gridColumn:'1/-1', padding:56, textAlign:'center', color:'#334', background:'rgba(10,12,18,0.8)', borderRadius:20, border:'1px dashed rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize:36, marginBottom:14, opacity:0.2 }}>◈</div>
            <div style={{ fontSize:15, fontWeight:800, marginBottom:8, color:'#445' }}>No traders yet</div>
            <div style={{ fontSize:12, color:'#334' }}>Click "+ Add Trader" to create your first copy trader profile</div>
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

  const card = { background:'rgba(12,14,20,0.95)',borderRadius:16,border:'1px solid rgba(255,255,255,0.06)',padding:'24px',marginBottom:16 };
  const inp = { background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'10px 14px',color:'#fff',fontSize:13,outline:'none',width:'100%',boxSizing:'border-box' };
  const lbl = { fontSize:10,color:'#556',marginBottom:6,display:'block',fontWeight:700,letterSpacing:1,textTransform:'uppercase' };

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
    <div style={{ padding:'28px 32px',maxWidth:680 }}>
      <div style={{ fontSize:20,fontWeight:800,letterSpacing:'-0.5px',marginBottom:6 }}>Contract</div>
      <div style={{ fontSize:12,color:'#445',marginBottom:24 }}>BSC Mainnet · Smart contract management</div>

      {/* Info cards */}
      <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16 }}>
        {[
          { label:'Contract Balance', value: info?.balance != null ? `${Number(info.balance).toFixed(4)} BNB` : '—', color:'#fcd535', icon:'⬡' },
          { label:'Network', value:'BSC Mainnet', color:'#00c076', icon:'🔗' },
        ].map(s => (
          <div key={s.label} style={{ background:`${s.color}08`,border:`1px solid ${s.color}18`,borderRadius:14,padding:'18px 20px',display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ fontSize:24 }}>{s.icon}</div>
            <div>
              <div style={{ fontSize:18,fontWeight:800,color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11,color:'#445',marginTop:2 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Address */}
      <div style={{ ...card }}>
        <div style={{ fontSize:13,fontWeight:700,marginBottom:14 }}>Contract Address</div>
        <div style={{ display:'flex',alignItems:'center',gap:10 }}>
          <code style={{ flex:1,fontSize:12,color:'#fcd535',background:'rgba(252,213,53,0.06)',padding:'10px 14px',borderRadius:10,wordBreak:'break-all',border:'1px solid rgba(252,213,53,0.12)' }}>{CONTRACT_ADDR}</code>
          <button onClick={() => navigator.clipboard.writeText(CONTRACT_ADDR)} style={{ flexShrink:0,padding:'10px 14px',background:'rgba(252,213,53,0.08)',border:'1px solid rgba(252,213,53,0.2)',borderRadius:10,color:'#fcd535',cursor:'pointer',fontSize:12,fontWeight:700 }}>Copy</button>
          <a href={`https://bscscan.com/address/${CONTRACT_ADDR}`} target="_blank" rel="noreferrer" style={{ flexShrink:0,padding:'10px 14px',background:'rgba(59,158,255,0.08)',border:'1px solid rgba(59,158,255,0.2)',borderRadius:10,color:'#3b9eff',fontSize:12,fontWeight:700,textDecoration:'none' }}>BSCScan ↗</a>
        </div>
      </div>

      {/* Fund contract */}
      <div style={{ ...card }}>
        <div style={{ fontSize:13,fontWeight:700,marginBottom:4 }}>Fund Contract</div>
        <div style={{ fontSize:12,color:'#445',marginBottom:16 }}>Send BNB from the owner wallet to fund user withdrawals.</div>
        <label style={lbl}>Amount (BNB)</label>
        <div style={{ display:'flex',gap:10 }}>
          <input style={{ ...inp,flex:1 }} type="number" value={fundAmt} onChange={e=>setFundAmt(e.target.value)} placeholder="e.g. 1.0" step="0.01" />
          <button onClick={handleFund} disabled={loading==='fund'} style={{ flexShrink:0,padding:'10px 20px',background:'linear-gradient(135deg,#fcd535,#f59e0b)',color:'#0d0d0d',fontWeight:800,border:'none',borderRadius:10,cursor:'pointer',fontSize:13,opacity:loading==='fund'?0.6:1 }}>
            {loading==='fund'?'Sending...':'Fund'}
          </button>
        </div>
        <Msg k="fund" />
      </div>

      {/* Pause / Unpause */}
      <div style={{ ...card }}>
        <div style={{ fontSize:13,fontWeight:700,marginBottom:4 }}>Pause / Unpause Contract</div>
        <div style={{ fontSize:12,color:'#445',marginBottom:16 }}>Pausing blocks all on-chain deposits and withdrawals.</div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={() => handlePause(true)} disabled={loading==='pause'} style={{ flex:1,padding:'11px',background:'rgba(255,77,77,0.08)',border:'1px solid rgba(255,77,77,0.2)',borderRadius:10,color:'#ff4d4d',fontWeight:700,cursor:'pointer',fontSize:13 }}>
            ⏸ Pause Contract
          </button>
          <button onClick={() => handlePause(false)} disabled={loading==='pause'} style={{ flex:1,padding:'11px',background:'rgba(0,192,118,0.08)',border:'1px solid rgba(0,192,118,0.2)',borderRadius:10,color:'#00c076',fontWeight:700,cursor:'pointer',fontSize:13 }}>
            ▶ Unpause Contract
          </button>
        </div>
        <Msg k="pause" />
      </div>

      {/* Treasury wallet */}
      <div style={{ ...card }}>
        <div style={{ fontSize:13,fontWeight:700,marginBottom:4 }}>Treasury Wallet</div>
        <div style={{ fontSize:12,color:'#445',marginBottom:16 }}>Change the wallet address that receives funds from emergency withdrawals.</div>
        <label style={lbl}>New Treasury Address</label>
        <div style={{ display:'flex',gap:10 }}>
          <input style={{ ...inp,flex:1,fontFamily:'monospace',fontSize:12 }} type="text" value={treasuryAddr} onChange={e=>setTreasuryAddr(e.target.value)} placeholder="0x..." />
          <button onClick={handleSetTreasury} disabled={loading==='treasury'} style={{ flexShrink:0,padding:'10px 20px',background:'linear-gradient(135deg,#3b9eff,#2563eb)',color:'#fff',fontWeight:800,border:'none',borderRadius:10,cursor:'pointer',fontSize:13,opacity:loading==='treasury'?0.6:1 }}>
            {loading==='treasury'?'Setting...':'Set Wallet'}
          </button>
        </div>
        <Msg k="treasury" />
      </div>

      {/* Emergency */}
      <div style={{ ...card,border:'1px solid rgba(255,77,77,0.12)' }}>
        <div style={{ fontSize:13,fontWeight:700,marginBottom:4,color:'#ff4d4d' }}>⚠ Emergency Withdraw</div>
        <div style={{ fontSize:12,color:'#445',marginBottom:16 }}>Transfers ALL contract BNB to the treasury wallet. Use only in emergencies — this cannot be undone.</div>
        <button onClick={handleEmergency} disabled={loading==='emergency'} style={{ padding:'11px 24px',background:'rgba(255,77,77,0.1)',border:'1px solid rgba(255,77,77,0.25)',borderRadius:10,color:'#ff4d4d',fontWeight:800,cursor:'pointer',fontSize:13 }}>
          {loading==='emergency'?'Processing...':'Emergency Withdraw'}
        </button>
        <Msg k="emergency" />
      </div>
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

  const STATUS_COLOR = { active: '#00c076', claimed: '#3b9eff', cancelled: '#ff4d4d' };

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>AI Investments</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by address..."
          style={{ flex: 1, minWidth: 200, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(252,213,53,0.15)', borderRadius: 8, padding: '9px 14px', color: '#fff', fontSize: 13, outline: 'none' }} />
        <select value={status} onChange={e => setStatus(e.target.value)}
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(252,213,53,0.15)', borderRadius: 8, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none' }}>
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="claimed">Claimed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button onClick={fetch} style={{ padding: '9px 16px', background: 'rgba(252,213,53,0.1)', border: '1px solid rgba(252,213,53,0.2)', borderRadius: 8, color: '#fcd535', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Search</button>
      </div>
      <div style={{ background: 'rgba(12,14,20,0.95)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Address','Package','Amount','Daily Rate','End Date','Claimed','Status','Actions'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#445', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {investments.map(inv => (
              <tr key={inv._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                <td style={{ padding: '11px 14px', color: '#889', fontFamily: 'monospace' }}>{inv.address?.slice(0,8)}...{inv.address?.slice(-4)}</td>
                <td style={{ padding: '11px 14px', color: '#ccc' }}>{inv.packageName}</td>
                <td style={{ padding: '11px 14px', color: '#fcd535', fontWeight: 700 }}>{Number(inv.amount||0).toFixed(4)} BNB</td>
                <td style={{ padding: '11px 14px', color: '#aaa' }}>{((inv.dailyRateBps||0)/100).toFixed(1)}%</td>
                <td style={{ padding: '11px 14px', color: '#667' }}>{inv.endDate ? new Date(inv.endDate).toLocaleDateString() : '—'}</td>
                <td style={{ padding: '11px 14px', color: '#00c076' }}>{Number(inv.claimedEarnings||0).toFixed(4)} BNB</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, fontWeight: 700, background: `${STATUS_COLOR[inv.status]||'#667'}18`, color: STATUS_COLOR[inv.status]||'#667' }}>{inv.status}</span>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  {inv.status === 'active' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => manage(inv._id, 'complete')} disabled={loading===inv._id+'complete'} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', background: 'rgba(0,192,118,0.1)', border: '1px solid rgba(0,192,118,0.2)', color: '#00c076', fontWeight: 700 }}>Complete</button>
                      <button onClick={() => manage(inv._id, 'cancel')} disabled={loading===inv._id+'cancel'} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 5, cursor: 'pointer', background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', color: '#ff4d4d', fontWeight: 700 }}>Cancel</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {investments.length === 0 && <div style={{ padding: 32, color: '#445', fontSize: 13, textAlign: 'center' }}>No investments found</div>}
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

  const STATUS_COLOR = { active: '#00c076', completed: '#3b9eff', earlyUnlocked: '#fcd535' };

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Stakes</div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key==='Enter' && fetch()} placeholder="Enter wallet address..."
          style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(252,213,53,0.15)', borderRadius: 8, padding: '9px 14px', color: '#fff', fontSize: 13, outline: 'none' }} />
        <button onClick={fetch} style={{ padding: '9px 16px', background: 'rgba(252,213,53,0.1)', border: '1px solid rgba(252,213,53,0.2)', borderRadius: 8, color: '#fcd535', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>Search</button>
      </div>
      <div style={{ background: 'rgba(12,14,20,0.95)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              {['Address','Amount','Duration','Daily Rate','End Date','Earnings','Status'].map(h => (
                <th key={h} style={{ padding: '12px 14px', textAlign: 'left', color: '#445', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {stakes.map(s => {
              const statusKey = s.status || (s.earlyUnlocked ? 'earlyUnlocked' : s.active ? 'active' : 'completed');
              return (
                <tr key={s._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <td style={{ padding: '11px 14px', color: '#889', fontFamily: 'monospace' }}>{s.address?.slice(0,8)}...{s.address?.slice(-4)}</td>
                  <td style={{ padding: '11px 14px', color: '#fcd535', fontWeight: 700 }}>{Number(s.amount||0).toFixed(4)} BNB</td>
                  <td style={{ padding: '11px 14px', color: '#aaa' }}>{s.durationDays || '—'} days</td>
                  <td style={{ padding: '11px 14px', color: '#aaa' }}>{((s.dailyRateBps||0)/100).toFixed(1)}%</td>
                  <td style={{ padding: '11px 14px', color: '#667' }}>{s.endDate ? new Date(s.endDate).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '11px 14px', color: '#00c076' }}>{Number(s.claimedEarnings||0).toFixed(4)} BNB</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 10, padding: '3px 8px', borderRadius: 5, fontWeight: 700, background: `${STATUS_COLOR[statusKey]||'#667'}18`, color: STATUS_COLOR[statusKey]||'#667' }}>{statusKey}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {stakes.length === 0 && <div style={{ padding: 32, color: '#445', fontSize: 13, textAlign: 'center' }}>Enter a wallet address to search stakes</div>}
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

  const card = { background: 'rgba(12,14,20,0.95)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: 24, marginBottom: 16, maxWidth: 600 };
  const inp = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Platform Control</div>
      <div style={{ fontSize: 12, color: '#445', marginBottom: 24 }}>Manage platform-wide settings and maintenance mode</div>

      <div style={{ ...card }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Platform Status</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: paused ? '#ff4d4d' : '#00c076', boxShadow: `0 0 8px ${paused ? '#ff4d4d' : '#00c076'}` }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: paused ? '#ff4d4d' : '#00c076' }}>{paused ? 'Paused' : 'Running'}</span>
            </div>
            <div style={{ fontSize: 11, color: '#445', marginTop: 4 }}>{paused ? 'Deposits and new investments are blocked' : 'All features active'}</div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => handlePause(true)} disabled={paused || loading==='pause'} style={{ padding: '10px 18px', background: 'rgba(255,77,77,0.08)', border: '1px solid rgba(255,77,77,0.2)', borderRadius: 10, color: '#ff4d4d', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: paused ? 0.4 : 1 }}>⏸ Pause</button>
            <button onClick={() => handlePause(false)} disabled={!paused || loading==='pause'} style={{ padding: '10px 18px', background: 'rgba(0,192,118,0.08)', border: '1px solid rgba(0,192,118,0.2)', borderRadius: 10, color: '#00c076', fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: !paused ? 0.4 : 1 }}>▶ Resume</button>
          </div>
        </div>
      </div>

      <div style={{ ...card }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Maintenance Message</div>
        <div style={{ fontSize: 12, color: '#445', marginBottom: 14 }}>Shown to users when the platform is paused.</div>
        <input style={inp} value={message} onChange={e => setMessage(e.target.value)} placeholder="e.g. Platform under maintenance. Back soon."
          onFocus={e=>e.target.style.borderColor='rgba(252,213,53,0.4)'} onBlur={e=>e.target.style.borderColor='rgba(255,255,255,0.08)'} />
        <button onClick={handleSaveMessage} disabled={loading==='msg'} style={{ marginTop: 12, padding: '10px 20px', background: 'linear-gradient(135deg,#fcd535,#f59e0b)', color: '#0d0d0d', fontWeight: 800, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>
          {loading==='msg' ? 'Saving...' : 'Save Message'}
        </button>
      </div>
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

  const card = { background: 'rgba(12,14,20,0.95)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', padding: 24, marginBottom: 16, maxWidth: 680 };
  const inp = { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' };
  const lbl = { fontSize: 10, color: '#556', marginBottom: 6, display: 'block', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' };

  if (!rates) return <div style={{ padding: '28px 32px', color: '#556' }}>Loading...</div>;

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>AI Rates</div>
      <div style={{ fontSize: 12, color: '#445', marginBottom: 24 }}>
        Daily return range per AI package. Each new deployment locks in a random rate within its band — actual returns average out across the range shown.
      </div>

      {Object.entries(rates).map(([id, r]) => (
        <div key={id} style={{ ...card }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>{r.name || id}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={lbl}>Min Daily %</label>
              <input style={inp} type="number" step="0.01" min="0" value={r.min}
                onChange={e => setField(id, 'min', e.target.value)} />
            </div>
            <div>
              <label style={lbl}>Max Daily %</label>
              <input style={inp} type="number" step="0.01" min="0" value={r.max}
                onChange={e => setField(id, 'max', e.target.value)} />
            </div>
          </div>
        </div>
      ))}

      <button onClick={handleSave} disabled={loading === 'save'} style={{ padding: '12px 24px', background: 'linear-gradient(135deg,#fcd535,#f59e0b)', color: '#0d0d0d', fontWeight: 800, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 13 }}>
        {loading === 'save' ? 'Saving...' : 'Save Rates'}
      </button>
    </div>
  );
}

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
  const [fundsModal, setFundsModal] = useState(null); // { address }
  const [fundsField, setFundsField] = useState('tradingBalance');
  const [fundsAmount, setFundsAmount] = useState('');
  const [fundsMsg, setFundsMsg] = useState('');
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
                  {filteredAccounts.map(acc => {
                    const bal = acc.balance || {};
                    return (
                    <tr key={acc.address} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                      <td style={{ padding: '12px 16px', color: '#889', fontFamily: 'monospace' }}>
                        {acc.address?.slice(0, 8)}...{acc.address?.slice(-4)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#fcd535', fontWeight: 700 }}>
                        {Number(bal.tradingBalance || 0).toFixed(4)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#00c076' }}>
                        {Number(bal.totalDeposited || 0).toFixed(4)}
                      </td>
                      <td style={{ padding: '12px 16px', color: '#ff4d4d' }}>
                        {Number(bal.totalWithdrawn || 0).toFixed(4)}
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
                          <button
                            onClick={() => openFundsModal(acc.address)}
                            style={{ fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', background: 'rgba(0,192,118,0.1)', border: '1px solid rgba(0,192,118,0.2)', color: '#00c076' }}
                          >+ Funds</button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
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
                            <button onClick={() => handleUpdateWithdrawal(w._id, 'approved')} disabled={loading === 'w_' + w._id} style={{ fontSize: 10, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', background: 'rgba(0,192,118,0.1)', border: '1px solid rgba(0,192,118,0.2)', color: '#00c076' }}>Approve</button>
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

        {tab === 'traders' && <TradersTab password={password} showMsg={showMsg} />}
        {tab === 'investments' && <InvestmentsTab password={password} showMsg={showMsg} />}
        {tab === 'ai-rates' && <AiRatesTab password={password} showMsg={showMsg} />}
        {tab === 'stakes' && <StakesTab password={password} showMsg={showMsg} />}
        {tab === 'contract' && <ContractTab password={password} showMsg={showMsg} />}
        {tab === 'platform' && <PlatformTab password={password} showMsg={showMsg} />}

        {/* Placeholder tabs */}
        {['copytrades'].includes(tab) && (
          <div style={{ padding: '28px 32px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 20 }}>Copy Trades</div>
            <div style={{ background: 'rgba(14,17,24,0.8)', borderRadius: 12, border: '1px solid rgba(252,213,53,0.08)', padding: 32, textAlign: 'center', color: '#445' }}>
              Coming soon
            </div>
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
            borderRadius: 14, padding: '28px 28px', width: 380,
            boxShadow: '0 0 40px rgba(0,0,0,0.6)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Add / Deduct Funds</div>
            <div style={{ fontSize: 11, color: '#556', marginBottom: 20, fontFamily: 'monospace' }}>
              {fundsModal.address}
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: '#667', marginBottom: 6 }}>Balance Field</div>
              <select
                value={fundsField}
                onChange={e => setFundsField(e.target.value)}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(252,213,53,0.2)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none' }}
              >
                <option value="tradingBalance">Trading Balance</option>
                <option value="aiEarnings">AI Earnings</option>
                <option value="stakingEarnings">Staking Earnings</option>
                <option value="referralEarnings">Referral Earnings</option>
              </select>
            </div>

            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 11, color: '#667', marginBottom: 6 }}>Amount (BNB) — negative to deduct</div>
              <input
                type="number" step="any" placeholder="e.g. 0.5 or -0.1"
                value={fundsAmount}
                onChange={e => setFundsAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddFunds()}
                style={{ width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(252,213,53,0.2)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {fundsMsg && (
              <div style={{ fontSize: 12, color: '#ff4d4d', marginBottom: 10 }}>{fundsMsg}</div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button
                onClick={handleAddFunds}
                disabled={loading === 'funds'}
                style={{ flex: 1, background: '#00c076', color: '#0d0d0d', fontWeight: 800, border: 'none', borderRadius: 8, padding: '11px', cursor: 'pointer', fontSize: 13 }}
              >
                {loading === 'funds' ? 'Sending...' : 'Confirm'}
              </button>
              <button
                onClick={closeFundsModal}
                style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#889', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '11px', cursor: 'pointer', fontSize: 13 }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
