import { useEffect, useRef, useState } from 'react';
import { useWeb3Modal } from '@web3modal/wagmi/react';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { useNavigate } from 'react-router-dom';

const BSC_CHAIN_ID = 56;

const FEATURES = [
  { icon: '◈', title: 'AI-Powered Trading', desc: 'Automated strategies with up to 2% daily returns', color: '#fcd535' },
  { icon: '◎', title: 'Secure Staking', desc: 'Lock BNB and earn consistent passive income', color: '#00c076' },
  { icon: '⌘', title: 'Copy Trading', desc: 'Mirror top traders and share in their profits', color: '#818cf8' },
  { icon: '◇', title: 'Instant Loans', desc: 'Borrow against your staked assets instantly', color: '#ff8c00' },
];

const AVATARS = [
  { id: 'phantom', label: 'Phantom', color: '#fcd535' },
  { id: 'wolf',    label: 'Wolf',    color: '#818cf8' },
  { id: 'bull',    label: 'Bull',    color: '#00c076' },
  { id: 'viper',   label: 'Viper',   color: '#ff4d4d' },
  { id: 'nova',    label: 'Nova',    color: '#ff8c00' },
  { id: 'cipher',  label: 'Cipher',  color: '#00d4ff' },
  { id: 'dragon',  label: 'Dragon',  color: '#f43f5e' },
  { id: 'ape',     label: 'Ape',     color: '#d97706' },
  { id: 'shark',   label: 'Shark',   color: '#3b82f6' },
  { id: 'skull',   label: 'Skull',   color: '#94a3b8' },
  { id: 'panther', label: 'Panther', color: '#a855f7' },
  { id: 'eagle',   label: 'Eagle',   color: '#fb923c' },
];

