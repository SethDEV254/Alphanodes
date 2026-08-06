import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useDisconnect } from 'wagmi';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../App.jsx';

const NAV = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    path: '/ai-agents',
    label: 'AI Agents',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="8" r="4" /><path d="M2 20c0-4 4-7 10-7s10 3 10 7" />
        <path d="M12 4V2m-4 6H6m12 0h-2" />
      </svg>
    ),
  },
  {
    path: '/trading',
    label: 'Trading',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    path: '/copy-trading',
    label: 'Copy Trading',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    ),
  },
  {
    path: '/staking',
    label: 'Staking',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    path: '/loans',
    label: 'Loans',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  {
    path: '/affiliate',
    label: 'Affiliate',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
    ),
  },
  {
    path: '/ai-chat',
    label: 'AI Chat',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    path: '/support',
    label: 'Support',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
  },
];

export default function Layout() {
  const { address, balance } = useApp();
  const { disconnect } = useDisconnect();
  const navigate = useNavigate();
  const location = useLocation();
  const vantaRef = useRef(null);
  const vantaEffect = useRef(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const tryVanta = () => {
      if (window.VANTA && window.THREE && vantaRef.current && !vantaEffect.current) {
        vantaEffect.current = window.VANTA.DOTS({
          el: vantaRef.current,
          THREE: window.THREE,
          mouseControls: true,
          touchControls: true,
          color: 0xfcd535,
          color2: 0xff8800,
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

  const handleDisconnect = () => {
    disconnect();
    navigate('/');
  };

  const closeSidebar = () => setSidebarOpen(false);
  const shortAddr = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  const sidebarContent = (
    <>
      {/* Logo */}
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid rgba(252,213,53,0.08)' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#fcd535', letterSpacing: '-0.5px', textShadow: '0 0 20px rgba(252,213,53,0.5)', fontFamily: "'Outfit', sans-serif" }}>
          Qubi<span style={{ color: '#ffffff', fontWeight: 300 }}>nodes</span>
        </div>
        <div style={{ fontSize: 10, color: '#666', marginTop: 2, letterSpacing: 1, textTransform: 'uppercase' }}>
          AI-Powered DeFi
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 0', overflowY: 'auto' }}>
        {NAV.map(({ path, icon, label }) => (
          <NavLink
            key={path}
            to={path}
            onClick={isMobile ? closeSidebar : undefined}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '11px 20px', fontSize: 13, fontWeight: 600,
              color: isActive ? '#fcd535' : '#778',
              background: isActive ? 'rgba(252,213,53,0.07)' : 'transparent',
              borderLeft: isActive ? '2px solid #fcd535' : '2px solid transparent',
              textDecoration: 'none', transition: 'all 0.15s',
              textShadow: isActive ? '0 0 12px rgba(252,213,53,0.4)' : 'none',
            })}
          >
            {icon}
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Wallet footer */}
      <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(252,213,53,0.08)' }}>
        <div style={{
          fontSize: 11, color: '#fcd535', fontWeight: 700,
          background: 'rgba(252,213,53,0.08)', padding: '6px 10px',
          borderRadius: 6, marginBottom: 10, wordBreak: 'break-all',
          boxShadow: '0 0 10px rgba(252,213,53,0.08)',
        }}>
          {shortAddr}
        </div>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
          Balance: {(balance?.tradingBalance || 0).toFixed(4)} BNB
        </div>
        <button
          onClick={handleDisconnect}
          style={{
            fontSize: 11, color: '#ff4d4d', background: 'rgba(255,77,77,0.08)',
            border: '1px solid rgba(255,77,77,0.2)', borderRadius: 6,
            padding: '5px 10px', cursor: 'pointer', width: '100%',
          }}
        >
          Disconnect
        </button>
      </div>
    </>
  );

  return (
    <div ref={vantaRef} style={{ display: 'flex', minHeight: '100vh', position: 'relative' }}>

      {/* Mobile top bar */}
      <div className="mobile-topbar">
        <button
          onClick={() => setSidebarOpen(o => !o)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#fff', display: 'flex', flexDirection: 'column', gap: 4 }}
          aria-label="Menu"
        >
          <span style={{ display: 'block', width: 20, height: 2, background: sidebarOpen ? '#fcd535' : '#fff', borderRadius: 1, transition: 'all 0.2s', transform: sidebarOpen ? 'rotate(45deg) translate(4px, 4px)' : 'none' }} />
          <span style={{ display: 'block', width: 20, height: 2, background: '#fff', borderRadius: 1, transition: 'all 0.2s', opacity: sidebarOpen ? 0 : 1 }} />
          <span style={{ display: 'block', width: 20, height: 2, background: sidebarOpen ? '#fcd535' : '#fff', borderRadius: 1, transition: 'all 0.2s', transform: sidebarOpen ? 'rotate(-45deg) translate(4px, -4px)' : 'none' }} />
        </button>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fcd535', fontFamily: "'Outfit', sans-serif" }}>
          Qubi<span style={{ color: '#fff', fontWeight: 300 }}>nodes</span>
        </div>
        <div style={{ fontSize: 11, color: '#fcd535', fontWeight: 700, background: 'rgba(252,213,53,0.08)', padding: '4px 8px', borderRadius: 6 }}>
          {shortAddr}
        </div>
      </div>

      {/* Overlay */}
      <div className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`} onClick={closeSidebar} />

      {/* Sidebar */}
      <aside style={{
        width: 220,
        background: 'rgba(14,17,22,0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderRight: '1px solid rgba(252,213,53,0.08)',
        display: 'flex', flexDirection: 'column',
        position: 'fixed', top: 0, left: 0, height: '100vh', zIndex: 100,
        // mobile: slide in/out
        ...(isMobile ? {
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
        } : {}),
      }}>
        {sidebarContent}
      </aside>

      {/* Main content */}
      <main style={{
        marginLeft: isMobile ? 0 : 220,
        flex: 1,
        padding: isMobile ? '68px 16px 24px' : '28px 32px',
        minHeight: '100vh',
        maxWidth: isMobile ? '100vw' : 'calc(100vw - 220px)',
        position: 'relative', zIndex: 1,
      }}>
        <div key={location.pathname} className="page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
