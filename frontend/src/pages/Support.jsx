import { useEffect, useState } from 'react';
import { useApp } from '../App.jsx';
import { getTickets, createTicket, replyTicket } from '../api.js';

const fmtDate = (d) => new Date(d).toLocaleString();

const STATUS_COLOR = { open: '#fcd535', answered: '#00c076', closed: '#555' };

export default function Support() {
  const { address } = useApp();
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');
  const [openId, setOpenId] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => { if (address) fetchTickets(); }, [address]);

  const fetchTickets = async () => {
    try {
      const r = await getTickets(address);
      setTickets(r.data.data || []);
    } catch (e) {}
  };

  const showMsg = (text, err) => { setMsg({ text, err }); setTimeout(() => setMsg(''), 3500); };

  const handleCreate = async () => {
    if (!subject.trim() || !message.trim()) return showMsg('Enter a subject and message', true);
    setLoading('create');
    try {
      const r = await createTicket({ address, subject: subject.trim(), message: message.trim() });
      if (!r.data.success) return showMsg(r.data.error || 'Failed to create ticket', true);
      setSubject(''); setMessage('');
      showMsg('Ticket submitted');
      fetchTickets();
    } catch (e) { showMsg('Request failed', true); }
    finally { setLoading(''); }
  };

  const handleReply = async (id) => {
    if (!replyText.trim()) return;
    setLoading('reply-' + id);
    try {
      const r = await replyTicket(id, { address, message: replyText.trim() });
      if (!r.data.success) return showMsg(r.data.error || 'Failed to reply', true);
      setReplyText('');
      fetchTickets();
    } catch (e) { showMsg('Request failed', true); }
    finally { setLoading(''); }
  };

  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>
          Support <span style={{ color: '#fcd535' }}>Center</span>
        </h2>
        <p style={{ fontSize: 13, color: '#555', margin: 0 }}>
          Have a question or an issue? Open a ticket and our team will respond.
        </p>
      </div>

      {msg && (
        <div style={{
          padding: '8px 14px', borderRadius: 8, marginBottom: 12, fontSize: 12,
          background: msg.err ? 'rgba(255,77,77,0.1)' : 'rgba(0,192,118,0.1)',
          border: `1px solid ${msg.err ? 'rgba(255,77,77,0.2)' : 'rgba(0,192,118,0.2)'}`,
          color: msg.err ? '#ff4d4d' : '#00c076',
        }}>{msg.text}</div>
      )}

      {/* New ticket */}
      <div className="card" style={{ padding: '18px 20px', marginBottom: 20, borderTop: '2px solid #fcd535' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>New Ticket</div>
        <input
          value={subject}
          onChange={e => setSubject(e.target.value)}
          placeholder="Subject"
          style={{
            width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 13,
            outline: 'none', marginBottom: 10, boxSizing: 'border-box',
          }}
        />
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your issue..."
          rows={4}
          style={{
            width: '100%', background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 13,
            outline: 'none', marginBottom: 12, boxSizing: 'border-box', resize: 'vertical',
            fontFamily: 'inherit',
          }}
        />
        <button
          className="btn-primary"
          onClick={handleCreate}
          disabled={loading === 'create'}
          style={{ padding: '11px 24px', borderRadius: 10, fontSize: 13, fontWeight: 800 }}
        >
          {loading === 'create' ? 'Submitting...' : 'Submit Ticket'}
        </button>
      </div>

      {/* Ticket list */}
      <div className="card" style={{ padding: '16px 20px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 12 }}>Your Tickets</div>
        {tickets.length === 0 ? (
          <div style={{ color: '#555', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
            No tickets yet
          </div>
        ) : tickets.map(t => (
          <div key={t._id} style={{
            marginBottom: 10, borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.02)', overflow: 'hidden',
          }}>
            <div
              onClick={() => setOpenId(openId === t._id ? null : t._id)}
              style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.subject}</div>
                <div style={{ fontSize: 11, color: '#555', marginTop: 2 }}>{fmtDate(t.createdAt)}</div>
              </div>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 10,
                color: STATUS_COLOR[t.status], background: `${STATUS_COLOR[t.status]}15`,
                border: `1px solid ${STATUS_COLOR[t.status]}30`, textTransform: 'uppercase',
              }}>{t.status}</span>
            </div>

            {openId === t._id && (
              <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 12, color: '#aaa', padding: '10px 0', lineHeight: 1.6 }}>{t.message}</div>
                {t.replies.map((r, i) => (
                  <div key={i} style={{
                    padding: '8px 10px', marginBottom: 6, borderRadius: 8, fontSize: 12, lineHeight: 1.5,
                    background: r.from === 'admin' ? 'rgba(252,213,53,0.06)' : 'rgba(255,255,255,0.03)',
                    borderLeft: `2px solid ${r.from === 'admin' ? '#fcd535' : '#555'}`,
                  }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: r.from === 'admin' ? '#fcd535' : '#888', marginBottom: 3 }}>
                      {r.from === 'admin' ? 'Support Team' : 'You'} · {fmtDate(r.createdAt)}
                    </div>
                    {r.message}
                  </div>
                ))}
                {t.status !== 'closed' && (
                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      placeholder="Reply..."
                      style={{
                        flex: 1, background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 12, outline: 'none',
                      }}
                    />
                    <button
                      onClick={() => handleReply(t._id)}
                      disabled={loading === 'reply-' + t._id}
                      style={{
                        fontSize: 12, fontWeight: 700, padding: '8px 14px', borderRadius: 8,
                        background: 'rgba(252,213,53,0.1)', color: '#fcd535',
                        border: '1px solid rgba(252,213,53,0.25)', cursor: 'pointer',
                      }}
                    >
                      Send
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