function AvatarSVG({ id, color }) {
  const bg = '#0d0d0d';
  switch (id) {
    case 'phantom':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <line x1="32" y1="5" x2="32" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="32" cy="4" r="3" fill={color} />
          <rect x="13" y="15" width="38" height="28" rx="5" fill="#1a1a2e" />
          <rect x="13" y="15" width="38" height="28" rx="5" stroke={color} strokeWidth="1" opacity="0.2" />
          <rect x="9" y="21" width="4" height="10" rx="2" fill="#1a1a2e" stroke={color} strokeWidth="1" opacity="0.2" />
          <rect x="51" y="21" width="4" height="10" rx="2" fill="#1a1a2e" stroke={color} strokeWidth="1" opacity="0.2" />
          <rect x="18" y="22" width="11" height="9" rx="2.5" fill={color} opacity="0.9" />
          <rect x="35" y="22" width="11" height="9" rx="2.5" fill={color} opacity="0.9" />
          <rect x="21" y="25" width="5" height="5" rx="1" fill={bg} />
          <rect x="38" y="25" width="5" height="5" rx="1" fill={bg} />
          <rect x="18" y="36" width="28" height="4" rx="2" fill="#111" />
          <rect x="18" y="36" width="7" height="4" rx="2" fill={color} opacity="0.6" />
          <rect x="26" y="36" width="7" height="4" rx="2" fill={color} opacity="0.4" />
          <rect x="34" y="36" width="7" height="4" rx="2" fill={color} opacity="0.2" />
          <rect x="26" y="43" width="12" height="5" rx="2" fill="#1a1a2e" />
        </svg>
      );
    case 'wolf':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <polygon points="14,26 21,6 29,24" fill="#1e1e30" />
          <polygon points="35,24 43,6 50,26" fill="#1e1e30" />
          <polygon points="16,26 21,10 27,24" fill={color} opacity="0.5" />
          <polygon points="37,24 43,10 48,26" fill={color} opacity="0.5" />
          <ellipse cx="32" cy="35" rx="20" ry="18" fill="#1e1e30" />
          <path d="M19,26 Q23,20 27,23" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <path d="M37,23 Q41,20 45,26" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
          <ellipse cx="24" cy="30" rx="5" ry="4.5" fill={color} opacity="0.9" />
          <ellipse cx="40" cy="30" rx="5" ry="4.5" fill={color} opacity="0.9" />
          <ellipse cx="24" cy="30" rx="2.5" ry="3.5" fill={bg} />
          <ellipse cx="40" cy="30" rx="2.5" ry="3.5" fill={bg} />
          <ellipse cx="32" cy="41" rx="10" ry="7" fill="#16162a" />
          <ellipse cx="32" cy="38.5" rx="3.5" ry="2.5" fill={bg} />
          <path d="M26,44 Q32,48 38,44" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.5" />
        </svg>
      );
    case 'bull':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <path d="M18,24 Q8,14 6,7 Q14,9 20,20" fill={color} opacity="0.85" />
          <path d="M46,24 Q56,14 58,7 Q50,9 44,20" fill={color} opacity="0.85" />
          <ellipse cx="32" cy="37" rx="21" ry="19" fill="#1e1e30" />
          <path d="M20,27 L28,22" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M36,22 L44,27" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <circle cx="25" cy="31" r="5" fill={color} opacity="0.9" />
          <circle cx="39" cy="31" r="5" fill={color} opacity="0.9" />
          <circle cx="25" cy="31" r="2.8" fill={bg} />
          <circle cx="39" cy="31" r="2.8" fill={bg} />
          <ellipse cx="32" cy="43" rx="10" ry="7" fill="#16162a" />
          <circle cx="28" cy="43" r="2.8" fill="#1e1e30" />
          <circle cx="36" cy="43" r="2.8" fill="#1e1e30" />
          <path d="M24,38 Q32,35 40,38" stroke={color} strokeWidth="1.5" fill="none" opacity="0.4" />
        </svg>
      );
    case 'viper':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <polygon points="32,6 54,34 44,58 20,58 10,34" fill="#1e1e30" />
          <polygon points="32,6 54,34 32,34" fill={color} opacity="0.15" />
          <path d="M14,34 Q32,38 50,34" stroke={color} strokeWidth="1" fill="none" opacity="0.3" />
          <path d="M18,44 Q32,48 46,44" stroke={color} strokeWidth="1" fill="none" opacity="0.2" />
          <ellipse cx="23" cy="27" rx="7" ry="5.5" fill={color} opacity="0.9" />
          <ellipse cx="41" cy="27" rx="7" ry="5.5" fill={color} opacity="0.9" />
          <rect x="21" y="24" width="4" height="6" rx="0.5" fill={bg} />
          <rect x="39" y="24" width="4" height="6" rx="0.5" fill={bg} />
          <path d="M28,54 L26,60" stroke={color} strokeWidth="2" strokeLinecap="round" />
          <path d="M36,54 L38,60" stroke={color} strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case 'nova':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <circle cx="32" cy="30" r="24" fill="#1a1a2e" stroke={color} strokeWidth="2" opacity="0.4" />
          <circle cx="32" cy="30" r="20" fill="#12122a" />
          <rect x="14" y="22" width="36" height="22" rx="5" fill="#0f1a30" stroke={color} strokeWidth="1.5" opacity="0.6" />
          <rect x="16" y="24" width="32" height="18" rx="4" fill={color} opacity="0.18" />
          <circle cx="24" cy="33" r="4" fill={color} opacity="0.85" />
          <circle cx="40" cy="33" r="4" fill={color} opacity="0.85" />
          <circle cx="24" cy="33" r="2" fill={bg} />
          <circle cx="40" cy="33" r="2" fill={bg} />
          <line x1="28" y1="42" x2="36" y2="42" stroke={color} strokeWidth="3" strokeLinecap="round" opacity="0.5" />
          <path d="M16,48 Q32,54 48,48" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" />
          <line x1="10" y1="30" x2="6" y2="30" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
          <line x1="58" y1="30" x2="54" y2="30" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        </svg>
      );
    case 'cipher':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <path d="M14,42 Q12,30 14,20 Q18,8 32,8 Q46,8 50,20 Q52,30 50,42 Q44,54 32,56 Q20,54 14,42Z" fill="#1e1e30" />
          <rect x="16" y="26" width="32" height="14" rx="3" fill="#111" stroke={color} strokeWidth="1" opacity="0.5" />
          <rect x="18" y="28" width="12" height="10" rx="2" fill={color} fillOpacity="0.25" stroke={color} strokeOpacity="0.8" strokeWidth="1" />
          <rect x="34" y="28" width="12" height="10" rx="2" fill={color} fillOpacity="0.25" stroke={color} strokeOpacity="0.8" strokeWidth="1" />
          <line x1="20" y1="33" x2="28" y2="33" stroke={color} strokeWidth="1.2" opacity="0.9" />
          <line x1="36" y1="33" x2="44" y2="33" stroke={color} strokeWidth="1.2" opacity="0.9" />
          {[0, 1, 2, 3, 4].map(i => (
            <line key={i} x1={18 + i * 7} y1="46" x2={18 + i * 7} y2="52" stroke={color} strokeWidth="1" strokeLinecap="round" opacity="0.5" />
          ))}
          <line x1="18" y1="46" x2="46" y2="46" stroke={color} strokeWidth="1" opacity="0.25" />
        </svg>
      );
    case 'dragon':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <path d="M20,22 Q15,8 21,6 Q24,14 26,22" fill="#1e1020" />
          <path d="M44,22 Q49,8 43,6 Q40,14 38,22" fill="#1e1020" />
          <path d="M16,10 Q20,8 23,14" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d="M48,10 Q44,8 41,14" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" opacity="0.7" />
          <path d="M14,24 Q13,44 22,51 Q32,56 42,51 Q51,44 50,24 Q46,16 32,16 Q18,16 14,24Z" fill="#1e1020" />
          <ellipse cx="23" cy="28" rx="6" ry="4.5" fill={color} opacity="0.9" />
          <ellipse cx="41" cy="28" rx="6" ry="4.5" fill={color} opacity="0.9" />
          <rect x="21.5" y="25" width="3" height="6" rx="0.5" fill={bg} />
          <rect x="39.5" y="25" width="3" height="6" rx="0.5" fill={bg} />
          <path d="M22,35 Q32,40 42,35" fill="#161014" />
          <circle cx="28" cy="39" r="1" fill={color} opacity="0.6" />
          <circle cx="36" cy="39" r="1" fill={color} opacity="0.6" />
        </svg>
      );
    case 'ape':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <ellipse cx="12" cy="36" rx="5" ry="6" fill="#1e180e" stroke={color} strokeWidth="1" opacity="0.3" />
          <ellipse cx="52" cy="36" rx="5" ry="6" fill="#1e180e" stroke={color} strokeWidth="1" opacity="0.3" />
          <ellipse cx="32" cy="34" rx="22" ry="20" fill="#1e180e" />
          <path d="M10,26 Q32,14 54,26 Q52,18 32,16 Q12,18 10,26Z" fill="#252018" />
          <path d="M18,24 L26,27" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <path d="M38,27 L46,24" stroke={color} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <ellipse cx="24" cy="31" rx="4.5" ry="4" fill={color} opacity="0.85" />
          <ellipse cx="40" cy="31" rx="4.5" ry="4" fill={color} opacity="0.85" />
          <ellipse cx="24" cy="31" rx="2.2" ry="2.8" fill={bg} />
          <ellipse cx="40" cy="31" rx="2.2" ry="2.8" fill={bg} />
          <ellipse cx="32" cy="40" rx="9" ry="6" fill="#161008" />
          <circle cx="28.5" cy="40" r="3.2" fill="#111" />
          <circle cx="35.5" cy="40" r="3.2" fill="#111" />
        </svg>
      );
    case 'shark':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <polygon points="32,4 42,24 22,24" fill="#12203a" stroke={color} strokeWidth="1" opacity="0.5" />
          <ellipse cx="32" cy="38" rx="22" ry="16" fill="#12203a" />
          <circle cx="24" cy="32" r="5.5" fill={color} opacity="0.8" />
          <circle cx="40" cy="32" r="5.5" fill={color} opacity="0.8" />
          <circle cx="24" cy="32" r="3.5" fill={bg} />
          <circle cx="40" cy="32" r="3.5" fill={bg} />
          <path d="M14,42 Q32,54 50,42" fill="#0d1830" />
          <polygon points="16,42 19,48 22,42" fill="rgba(255,255,255,0.75)" />
          <polygon points="23,43 26,50 29,43" fill="rgba(255,255,255,0.75)" />
          <polygon points="30,43 33,50 36,43" fill="rgba(255,255,255,0.75)" />
          <polygon points="37,43 40,50 43,43" fill="rgba(255,255,255,0.75)" />
          <polygon points="44,42 47,48 50,42" fill="rgba(255,255,255,0.75)" />
        </svg>
      );
    case 'skull':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <ellipse cx="32" cy="26" rx="21" ry="20" fill="#1a1a22" />
          <rect x="18" y="40" width="28" height="16" rx="3" fill="#14141c" />
          <ellipse cx="23" cy="26" rx="7.5" ry="8.5" fill={bg} />
          <ellipse cx="41" cy="26" rx="7.5" ry="8.5" fill={bg} />
          <path d="M29,38 L32,32 L35,38 Q32,40 29,38Z" fill={bg} />
          <line x1="22" y1="42" x2="22" y2="54" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="27" y1="41" x2="27" y2="54" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="32" y1="41" x2="32" y2="54" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="37" y1="41" x2="37" y2="54" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="42" y1="42" x2="42" y2="54" stroke={color} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
          <line x1="18" y1="41" x2="46" y2="41" stroke={color} strokeWidth="1" opacity="0.2" />
        </svg>
      );
    case 'panther':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <polygon points="16,24 21,8 29,22" fill="#1a0e28" />
          <polygon points="35,22 43,8 48,24" fill="#1a0e28" />
          <polygon points="18,24 21,12 27,22" fill={color} opacity="0.3" />
          <polygon points="37,22 43,12 46,24" fill={color} opacity="0.3" />
          <ellipse cx="32" cy="35" rx="20" ry="19" fill="#1a0e28" />
          <ellipse cx="24" cy="29" rx="6.5" ry="3.5" fill={color} opacity="0.9" />
          <ellipse cx="40" cy="29" rx="6.5" ry="3.5" fill={color} opacity="0.9" />
          <ellipse cx="24" cy="29" rx="2" ry="3.2" fill={bg} />
          <ellipse cx="40" cy="29" rx="2" ry="3.2" fill={bg} />
          <polygon points="30,37 34,37 32,40" fill={color} opacity="0.75" />
          <path d="M24,44 Q32,50 40,44" stroke={color} strokeWidth="1.5" fill="none" opacity="0.3" strokeLinecap="round" />
        </svg>
      );
    case 'eagle':
      return (
        <svg viewBox="0 0 64 64" width="100%" height="100%" fill="none">
          <path d="M20,20 Q22,8 28,12 Q32,10 36,12 Q42,8 44,20" fill="#1c1408" />
          <ellipse cx="32" cy="34" rx="19" ry="21" fill="#1c1408" />
          <circle cx="24" cy="29" r="6" fill={color} opacity="0.9" />
          <circle cx="40" cy="29" r="6" fill={color} opacity="0.9" />
          <circle cx="24" cy="29" r="3.5" fill={bg} />
          <circle cx="40" cy="29" r="3.5" fill={bg} />
          <path d="M26,38 Q32,36 38,38 Q36,44 32,46 Q28,44 26,42 Q24,40 26,38Z" fill={color} opacity="0.9" />
          <line x1="26" y1="38" x2="38" y2="38" stroke="#1c1408" strokeWidth="1.5" />
        </svg>
      );
    default:
      return null;
  }
}

