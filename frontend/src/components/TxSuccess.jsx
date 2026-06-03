export function TxSuccess({ data, onClose }) {
  if (!data) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 340,
          background: '#111', borderRadius: 22,
          border: '1px solid rgba(0,192,118,0.2)',
          borderTop: '2px solid #00c076',
          boxShadow: '0 0 60px rgba(0,192,118,0.15)',
          padding: '28px 24px 24px',
          textAlign: 'center',
          animation: 'modalPop 0.3s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        <div style={{
          width: 64, height: 64, borderRadius: '50%', margin: '0 auto 16px',
          background: 'rgba(0,192,118,0.12)', border: '2px solid rgba(0,192,118,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="#00c076" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 6 }}>
          {data.title}
        </div>
        <div style={{ fontSize: 13, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
          {data.subtitle}
        </div>

        {data.amount && (
          <div style={{
            display: 'inline-block', padding: '10px 24px', borderRadius: 12,
            background: 'rgba(0,192,118,0.08)', border: '1px solid rgba(0,192,118,0.15)',
            fontSize: 20, fontWeight: 900, color: '#00c076', marginBottom: 16,
          }}>
            {data.amount}
          </div>
        )}

        {data.hash && (
          <div style={{
            fontSize: 10, color: '#333', marginBottom: 16,
            fontFamily: 'monospace', letterSpacing: 0.5,
          }}>
            Tx: {data.hash.slice(0, 18)}...{data.hash.slice(-6)}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%', padding: '13px 0', borderRadius: 12,
            fontSize: 14, fontWeight: 800,
            background: 'linear-gradient(135deg, #00c076, #009960)',
            color: '#fff', border: 'none', cursor: 'pointer',
          }}
        >
          Done
        </button>
      </div>
    </div>
  );
}
