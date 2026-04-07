import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../api/axios';

interface Message { role: 'user' | 'bot'; text: string; }

export default function ChatbotPage() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<Message[]>([
    { role: 'bot', text: t('chatbot.greeting', 'Hello! I am your KisanServe AI assistant. Ask me anything about farming.') }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(m => [...m, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('/api/chatbot/query',
        { query: userMsg },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessages(m => [...m, { role: 'bot', text: res.data.response ?? res.data.answer ?? 'No response' }]);
    } catch {
      setMessages(m => [...m, { role: 'bot', text: 'Sorry, AI service is unavailable. Please check your OpenAI API key.' }]);
    } finally { setLoading(false); }
  }

  return (
    <div style={styles.wrapper}>
      <h2 style={{ color: '#2d6a4f' }}>🤖 {t('chatbot.title', 'AI Farming Assistant')}</h2>
      <div style={styles.chatBox}>
        {messages.map((m, i) => (
          <div key={i} style={{ ...styles.bubble, ...(m.role === 'user' ? styles.userBubble : styles.botBubble) }}>
            {m.text}
          </div>
        ))}
        {loading && <div style={{ ...styles.bubble, ...styles.botBubble }}>...</div>}
        <div ref={bottomRef} />
      </div>
      <div style={styles.inputRow}>
        <input style={styles.input} value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={t('chatbot.placeholder', 'Ask about crops, weather, pests...')} />
        <button style={styles.btn} onClick={send} disabled={loading || !input.trim()}>
          {t('chatbot.send', 'Send')}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' },
  chatBox: { flex: 1, overflowY: 'auto', background: '#f8f9fa', borderRadius: 12, padding: 16, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8 },
  bubble: { maxWidth: '75%', padding: '10px 14px', borderRadius: 12, fontSize: 14, lineHeight: 1.5 },
  botBubble: { background: '#d8f3dc', alignSelf: 'flex-start' },
  userBubble: { background: '#2d6a4f', color: '#fff', alignSelf: 'flex-end' },
  inputRow: { display: 'flex', gap: 8 },
  input: { flex: 1, padding: '12px 16px', borderRadius: 8, border: '1px solid #ccc', fontSize: 14 },
  btn: { background: '#2d6a4f', color: '#fff', border: 'none', borderRadius: 8, padding: '0 24px', cursor: 'pointer', fontWeight: 600 },
};
