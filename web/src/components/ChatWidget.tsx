import React, { useState, useRef, useEffect } from 'react';
import api from '../api/axios';

interface Message { role: 'user' | 'bot'; text: string; }

const QUICK_QUESTIONS = [
  'How to grow wheat?',
  'Pest management tips',
  'Best fertilizer for rice',
  'How to improve soil?',
  'Government schemes for farmers',
];

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '👋 Hello! I\'m your KisanServe AI assistant.\n\nHow may I help you today? Ask me anything about farming!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showGreeting, setShowGreeting] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  // Show greeting bubble after 2 seconds
  useEffect(() => {
    const t = setTimeout(() => setShowGreeting(true), 2000);
    return () => clearTimeout(t);
  }, []);

  async function send(text?: string) {
    const query = (text ?? input).trim();
    if (!query) return;
    setInput('');
    setShowGreeting(false);
    setMessages(m => [...m, { role: 'user', text: query }]);
    setLoading(true);
    try {
      const res = await axios.post('/api/chatbot/query', { query },
        { headers: { Authorization: `Bearer ${token}` } });
      setMessages(m => [...m, { role: 'bot', text: res.data.response ?? 'No response' }]);
    } catch {
      setMessages(m => [...m, { role: 'bot', text: 'Sorry, I\'m having trouble connecting. Please try again.' }]);
    } finally { setLoading(false); }
  }

  return (
    <>
      {/* Greeting bubble */}
      {!open && showGreeting && (
        <div style={s.greetingBubble} onClick={() => { setOpen(true); setShowGreeting(false); }}>
          <span>👋 How may I help you?</span>
          <button style={s.greetingClose} onClick={e => { e.stopPropagation(); setShowGreeting(false); }}>✕</button>
        </div>
      )}

      {/* FAB button */}
      <button style={s.fab} onClick={() => { setOpen(o => !o); setShowGreeting(false); }}
        title="AI Farming Assistant">
        {open ? '✕' : '🤖'}
      </button>

      {/* Chat popup */}
      {open && (
        <div style={s.popup}>
          {/* Header */}
          <div style={s.header}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 22 }}>🤖</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>KisanServe AI</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>🟢 Online — Farming Assistant</div>
              </div>
            </div>
            <button style={s.closeBtn} onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* Messages */}
          <div style={s.messages}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 8 }}>
                {m.role === 'bot' && <span style={{ fontSize: 18, marginRight: 6, alignSelf: 'flex-end' }}>🤖</span>}
                <div style={{ ...s.bubble, ...(m.role === 'user' ? s.userBubble : s.botBubble) }}>
                  {m.text.split('\n').map((line, j) => <span key={j}>{line}<br /></span>)}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18 }}>🤖</span>
                <div style={{ ...s.bubble, ...s.botBubble }}>
                  <span style={s.typing}>● ● ●</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick questions */}
          {messages.length <= 1 && (
            <div style={s.quickRow}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q} style={s.quickBtn} onClick={() => send(q)}>{q}</button>
              ))}
            </div>
          )}

          {/* Input */}
          <div style={s.inputRow}>
            <input style={s.input} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              placeholder="Ask about crops, pests, weather..." />
            <button style={s.sendBtn} onClick={() => send()} disabled={loading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  fab: {
    position: 'fixed', bottom: 80, left: 16, zIndex: 500,
    width: 52, height: 52, borderRadius: '50%',
    background: '#2d6a4f', color: '#fff', border: 'none',
    fontSize: 24, cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(45,106,79,0.5)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  greetingBubble: {
    position: 'fixed', bottom: 140, left: 16, zIndex: 499,
    background: '#fff', borderRadius: 12, padding: '10px 14px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
    fontSize: 13, color: '#333', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8,
    maxWidth: 200, border: '1px solid #e0e0e0',
  },
  greetingClose: {
    background: 'none', border: 'none', cursor: 'pointer',
    color: '#999', fontSize: 12, padding: 0,
  },
  popup: {
    position: 'fixed', bottom: 140, left: 16, zIndex: 500,
    width: 320, height: 460,
    background: '#fff', borderRadius: 16,
    boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
    display: 'flex', flexDirection: 'column',
    overflow: 'hidden', border: '1px solid #e0e0e0',
  },
  header: {
    background: '#2d6a4f', color: '#fff',
    padding: '12px 14px',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  closeBtn: {
    background: 'rgba(255,255,255,0.2)', border: 'none',
    color: '#fff', borderRadius: 6, padding: '4px 8px',
    cursor: 'pointer', fontSize: 12,
  },
  messages: {
    flex: 1, overflowY: 'auto', padding: '12px',
    background: '#f8f9fa',
  },
  bubble: {
    maxWidth: '80%', padding: '8px 12px',
    borderRadius: 12, fontSize: 13, lineHeight: 1.5,
  },
  botBubble: { background: '#fff', border: '1px solid #e0e0e0', borderBottomLeftRadius: 4 },
  userBubble: { background: '#2d6a4f', color: '#fff', borderBottomRightRadius: 4 },
  typing: { color: '#2d6a4f', letterSpacing: 2, fontSize: 16 },
  quickRow: {
    padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 4,
    borderTop: '1px solid #f0f0f0', background: '#fff',
  },
  quickBtn: {
    background: '#d8f3dc', color: '#2d6a4f', border: 'none',
    borderRadius: 20, padding: '4px 10px', cursor: 'pointer',
    fontSize: 11, fontWeight: 500,
  },
  inputRow: {
    display: 'flex', gap: 6, padding: '10px 12px',
    borderTop: '1px solid #f0f0f0', background: '#fff',
  },
  input: {
    flex: 1, padding: '8px 12px', borderRadius: 20,
    border: '1px solid #ddd', fontSize: 13, outline: 'none',
  },
  sendBtn: {
    background: '#2d6a4f', color: '#fff', border: 'none',
    borderRadius: '50%', width: 36, height: 36,
    cursor: 'pointer', fontSize: 16,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
};
