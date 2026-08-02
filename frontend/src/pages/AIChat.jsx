import { useEffect, useRef, useState } from 'react';
import { useApp } from '../App.jsx';
import { aiChatSend } from '../api.js';

export default function AIChat() {
  const { address } = useApp();
  const [history, setHistory] = useState([]); // [{ role: 'user'|'assistant', text }]
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setError('');
    setHistory(h => [...h, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const r = await aiChatSend(address, text);
      if (!r.data.success) {
        setError(r.data.error || 'Something went wrong');
      } else {
        setHistory(h => [...h, { role: 'assistant', text: r.data.data.reply }]);
      }
    } catch (e) {
      setError('Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', maxHeight: 720 }}>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 6px' }}>
          AI <span style={{ color: '#fcd535' }}>Assistant</span>
        </h2>
        <p style={{ fontSize: 12, color: '#555', margin: 0 }}>
          Ask how AlphaNodes works — packages, staking, fees, withdrawals. Informational only, not financial advice.
        </p>
      </div>

      <div className="card" style={{
        flex: 1, padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 12,
      }}>
        {history.length === 0 && (
          <div style={{ color: '#444', fontSize: 12, textAlign: 'center', padding: '40px 0' }}>
            Ask a question to get started, e.g. "How does the Max package work?"
          </div>
        )}
        {history.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 12, fontSize: 13, lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              background: m.role === 'user' ? 'rgba(252,213,53,0.1)' : 'rgba(255,255,255,0.03)',
              color: m.role === 'user' ? '#fcd535' : '#ddd',
              border: `1px solid ${m.role === 'user' ? 'rgba(252,213,53,0.2)' : 'rgba(255,255,255,0.06)'}`,
            }}>
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: 12, fontSize: 13, color: '#555',
              background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div style={{
          padding: '8px 14px', borderRadius: 8, marginBottom: 10, fontSize: 12,
          background: 'rgba(255,77,77,0.1)', border: '1px solid rgba(255,77,77,0.2)', color: '#ff4d4d',
        }}>{error}</div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask a question..."
          style={{
            flex: 1, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 13, outline: 'none',
          }}
        />
        <button
          className="btn-primary"
          onClick={send}
          disabled={loading || !input.trim()}
          style={{ padding: '0 22px', borderRadius: 10, fontSize: 13, fontWeight: 800 }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
