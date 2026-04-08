import React, { useState, useRef, useEffect } from 'react';
import api from '../api/axios';

interface Message { role: 'user' | 'bot'; text: string; }

const QUICK_QUESTIONS = [
  '🌾 Best fertilizer for wheat?',
  '🍅 How to treat tomato blight?',
  '💧 Irrigation schedule for rice?',
  '🐛 How to control aphids organically?',
  '🌱 When to sow cotton in Maharashtra?',
  '💰 PM Kisan scheme eligibility?',
  '🌿 Soil testing procedure?',
  '🌧️ Crop insurance scheme details?',
];

export default function ChatbotPage() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: '🌾 Namaste! I am KisanServe AI — your farming assistant.\n\nI can help you with:\n• Crop diseases & treatment\n• Fertilizer & irrigation advice\n• Government schemes for farmers\n• Pest control & soil health\n• Market prices & weather tips\n\nAsk me anything about farming!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  async function send(text?: string) {
    const query = (text ?? input).trim();
    if (!query || loading) return;
    setInput('');
    setMessages(m => [...m, { role: 'user', text: query }]);
    setLoading(true);
    try {
      const res = await api.post('/api/chatbot/query',
        { query },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(m => [...m, { role: 'bot', text: res.data.response }]);
    } catch (e: any) {
      const err = e.response?.data?.error || 'AI service unavailable. Please try again.';
      setMessages(m => [...m, { role: 'bot', text: `❌ ${err}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <span style={s.headerIcon}>🤖</span>
        <div>
          <div style={s.headerTitle}>KisanServe AI Assistant</div>
          <div style={s.headerSub}>Powered by Gemini AI · Farming experts only</div>
        </div>
        <span style={s.onlineDot}>● Online</span>
      </div>

      <div style={s.chatBox}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {m.role === 'bot' && <span style={s.botLabel}>🌾 KisanServe AI</span>}
            <div style={{ ...s.bubble, ...(m.role === 'user' ? s.userBubble : s.botBubble) }}>
              {m.text.split('\n').map((line, j) => (
                <span key={j}>{line}{j < m.text.split('\n').length - 1 && <br />}</span>
              ))}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <span style={s.botLabel}>🌾 KisanServe AI</span>
            <div style={{ ...s.bubble, ...s.botBubble }}>
              <span style={s.typing}>●●●</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div style={s.quickWrap}>
          <p style={s.quickLabel}>Quick questions:</p>
          <div style={s.quickRow}>
            {QUICK_QUESTIONS.map(q => (
              <button key={q} style={s.quickBtn} onClick={() => send(q.replace(/^[^\s]+\s/, ''))}>
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={s.inputRow}>
        <input style={s.input} value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Ask about crops, soil, pests, schemes..."
          disabled={loading} />
        <button style={{ ...s.btn, opacity: loading || !input.trim() ? 0.6 : 1 }}
          onClick={() => send()} disabled={loading || !input.trim()}>
          ➤
        </button>
      </div>
      <p style={s.disclaimer}>Only answers farming & agriculture questions</p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)', gap: 8 },
  header: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#2d6a4f', borderRadius: 12, padding: '10px 16px', color: '#fff',
  },
  headerIcon: { fontSize: 28 },
  headerTitle: { fontWeight: 700, fontSize: 15 },
  headerSub: { fontSize: 11, opacity: 0.75, marginTop: 1 },
  onlineDot: { marginLeft: 'auto', fontSize: 11, color: '#95d5b2' },
  chatBox: {
    flex: 1, overflowY: 'auto', background: '#f8faf9',
    borderRadius: 12, padding: 16, display: 'flex',
    flexDirection: 'column', gap: 10, border: '1px solid #e8f5e9',
  },
  botLabel: { fontSize: 10, color: '#888', marginBottom: 2, marginLeft: 4 },
  bubble: { maxWidth: '80%', padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.6 },
  botBubble: { background: '#fff', border: '1px solid #d8f3dc', color: '#1a1a2e', borderRadius: '4px 12px 12px 12px' },
  userBubble: { background: '#2d6a4f', color: '#fff', borderRadius: '12px 4px 12px 12px' },
  typing: { letterSpacing: 3, color: '#2d6a4f', fontWeight: 700 },
  quickWrap: { background: '#fff', borderRadius: 10, padding: '10px 12px', border: '1px solid #e8f5e9' },
  quickLabel: { margin: '0 0 8px', fontSize: 12, color: '#888', fontWeight: 600 },
  quickRow: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  quickBtn: {
    background: '#f0faf4', color: '#2d6a4f', border: '1px solid #b7e4c7',
    borderRadius: 20, padding: '5px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 500,
  },
  inputRow: { display: 'flex', gap: 8 },
  input: {
    flex: 1, padding: '12px 16px', borderRadius: 10,
    border: '1.5px solid #b7e4c7', fontSize: 14, outline: 'none',
    background: '#fff',
  },
  btn: {
    background: '#2d6a4f', color: '#fff', border: 'none',
    borderRadius: 10, padding: '0 20px', cursor: 'pointer',
    fontWeight: 700, fontSize: 18,
  },
  disclaimer: { textAlign: 'center', fontSize: 11, color: '#aaa', margin: 0 },
};
