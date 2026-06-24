import { useState, useRef, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { sendChat } from '../services/api';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

const QUICK_QUESTIONS = [
  { emoji: '🌾', text: 'What crops suit my soil?', key: 'crops_soil' },
  { emoji: '🐛', text: 'My leaves have yellow spots', key: 'yellow_spots' },
  { emoji: '💧', text: 'When should I irrigate?', key: 'irrigation' },
  { emoji: '🏛️', text: 'What government schemes can I apply for?', key: 'schemes' },
  { emoji: '📈', text: 'Best market to sell my crop?', key: 'market' },
  { emoji: '🌧️', text: 'Will it rain this week?', key: 'rain' },
];

export default function Chat() {
  const { farmData } = useContext(FarmContext);
  const { t } = useTranslation();
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Namaste! 🙏 I\'m FarmSense AI, your farming assistant.\n\nAsk me about:\n• Crop diseases & treatment\n• What to plant based on your soil\n• Irrigation advice\n• Government schemes\n• Market prices\n\nI\'m powered by RAG (Retrieval-Augmented Generation) for accurate farming knowledge!',
      time: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', text: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const response = await sendChat(msg, farmData);
      const aiMsg = {
        role: 'ai',
        text: response.message || 'No response received.',
        sources: response.sources || [],
        mode: response.mode || 'unknown',
        time: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Sorry, I couldn\'t process that. Make sure the ML service is running.',
        time: new Date()
      }]);
    }
    setLoading(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 56px)', maxWidth: 600, margin: '0 auto' }}>

      {/* Header */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid rgba(129,199,132,0.1)',
        background: 'rgba(10,15,10,0.8)', backdropFilter: 'blur(12px)'
      }}>
        <SmartToyIcon sx={{ color: '#4ade80', fontSize: 28 }} />
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }} className="gradient-text">FarmSense AI</h2>
          <p style={{ fontSize: '0.65rem', color: '#607d6c', margin: 0 }}>LLM + RAG + ChromaDB</p>
        </div>
        <span style={{
          marginLeft: 'auto', fontSize: '0.6rem', padding: '2px 8px', borderRadius: 99,
          background: 'rgba(74,222,128,0.15)', color: '#4ade80', fontWeight: 600
        }}>Online</span>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '12px 12px 0', display: 'flex',
        flexDirection: 'column', gap: 10
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex', gap: 8,
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            alignItems: 'flex-start'
          }} className="fade-in">
            {/* Avatar */}
            <div style={{
              width: 30, height: 30, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : 'linear-gradient(135deg, #0d9488, #0891b2)'
            }}>
              {msg.role === 'user'
                ? <PersonIcon sx={{ fontSize: 16, color: '#fff' }} />
                : <SmartToyIcon sx={{ fontSize: 16, color: '#fff' }} />
              }
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: '80%', padding: '10px 14px', borderRadius: 14,
              fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, rgba(22,163,74,0.2), rgba(21,128,61,0.15))'
                : 'rgba(255,255,255,0.04)',
              border: msg.role === 'user'
                ? '1px solid rgba(22,163,74,0.3)'
                : '1px solid rgba(255,255,255,0.06)',
              borderTopLeftRadius: msg.role === 'ai' ? 4 : 14,
              borderTopRightRadius: msg.role === 'user' ? 4 : 14
            }}>
              {msg.text}

              {/* Sources badge */}
              {msg.sources && msg.sources.length > 0 && (
                <div style={{
                  marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,0.06)',
                  fontSize: '0.6rem', color: '#607d6c'
                }}>
                  📚 Sources: {msg.sources.map(s => s.source || s.disease || s.topic || s.scheme).filter(Boolean).join(', ')}
                  {msg.mode && <span style={{ float: 'right', opacity: 0.6 }}>{msg.mode}</span>}
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }} className="fade-in">
            <div style={{
              width: 30, height: 30, borderRadius: '50%', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              background: 'linear-gradient(135deg, #0d9488, #0891b2)'
            }}>
              <SmartToyIcon sx={{ fontSize: 16, color: '#fff' }} />
            </div>
            <div style={{
              padding: '10px 16px', borderRadius: 14, borderTopLeftRadius: 4,
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)'
            }}>
              <CircularProgress size={14} sx={{ color: '#4ade80' }} />
              <span style={{ fontSize: '0.75rem', color: '#607d6c', marginLeft: 8 }}>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions */}
      {messages.length <= 1 && (
        <div style={{
          padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 6
        }}>
          {QUICK_QUESTIONS.map(q => (
            <button key={q.key} onClick={() => handleSend(q.text)} style={{
              padding: '6px 12px', borderRadius: 99, border: '1px solid rgba(129,199,132,0.2)',
              background: 'rgba(129,199,132,0.06)', color: '#a7f3d0', fontSize: '0.7rem',
              cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s'
            }}
              onMouseOver={e => e.target.style.background = 'rgba(129,199,132,0.15)'}
              onMouseOut={e => e.target.style.background = 'rgba(129,199,132,0.06)'}
            >
              {q.emoji} {q.text}
            </button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <div style={{
        padding: '10px 12px 12px', display: 'flex', gap: 8, alignItems: 'flex-end',
        borderTop: '1px solid rgba(129,199,132,0.1)',
        background: 'rgba(10,15,10,0.8)', backdropFilter: 'blur(12px)'
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder') || 'Ask about crops, diseases, weather...'}
          rows={1}
          style={{
            flex: 1, resize: 'none', padding: '10px 14px', borderRadius: 14,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(129,199,132,0.15)',
            color: '#e8f5e9', fontSize: '0.82rem', outline: 'none',
            fontFamily: 'inherit', minHeight: 40, maxHeight: 100
          }}
        />
        <IconButton
          onClick={() => handleSend()}
          disabled={!input.trim() || loading}
          sx={{
            background: 'linear-gradient(135deg, #16a34a, #15803d)',
            color: '#fff', width: 40, height: 40,
            '&:hover': { background: 'linear-gradient(135deg, #22c55e, #16a34a)' },
            '&.Mui-disabled': { background: 'rgba(255,255,255,0.05)', color: '#607d6c' }
          }}
        >
          <SendIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </div>
    </div>
  );
}
