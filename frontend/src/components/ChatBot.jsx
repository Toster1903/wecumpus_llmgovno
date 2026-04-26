import { useEffect, useRef, useState } from 'react';
import api from '../api/axios';

const WELCOME = 'Привет! Я AI-ассистент кампуса Сириус. Могу помочь найти соседей по интересам, рассказать о событиях, попутках и маркетплейсе. Спрашивай!';

const ChatBot = ({ onUnauthorized }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: WELCOME },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [hasError, setHasError] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;

    const next = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setIsSending(true);
    setHasError(false);

    // Build history for API (exclude welcome message)
    const history = next.slice(1, -1).map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await api.post('/ai/chat', {
        message: text,
        history,
      });
      setMessages([...next, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      if (err?.response?.status === 401) { onUnauthorized?.(); return; }
      setMessages([
        ...next,
        { role: 'assistant', content: 'AI-ассистент временно недоступен. Проверьте, запущен ли Ollama (`ollama serve`).' },
      ]);
      setHasError(true);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 1000,
          width: 52,
          height: 52,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #10b981, #06b6d4)',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(16,185,129,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '1.4rem',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.08)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
        title="AI-ассистент"
      >
        {isOpen ? '✕' : '✦'}
      </button>

      {/* Chat window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '5.5rem',
            right: '1.5rem',
            zIndex: 1000,
            width: 360,
            maxHeight: 520,
            borderRadius: '1.25rem',
            background: 'rgba(255,255,255,0.97)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(0,0,0,0.08)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '0.9rem 1rem',
            background: 'linear-gradient(135deg, #10b981, #06b6d4)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}>
            <span style={{ fontSize: '1.2rem' }}>✦</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>AI-ассистент Сириус</div>
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div
                  style={{
                    maxWidth: '82%',
                    borderRadius: msg.role === 'user' ? '1rem 1rem 0.25rem 1rem' : '1rem 1rem 1rem 0.25rem',
                    padding: '0.55rem 0.8rem',
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    background: msg.role === 'user'
                      ? 'linear-gradient(135deg, #10b981, #06b6d4)'
                      : '#f1f5f9',
                    color: msg.role === 'user' ? 'white' : '#1e293b',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {isSending && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: '#f1f5f9', borderRadius: '1rem 1rem 1rem 0.25rem', padding: '0.55rem 0.8rem', fontSize: '1rem', color: '#64748b' }}>
                  <span style={{ animation: 'pulse 1.2s infinite' }}>···</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {hasError && (
            <div style={{ padding: '0.4rem 0.75rem', fontSize: '0.72rem', color: '#ef4444', background: '#fef2f2', borderTop: '1px solid #fecaca' }}>
              Запустите Ollama: <code>ollama serve</code> и <code>ollama pull qwen2.5:3b</code>
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={send}
            style={{
              padding: '0.6rem 0.75rem',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '0.4rem',
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
              placeholder="Спроси что-нибудь..."
              style={{
                flex: 1,
                border: '1px solid #e2e8f0',
                borderRadius: '0.75rem',
                padding: '0.5rem 0.75rem',
                fontSize: '0.85rem',
                outline: 'none',
                background: '#f8fafc',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#10b981'; }}
              onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isSending}
              style={{
                background: 'linear-gradient(135deg, #10b981, #06b6d4)',
                border: 'none',
                borderRadius: '0.75rem',
                padding: '0.5rem 0.85rem',
                color: 'white',
                fontSize: '0.85rem',
                cursor: 'pointer',
                opacity: (!input.trim() || isSending) ? 0.6 : 1,
              }}
            >
              ↑
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatBot;