async function clearStaleWCSessions() {
  Object.keys(localStorage)
    .filter(k => k.startsWith('wc@2') || k.startsWith('W3M') || k.startsWith('wagmi'))
    .forEach(k => localStorage.removeItem(k));
  try {
    if (window.indexedDB?.databases) {
      const dbs = await window.indexedDB.databases();
      dbs.forEach(db => {
        if (db.name?.startsWith('wc@2') || db.name?.startsWith('W3M') || db.name?.startsWith('wagmi')) {
          window.indexedDB.deleteDatabase(db.name);
        }
      });
    }
  } catch (_) {}
}

export default function Connect() {
  const { open } = useWeb3Modal();
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const navigate = useNavigate();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(
    () => localStorage.getItem('alphanodes_avatar') || null
  );
  const [username, setUsername] = useState(
    () => localStorage.getItem('alphanodes_pending_username') || ''
  );

  const activeAv = AVATARS.find(a => a.id === selectedAvatar);

  const handleSelectAvatar = (id) => {
    setSelectedAvatar(id);
    localStorage.setItem('alphanodes_avatar', id);
  };

  const handleUsernameChange = (val) => {
    const cleaned = val.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20);
    setUsername(cleaned);
    localStorage.setItem('alphanodes_pending_username', cleaned);
  };

  useEffect(() => {
    if (isConnected && chainId !== BSC_CHAIN_ID) {
      switchChain({ chainId: BSC_CHAIN_ID });
    }
  }, [isConnected, chainId]);

  useEffect(() => {
    const tryVanta = () => {
      if (window.VANTA && window.THREE && vantaRef.current && !vantaEffect.current) {
        vantaEffect.current = window.VANTA.DOTS({
          el: vantaRef.current,
          THREE: window.THREE,
          mouseControls: true,
          touchControls: true,
          color: 0xfcd535,
          color2: 0xffa500,
          backgroundColor: 0x0d0d0d,
          size: 2.5,
          spacing: 28,
          showLines: true,
        });
      }
    };
    tryVanta();
    const t = setTimeout(tryVanta, 500);
    return () => {
      clearTimeout(t);
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isConnected) navigate('/dashboard');
  }, [isConnected, navigate]);

  return (
    <div
      ref={vantaRef}
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      {/* Live badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 7,
        background: 'rgba(252,213,53,0.07)', border: '1px solid rgba(252,213,53,0.15)',
        borderRadius: 24, padding: '6px 16px', marginBottom: 32,
        position: 'relative', zIndex: 1,
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c076', boxShadow: '0 0 8px #00c076', display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: 2, textTransform: 'uppercase' }}>Live on BSC Mainnet</span>
      </div>

      {/* Hero */}
      <div style={{ textAlign: 'center', marginBottom: 40, position: 'relative', zIndex: 1 }}>
        <h1 className="hero-title" style={{ fontSize: 'clamp(48px, 8vw, 72px)', fontWeight: 900, margin: 0, lineHeight: 1.05, letterSpacing: '-3px', fontFamily: "'Outfit', sans-serif" }}>
          Alpha<span style={{ color: '#fcd535', fontWeight: 300 }}>Nodes</span>
        </h1>
        <p style={{ color: '#666', fontSize: 15, marginTop: 14, marginBottom: 0, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.65 }}>
          AI-Powered DeFi Trading Platform on Binance Smart Chain
        </p>

        {/* Stats row */}
        <div style={{
          display: 'inline-flex', gap: 0, marginTop: 24, marginBottom: 32,
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {[['$4.2M+','TVL'], ['12K+','Users'], ['2%','Daily APY'], ['99.9%','Uptime']].map(([val, lbl], i, arr) => (
            <div key={lbl} style={{
              padding: '12px 20px', textAlign: 'center',
              borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#fcd535', fontFamily: "'Outfit', sans-serif" }}>{val}</div>
              <div style={{ fontSize: 9, color: '#444', marginTop: 2, textTransform: 'uppercase', letterSpacing: 1 }}>{lbl}</div>
            </div>
          ))}
        </div>

        {/* Connect button */}
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <div style={{
            position: 'absolute', inset: -6, borderRadius: 18,
            background: 'radial-gradient(ellipse, rgba(252,213,53,0.2) 0%, transparent 70%)',
            filter: 'blur(10px)', pointerEvents: 'none',
          }} />
          <button
            onClick={() => setShowAvatarModal(true)}
            style={{
              position: 'relative',
              background: 'linear-gradient(135deg, #fcd535 0%, #f59e0b 100%)',
              color: '#0d0d0d', fontWeight: 800,
              fontSize: 15, padding: '15px 52px', borderRadius: 12,
              border: 'none', cursor: 'pointer', letterSpacing: 0.3,
              boxShadow: '0 6px 28px rgba(252,213,53,0.35)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              fontFamily: "'Outfit', sans-serif",
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 10px 36px rgba(252,213,53,0.45)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = '';
              e.currentTarget.style.boxShadow = '0 6px 28px rgba(252,213,53,0.35)';
            }}
          >
            Connect Wallet
          </button>
        </div>
        <div style={{ fontSize: 11, color: '#3a3a3a', marginTop: 14 }}>
          MetaMask · WalletConnect · Trust Wallet
        </div>
      </div>

      {/* Avatar modal */}
      {showAvatarModal && (
        <div
          onClick={() => setShowAvatarModal(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#111118',
              border: '1px solid rgba(252,213,53,0.12)',
              borderRadius: 18,
              padding: '36px 32px',
              maxWidth: 520,
              width: '100%',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 6 }}>Choose Your Identity</div>
            <div style={{ fontSize: 12, color: '#555', marginBottom: 28 }}>Pick an avatar before connecting</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
              {AVATARS.map(av => {
                const isSelected = selectedAvatar === av.id;
                return (
                  <div
                    key={av.id}
                    onClick={() => handleSelectAvatar(av.id)}
                    style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, transition: 'transform 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = ''; }}
                  >
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: '#161622',
                      border: isSelected ? `2px solid ${av.color}` : '2px solid rgba(255,255,255,0.06)',
                      boxShadow: isSelected ? `0 0 22px ${av.color}55` : 'none',
                      overflow: 'hidden', padding: 6,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'border 0.15s, box-shadow 0.15s',
                    }}>
                      <AvatarSVG id={av.id} color={av.color} />
                    </div>
                    <div style={{
                      fontSize: 10, fontWeight: 600, letterSpacing: 0.5,
                      color: isSelected ? av.color : '#555',
                      transition: 'color 0.15s',
                    }}>
                      {av.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Username input */}
            <div style={{ marginBottom: 24, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 8, fontWeight: 600, letterSpacing: 0.5 }}>
                USERNAME <span style={{ color: '#333', fontWeight: 400 }}>(optional)</span>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 13, color: '#444', pointerEvents: 'none', userSelect: 'none',
                }}>@</span>
                <input
                  type="text"
                  placeholder="your_username"
                  value={username}
                  onChange={e => handleUsernameChange(e.target.value)}
                  style={{
                    width: '100%', background: '#0d0d0d',
                    border: username.length > 0 ? '1px solid rgba(252,213,53,0.3)' : '1px solid rgba(255,255,255,0.07)',
                    borderRadius: 10, padding: '11px 14px 11px 28px',
                    color: '#fff', fontSize: 14, fontWeight: 600,
                    outline: 'none', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                />
              </div>
              <div style={{ fontSize: 10, color: '#333', marginTop: 6 }}>
                Letters, numbers, underscores only · max 20 chars
                {username && <span style={{ color: '#555', marginLeft: 8 }}>{username.length}/20</span>}
              </div>
            </div>

            <button
              onClick={async () => { setShowAvatarModal(false); await clearStaleWCSessions(); open(); }}
              disabled={!selectedAvatar}
              style={{
                background: activeAv ? activeAv.color : 'rgba(255,255,255,0.08)',
                color: activeAv ? '#0d0d0d' : '#555',
                fontWeight: 800, fontSize: 14,
                padding: '13px 40px', borderRadius: 10,
                border: 'none',
                cursor: selectedAvatar ? 'pointer' : 'not-allowed',
                letterSpacing: 0.5,
                boxShadow: activeAv ? `0 4px 24px ${activeAv.color}55` : 'none',
                transition: 'all 0.2s',
                display: 'inline-flex', alignItems: 'center', gap: 10,
              }}
            >
              {activeAv && (
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(0,0,0,0.15)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AvatarSVG id={activeAv.id} color="#0d0d0d" />
                </span>
              )}
              {selectedAvatar ? `Continue as ${activeAv.label}` : 'Select an avatar'}
            </button>
            <div style={{ fontSize: 11, color: '#333', marginTop: 12 }}>
              or{' '}
              <span
                style={{ cursor: 'pointer', color: '#555', textDecoration: 'underline' }}
                onClick={async () => { setShowAvatarModal(false); await clearStaleWCSessions(); open(); }}
              >
                skip and connect
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="hero-features" style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12,
        maxWidth: 620, width: '100%', position: 'relative', zIndex: 1,
      }}>
        {FEATURES.map(({ icon, title, desc, color }) => (
          <div
            key={title}
            style={{
              background: 'rgba(12,12,16,0.8)', border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: 14, padding: '18px 18px',
              backdropFilter: 'blur(8px)',
              transition: 'border-color 0.2s, transform 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${color}30`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.transform = ''; }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 9,
              background: `${color}15`, border: `1px solid ${color}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, color, marginBottom: 12,
            }}>
              {icon}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: '#e0e0e0' }}>{title}</div>
            <div style={{ fontSize: 11, color: '#555', lineHeight: 1.6 }}>{desc}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ marginTop: 32, fontSize: 11, color: '#333', position: 'relative', zIndex: 1, display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <span>🔒 Non-Custodial</span>
        <span>⛓ BSC Blockchain</span>
        <span>✦ Smart Contract Secured</span>
      </div>
    </div>
  );
}
