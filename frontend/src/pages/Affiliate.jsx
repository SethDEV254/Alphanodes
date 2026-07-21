import { useEffect, useState } from 'react';
import { useApp } from '../App.jsx';
import { getReferral } from '../api.js';

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

const COMMISSION_LEVELS = [
  { level: 1, rate: '15%', desc: 'Direct referrals — daily AI earnings', color: '#fcd535' },
  { level: 2, rate: '10%', desc: 'Indirect referrals — daily AI earnings', color: '#ff8c00' },
  { level: 3, rate: '5%',  desc: 'Tier 3 referrals — daily AI earnings', color: '#a78bfa' },
];

const HOW_IT_WORKS = [
  {
    step: '01', color: '#fcd535', title: 'Share Your Link',
    desc: 'Send your unique referral link to friends and your community',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    step: '02', color: '#3b9eff', title: 'They Sign Up',
    desc: 'Your referrals connect their wallet and start investing',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
      </svg>
    ),
  },
  {
    step: '03', color: '#00c076', title: 'Earn Commission',
    desc: 'Automatically earn 15% of all their AI earnings in real time, forever',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
      </svg>
    ),
  },
];

export default function Affiliate() {
  const { address, bnbPrice } = useApp();
  const [referral, setReferral] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (address) fetchReferral();
  }, [address]);

  const fetchReferral = async () => {
    try {
      const r = await getReferral(address);
      setReferral(r.data.data || null);
    } catch (e) {}
  };

  const refLink = address ? `${window.location.origin}/?ref=${address}` : '';

  const copyLink = () => {
    if (!refLink) return;
    navigator.clipboard.writeText(refLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ref = referral || {};
  const totalEarned = ref.totalEarned || 0;
  const referredCount = ref.referredCount || ref.totalReferred || 0;
  const referredUsers = ref.referredUsers || [];
  const levels = ref.levels || [];

  return (
    <div>
      {/* AFFILIATE PROGRAM header */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 6,
            background: 'rgba(252,213,53,0.12)', border: '1px solid rgba(252,213,53,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fcd535" strokeWidth="2">
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 800, color: '#fcd535', letterSpacing: 2,
            textTransform: 'uppercase', padding: '3px 10px',
            background: 'rgba(252,213,53,0.08)', border: '1px solid rgba(252,213,53,0.2)',
            borderRadius: 4,
          }}>
            Affiliate Program
          </span>
        </div>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1.25, margin: '0 0 8px' }}>
          Refer &amp; <span style={{ color: '#fcd535' }}>Earn Forever</span>
        </h2>
        <p style={{ fontSize: 13, color: '#555', lineHeight: 1.6, margin: 0, maxWidth: 500 }}>
          Share your unique link. Earn up to 15% commission on your referrals' AI earnings in real time — automatically, no limits.
        </p>
      </div>

      {/* 3 stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <div className="card" style={{ padding: '16px', borderTop: '2px solid #00c076' }}>
          <div style={{ marginBottom: 10 }}>
            <IconBox color="#00c076">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
              </svg>
            </IconBox>
          </div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
            Total Earned
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#00c076', lineHeight: 1 }}>
            {fmt(totalEarned)}
          </div>
          <div style={{ fontSize: 9, color: '#00c076', marginTop: 3, fontWeight: 600 }}>BNB</div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '2px solid #fcd535' }}>
          <div style={{ marginBottom: 10 }}>
            <IconBox color="#fcd535">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </IconBox>
          </div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
            Referrals
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fcd535', lineHeight: 1 }}>
            {referredCount}
          </div>
          <div style={{ fontSize: 9, color: '#fcd535', marginTop: 3, fontWeight: 600 }}>Users</div>
        </div>

        <div className="card" style={{ padding: '16px', borderTop: '2px solid #a78bfa' }}>
          <div style={{ marginBottom: 10 }}>
            <IconBox color="#a78bfa">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="19" y1="5" x2="5" y2="19" />
                <circle cx="6.5" cy="6.5" r="2.5" /><circle cx="17.5" cy="17.5" r="2.5" />
              </svg>
            </IconBox>
          </div>
          <div style={{ fontSize: 9, color: '#888', textTransform: 'uppercase', letterSpacing: 1.2, fontWeight: 700, marginBottom: 4 }}>
            Commission
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#a78bfa', lineHeight: 1 }}>15%</div>
          <div style={{ fontSize: 9, color: '#a78bfa', marginTop: 3, fontWeight: 600 }}>L1 direct</div>
        </div>
      </div>

      {/* Referral Link */}
      <div className="card" style={{ padding: '20px', marginBottom: 14, borderTop: '2px solid #fcd535' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <IconBox color="#fcd535" size={40}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
          </IconBox>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>Your Referral Link</div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
              Share this — earn 15%/10%/5% of referrals' AI earnings in real time
            </div>
          </div>
        </div>
        <div style={{
          display: 'flex', gap: 8, padding: '12px 14px', borderRadius: 10,
          background: 'rgba(252,213,53,0.04)', border: '1px solid rgba(252,213,53,0.12)',
          marginBottom: 12, alignItems: 'center',
        }}>
          <div style={{
            flex: 1, fontSize: 11, color: '#888', fontFamily: 'monospace',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {refLink || 'Connect wallet to get your link'}
          </div>
        </div>
        <button
          onClick={copyLink}
          disabled={!refLink}
          style={{
            width: '100%', padding: '12px 0', borderRadius: 10, fontSize: 13, fontWeight: 800,
            background: copied
              ? 'linear-gradient(135deg,#00c076,#009960)'
              : 'linear-gradient(135deg,#fcd535,#e6a800)',
            color: '#0a0a0a', border: 'none', cursor: refLink ? 'pointer' : 'not-allowed',
            boxShadow: copied ? '0 4px 20px rgba(0,192,118,0.25)' : '0 4px 20px rgba(252,213,53,0.25)',
            transition: 'all 0.2s', letterSpacing: 0.5,
            opacity: refLink ? 1 : 0.4,
          }}
        >
          {copied ? '✓ Link Copied!' : '⧉ Copy Referral Link'}
        </button>
      </div>

      {/* Commission Structure + Referred Users */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {/* Commission levels */}
        <div className="card" style={{ padding: '16px', borderTop: '2px solid #a78bfa' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Commission Structure
          </div>
          {COMMISSION_LEVELS.map(l => (
            <div key={l.level} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 12px', marginBottom: 6, borderRadius: 10,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
              borderLeft: `3px solid ${l.color}`,
            }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#ccc' }}>Level {l.level}</div>
                <div style={{ fontSize: 10, color: '#555', marginTop: 1 }}>{l.desc}</div>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: l.color }}>{l.rate}</div>
            </div>
          ))}
        </div>

        {/* Referred users */}
        <div className="card" style={{ padding: '16px', borderTop: '2px solid #3b9eff' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1 }}>
              Referred Users
            </span>
            {referredCount > 0 && (
              <span style={{
                fontSize: 10, color: '#3b9eff', background: 'rgba(59,158,255,0.1)',
                border: '1px solid rgba(59,158,255,0.2)', borderRadius: 10, padding: '1px 7px', fontWeight: 700,
              }}>
                {referredCount}
              </span>
            )}
          </div>
          {referredUsers.length === 0 ? (
            <div style={{ color: '#444', fontSize: 12, textAlign: 'center', padding: '24px 0', lineHeight: 1.8 }}>
              No referrals yet.
              <br />
              <span style={{ color: '#fcd535' }}>Share your link to start earning!</span>
            </div>
          ) : (
            referredUsers.slice(0, 8).map((u, i) => {
              const addr = typeof u === 'string' ? u : (u.address || '');
              const earned = u.earned;
              return (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 10px', marginBottom: 4, borderRadius: 8,
                  background: 'rgba(255,255,255,0.015)',
                }}>
                  <div style={{ fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
                    {addr.slice(0, 8)}···{addr.slice(-4)}
                  </div>
                  {earned != null && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#00c076' }}>
                      +{fmt(earned)} BNB
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* How It Works */}
      <div className="card" style={{ padding: '18px 20px', borderTop: '2px solid #00c076' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 }}>
          How It Works
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {HOW_IT_WORKS.map(({ step, color, title, desc, icon }) => (
            <div key={step} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              padding: '12px 14px', borderRadius: 12,
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
              borderLeft: `3px solid ${color}`,
            }}>
              <IconBox color={color} size={42}>
                {icon}
              </IconBox>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color, letterSpacing: 1 }}>{step}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{title}</span>
                </div>
                <div style={{ fontSize: 12, color: '#555', lineHeight: 1.6 }}>{desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
