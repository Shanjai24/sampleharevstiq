import { useState, useRef, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../context/FarmContext';
import { sendChat, analyzeVision, getChatStatus } from '../services/api';
import { speakText, stopSpeaking, startListening, isSpeechSynthesisSupported, isSpeechRecognitionSupported } from '../services/voice';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CloseIcon from '@mui/icons-material/Close';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import MicIcon from '@mui/icons-material/Mic';

const QUICK_QUESTIONS = [
  { emoji: '🌾', text: 'What crops suit my soil best?', key: 'crops_soil' },
  { emoji: '🐛', text: 'How to treat yellow spots on leaves?', key: 'yellow_spots' },
  { emoji: '💧', text: 'Optimal irrigation schedule for my plot?', key: 'irrigation' },
  { emoji: '🏛️', text: 'Which government subsidy schemes apply?', key: 'schemes' },
  { emoji: '📈', text: 'Which Mandi gives highest crop price?', key: 'market' },
  { emoji: '🌧️', text: 'Will heavy rainfall impact harvest?', key: 'rain' },
];

export default function Chat() {
  const { farmData } = useContext(FarmContext);
  const { t, i18n } = useTranslation();
  
  // Tab state: 'chat' | 'vision'
  const [activeTab, setActiveTab] = useState('chat');

  // AI status
  const [chatStatus, setChatStatus] = useState({ online: null, mode: 'loading' });
  useEffect(() => {
    getChatStatus().then(s => setChatStatus(s)).catch(() => setChatStatus({ online: false, mode: 'limited' }));
  }, []);

  // Voice state
  const [speakingId, setSpeakingId] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  const handleSpeak = (id, text) => {
    if (speakingId === id) { stopSpeaking(); setSpeakingId(null); return; }
    stopSpeaking();
    setSpeakingId(id);
    speakText(text, i18n.language || 'en', { onEnd: () => setSpeakingId(null), onError: () => setSpeakingId(null) });
  };

  const handleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }
    const rec = startListening({
      lang: i18n.language || 'en',
      onStart: () => setIsListening(true),
      onResult: (transcript) => { setInput(prev => prev + transcript); setIsListening(false); },
      onError: () => setIsListening(false),
      onEnd: () => setIsListening(false)
    });
    recognitionRef.current = rec;
  };

  // Chat State
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Namaste! 🙏 I\'m AgroPredict AI, your dedicated crop intelligence advisor.\n\nI can help you with:\n• Leaf disease diagnosis & photo scanning\n• Soil NPK & organic conditioning\n• Groundwater safety & irrigation planning\n• Mandi market prices & MSP procurement\n\nHow can I help your farm today?',
      time: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Vision Scan State
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [cropHint, setCropHint] = useState('');
  const [visionLoading, setVisionLoading] = useState(false);
  const [visionResult, setVisionResult] = useState(null);
  const [visionError, setVisionError] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Chat Handler
  const handleSend = async (text) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMsg = { role: 'user', text: msg, time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('CHAT_TIMEOUT')), 10000)
      );
      const response = await Promise.race([sendChat(msg, farmData), timeoutPromise]);
      const aiMsg = {
        role: 'ai',
        text: response.message || response.answer || 'No response received.',
        sources: response.sources || [],
        mode: response.mode || 'AgroPredict AI Engine',
        time: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('[AgroPredict Chat Error]:', error);
      const isTimeout = error.message === 'CHAT_TIMEOUT';
      const fallbackCrop = farmData?.crops?.[0]?.crop || 'Rice';
      const fallbackSoil = farmData?.soil?.soilType || 'loam';
      const fallbackDist = farmData?.location?.district || 'your district';
      setMessages(prev => [...prev, {
        role: 'ai',
        text: isTimeout 
          ? `⏱️ **Agronomist Rule Fallback (Response Fast-Path):**\n\nFor your **${fallbackSoil}** plot in **${fallbackDist}**, current advisories recommend focusing on root aeration and optimal moisture for **${fallbackCrop}**.\n\n• **NPK Balance:** Maintain balanced N:P:K split applications according to growth stage.\n• **Watering:** Avoid standing water during root development.\n• **Pest Vigilance:** Inspect under-leaf foliage twice weekly for early signs of leaf blight or mites.`
          : `⚠️ **Notice:** Advisory server unavailable. Please check internet connection and retry.`,
        sources: [{ source: 'instant_rule_engine' }],
        mode: isTimeout ? 'agronomist-fastpath' : 'error-notice',
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

  // Image Selection Handler
  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setVisionError('Please select a photo smaller than 10MB.');
      return;
    }

    setSelectedImage(file);
    setVisionError(null);
    setVisionResult(null);

    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setActiveTab('vision');
    };
    reader.readAsDataURL(file);
  };

  // Vision Analysis Execution
  const handleAnalyzePhoto = async () => {
    if (!imagePreview || visionLoading) return;

    setVisionLoading(true);
    setVisionError(null);
    setVisionResult(null);

    try {
      const res = await analyzeVision(imagePreview, cropHint);
      setVisionResult(res);
    } catch (err) {
      console.error('[Vision Analysis Error]:', err);
      setVisionError('Unable to analyze photo. Please try a clearer photo or describe the symptoms in chat.');
    }
    setVisionLoading(false);
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 110px)', maxHeight: '820px' }}>
      
      {/* Hidden File Input accessible anywhere */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleImageSelect}
      />

      {/* Top Header & Tab Switcher Bar */}
      <div className="glass-card fade-in" style={{
        padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 12, flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #1E5E3A, #2E7D4E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(30, 94, 58, 0.25)'
          }}>
            <AutoAwesomeIcon sx={{ color: '#ffffff', fontSize: 20 }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: '#182420' }}>
                AI Crop Doctor & Farm Advisor
              </h2>
              {/* AI Status Pill (Phase 2.5 Transparency) */}
              {chatStatus.mode === 'loading' ? (
                <span style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: 10, background: '#F8F7F2', border: '1px solid #E5E2D8', color: '#748782', fontWeight: 700 }}>
                  ⏳ Connecting...
                </span>
              ) : chatStatus.online ? (
                <span className="badge-live" style={{ fontSize: '0.68rem', padding: '3px 9px', background: '#EBF5ED', color: '#1E5E3A', border: '1px solid #C6E4CF', borderRadius: 12, fontWeight: 800 }}>
                  <span className="badge-live-dot" />
                  ✨ AI-Powered (Gemini)
                </span>
              ) : (
                <span style={{ fontSize: '0.68rem', padding: '3px 9px', borderRadius: 12, background: '#FFF8E7', border: '1px solid #FCE4B6', color: '#B45309', fontWeight: 800 }}>
                  📘 Basic Advisory Mode (Rule-Based)
                </span>
              )}
            </div>
            <p style={{ fontSize: '0.74rem', color: '#748782', margin: 0 }}>
              {chatStatus.online ? '24/7 Gemini-powered advisory, disease photo diagnosis, & soil solutions' : '24/7 agricultural advisory, disease photo diagnosis, & soil solutions'}
            </p>
          </div>
        </div>

        {/* Tab Toggle Switch */}
        <div style={{
          display: 'flex', background: '#F8F7F2', padding: 4, borderRadius: 12,
          border: '1px solid #E5E2D8'
        }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 9, border: 'none',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              background: activeTab === 'chat' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'chat' ? '#1E5E3A' : '#485954',
              boxShadow: activeTab === 'chat' ? 'var(--shadow-card)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
            <span>Advisory Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('vision')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 9, border: 'none',
              fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer',
              background: activeTab === 'vision' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'vision' ? '#C85A32' : '#485954',
              boxShadow: activeTab === 'vision' ? 'var(--shadow-card)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <CameraAltIcon sx={{ fontSize: 16 }} />
            <span>Photo Scan Diagnosis</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'chat' ? (
        /* TAB 1: Chat Advisory */
        <div className="glass-card fade-in" style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Prominent Discovery Banner for Photo Disease Scan */}
          <div style={{
            background: 'linear-gradient(90deg, #FDF3F0 0%, #FFF8E7 100%)',
            borderBottom: '1px solid #F7D0C4',
            padding: '10px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexWrap: 'wrap', gap: 10
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, background: '#C85A32',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff'
              }}>
                <PhotoCameraIcon sx={{ fontSize: 18 }} />
              </div>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#C85A32' }}>
                  Have an infected crop or yellow leaf?
                </span>
                <span style={{ fontSize: '0.75rem', color: '#485954', marginLeft: 6 }}>
                  Scan a photo for instant disease identification & remedies
                </span>
              </div>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-accent"
              style={{
                padding: '6px 14px', fontSize: '0.78rem', minHeight: 32,
                display: 'inline-flex', alignItems: 'center', gap: 6
              }}
            >
              <CameraAltIcon sx={{ fontSize: 15 }} />
              <span>Upload Leaf Photo</span>
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '18px 20px', display: 'flex',
            flexDirection: 'column', gap: 14
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }} className="fade-in">
                <div style={{
                  width: 34, height: 34, borderRadius: 10, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: msg.role === 'user' ? '#C85A32' : '#1E5E3A',
                  boxShadow: 'var(--shadow-subtle)'
                }}>
                  {msg.role === 'user'
                    ? <PersonIcon sx={{ fontSize: 20, color: '#fff' }} />
                    : <SmartToyIcon sx={{ fontSize: 20, color: '#fff' }} />
                  }
                </div>

                <div style={{
                  maxWidth: '82%', padding: '14px 18px', borderRadius: 14,
                  fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap',
                  background: msg.role === 'user' ? '#FDF3F0' : '#F8F7F2',
                  border: msg.role === 'user' ? '1px solid #F7D0C4' : '1px solid #E5E2D8',
                  color: '#182420',
                  boxShadow: 'var(--shadow-subtle)',
                  borderTopLeftRadius: msg.role === 'ai' ? 2 : 14,
                  borderTopRightRadius: msg.role === 'user' ? 2 : 14
                }}>
                  {msg.text}

                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{
                      marginTop: 10, paddingTop: 8, borderTop: '1px solid #E5E2D8',
                      fontSize: '0.72rem', color: '#748782'
                    }}>
                      📚 <strong>Verified Sources:</strong> {msg.sources.map(s => s.source || s.topic || s.scheme || s.crop || 'Agronomy KB').filter(Boolean).join(', ')}
                    </div>
                  )}

                  {/* TTS Listen button for AI messages */}
                  {msg.role === 'ai' && isSpeechSynthesisSupported() && (
                    <button
                      onClick={() => handleSpeak(`msg-${i}`, msg.text)}
                      title="Listen to advisory"
                      style={{
                        marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '3px 10px', borderRadius: 8, border: '1px solid #C6E4CF',
                        background: 'transparent', color: '#1E5E3A', cursor: 'pointer',
                        fontSize: '0.72rem', fontWeight: 700
                      }}
                    >
                      <VolumeUpIcon sx={{ fontSize: 13 }} />
                      {speakingId === `msg-${i}` ? 'Stop' : '🔊 Listen'}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="fade-in">
                <div style={{
                  width: 34, height: 34, borderRadius: 10, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: '#1E5E3A'
                }}>
                  <SmartToyIcon sx={{ fontSize: 20, color: '#fff' }} />
                </div>
                <div style={{
                  padding: '12px 18px', borderRadius: 14, borderTopLeftRadius: 2,
                  background: '#F8F7F2', border: '1px solid #E5E2D8',
                  display: 'flex', alignItems: 'center', gap: 10
                }}>
                  <CircularProgress size={16} sx={{ color: '#1E5E3A' }} />
                  <span style={{ fontSize: '0.82rem', color: '#485954', fontWeight: 600 }}>
                    Consulting AgroPredict agricultural knowledge base...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {messages.length <= 2 && (
            <div style={{
              padding: '10px 16px', display: 'flex', flexWrap: 'wrap', gap: 8,
              borderTop: '1px solid #E5E2D8', background: '#F8F7F2'
            }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q.key} onClick={() => handleSend(q.text)} style={{
                  padding: '6px 14px', borderRadius: 20, border: '1px solid #C6E4CF',
                  background: '#EBF5ED', color: '#1E5E3A', fontSize: '0.78rem',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 700, transition: 'all 0.15s ease'
                }}>
                  {q.emoji} {q.text}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar with Direct Camera Upload Button + Microphone STT */}
          <div style={{
            padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center',
            borderTop: '1px solid #E5E2D8', background: '#FFFFFF'
          }}>
            {/* Quick Camera Action in Input Bar */}
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Upload crop photo for disease diagnosis"
              style={{
                width: 44, height: 44, borderRadius: 10,
                border: '1px solid #F7D0C4', background: '#FDF3F0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: '#C85A32', flexShrink: 0,
                transition: 'all 0.15s ease'
              }}
            >
              <CameraAltIcon sx={{ fontSize: 22 }} />
            </button>

            {/* Microphone STT button */}
            {isSpeechRecognitionSupported() && (
              <button
                onClick={handleMic}
                title={isListening ? 'Stop listening' : 'Speak your question'}
                style={{
                  width: 44, height: 44, borderRadius: 10,
                  border: `1px solid ${isListening ? '#C85A32' : '#E5E2D8'}`,
                  background: isListening ? '#FDF3F0' : '#F8F7F2',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: isListening ? '#C85A32' : '#748782',
                  flexShrink: 0, transition: 'all 0.15s ease',
                  animation: isListening ? 'pulse 1.5s infinite' : 'none'
                }}
              >
                <MicIcon sx={{ fontSize: 22 }} />
              </button>
            )}

            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? '🎤 Listening...' : (t('chat.placeholder') || 'Ask about crop health, soil NPK, weather advisory, mandi rates...')}
              rows={1}
              style={{
                flex: 1, resize: 'none', padding: '12px 16px', borderRadius: 10,
                background: isListening ? '#FFF8E7' : '#F8F7F2',
                border: `1px solid ${isListening ? '#FCE4B6' : '#E5E2D8'}`,
                color: '#182420', fontSize: '0.88rem', outline: 'none',
                fontFamily: 'inherit', minHeight: 44, maxHeight: 110,
                boxSizing: 'border-box', transition: 'all 0.2s ease'
              }}
            />

            <IconButton
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              sx={{
                background: '#1E5E3A',
                color: '#fff', width: 44, height: 44, borderRadius: 2.5,
                boxShadow: 'var(--shadow-subtle)',
                '&:hover': { background: '#2E7D4E' },
                '&.Mui-disabled': { background: '#E5E2D8', color: '#748782' }
              }}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </div>
        </div>
      ) : (
        /* TAB 2: Photo Crop & Disease Vision Scan */
        <div className="glass-card fade-in" style={{
          flex: 1, overflowY: 'auto', padding: 24, display: 'flex',
          flexDirection: 'column', gap: 18
        }}>
          {/* Upload Zone */}
          <div style={{
            border: '2px dashed #CECBC0', borderRadius: 14,
            padding: 28, textAlign: 'center', background: '#F8F7F2',
            cursor: 'pointer', transition: 'all 0.2s ease'
          }} onClick={() => fileInputRef.current?.click()}>

            {imagePreview ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <img
                  src={imagePreview}
                  alt="Crop preview"
                  style={{
                    maxHeight: 200, maxWidth: '100%', borderRadius: 12,
                    objectFit: 'contain', boxShadow: 'var(--shadow-card)'
                  }}
                />
                <span style={{ fontSize: '0.82rem', color: '#1E5E3A', fontWeight: 800 }}>
                  📷 Photo selected ({selectedImage?.name}) — Tap to choose another
                </span>
              </div>
            ) : (
              <div>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%', background: '#EBF5ED',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 14px'
                }}>
                  <CameraAltIcon sx={{ color: '#1E5E3A', fontSize: 30 }} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px', color: '#182420' }}>
                  Upload Affected Leaf or Plant Photo
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#748782', margin: 0 }}>
                  Take a clear, well-lit photo of foliage symptoms for immediate diagnosis & treatment plan
                </p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Optional crop hint (e.g. Tomato, Rice, Cotton, Chilli)..."
              value={cropHint}
              onChange={e => setCropHint(e.target.value)}
              style={{
                flex: 1, minWidth: 220, padding: '11px 16px', borderRadius: 10,
                border: '1px solid #E5E2D8', background: '#FFFFFF',
                fontSize: '0.86rem', color: '#182420', outline: 'none'
              }}
            />
            <button
              onClick={handleAnalyzePhoto}
              disabled={!imagePreview || visionLoading}
              className="btn-accent"
              style={{
                padding: '11px 22px', fontSize: '0.88rem',
                opacity: (!imagePreview || visionLoading) ? 0.6 : 1
              }}
            >
              {visionLoading ? (
                <>
                  <CircularProgress size={16} sx={{ color: '#fff' }} />
                  <span>Analyzing Plant Health...</span>
                </>
              ) : (
                <>
                  <span>🔍 Run Disease Diagnosis</span>
                </>
              )}
            </button>
          </div>

          {visionError && (
            <div style={{
              padding: '14px 18px', borderRadius: 10, background: '#FDF3F0',
              border: '1px solid #F7D0C4', color: '#C85A32', fontSize: '0.86rem'
            }}>
              ⚠️ {visionError}
            </div>
          )}

              {/* Vision Diagnosis Results Step Cards */}
          {visionResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="fade-in">
              
              {(visionResult.type === 'unclear_photo' || (visionResult.confidence != null && visionResult.confidence < 0.5)) ? (
                <div style={{
                  padding: 20, borderRadius: 12, background: '#FFF8E7',
                  border: '1px solid #FCE4B6', color: '#B45309'
                }}>
                  <h4 style={{ fontWeight: 800, fontSize: '1rem', margin: '0 0 6px' }}>
                    🔍 Uncertain Diagnosis — Try a Clearer Photo
                  </h4>
                  <p style={{ fontSize: '0.86rem', margin: '0 0 10px', lineHeight: 1.55 }}>
                    {visionResult.message || 'Confidence score is below 50%. For an accurate diagnosis, please take a well-lit, close-up photo of an affected single leaf against a plain background and avoid direct lens glare.'}
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.74rem', background: '#FFFFFF', padding: '4px 10px', borderRadius: 8, border: '1px solid #FCE4B6', fontWeight: 600 }}>
                      📸 Close-up single leaf
                    </span>
                    <span style={{ fontSize: '0.74rem', background: '#FFFFFF', padding: '4px 10px', borderRadius: 8, border: '1px solid #FCE4B6', fontWeight: 600 }}>
                      ☀️ Good natural lighting
                    </span>
                    <span style={{ fontSize: '0.74rem', background: '#FFFFFF', padding: '4px 10px', borderRadius: 8, border: '1px solid #FCE4B6', fontWeight: 600 }}>
                      🌱 Provide crop name hint
                    </span>
                  </div>
                </div>
              ) : (
                <>
                  {/* Diagnosis Summary Header */}
                  <div className="hero-card-top-crop" style={{
                    padding: 20, display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12
                  }}>
                    <div>
                      <span style={{ fontSize: '0.74rem', fontWeight: 800, color: '#1E5E3A', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                        {visionResult.type === 'crop_identification' ? '🌱 Crop Identified' : '🍂 Disease & Pest Diagnosis'}
                      </span>
                      <h3 style={{ fontSize: '1.35rem', fontWeight: 800, margin: '2px 0 4px', color: '#182420' }}>
                        {visionResult.title || 'Identified Plant Condition'}
                      </h3>
                      {visionResult.crop && (
                        <span style={{ fontSize: '0.82rem', color: '#485954' }}>
                          Host Crop: <strong>{visionResult.crop}</strong> {visionResult.growthStage ? `• Stage: ${visionResult.growthStage}` : ''}
                        </span>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {/* TTS Listen Button on Vision Result */}
                      {isSpeechSynthesisSupported() && (
                        <button
                          onClick={() => handleSpeak('vision-result', `Diagnosis: ${visionResult.title || 'Plant condition'}. ${visionResult.description || ''} Immediate treatment: ${visionResult.steps?.immediate_organic?.[0] || 'Apply recommended organic remedy'}`)}
                          title="Listen to diagnosis"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '6px 14px', borderRadius: 9, border: '1px solid #C6E4CF',
                            background: '#EBF5ED', color: '#1E5E3A', fontWeight: 700, fontSize: '0.8rem',
                            cursor: 'pointer'
                          }}
                        >
                          <VolumeUpIcon sx={{ fontSize: 16 }} />
                          {speakingId === 'vision-result' ? 'Stop' : '🔊 Listen'}
                        </button>
                      )}

                      <span className="badge-fit-strong" style={{ fontSize: '0.82rem', padding: '5px 14px' }}>
                        {Math.round((visionResult.confidence || 0.88) * 100)}% Confidence
                      </span>
                    </div>
                  </div>

                  {/* 4 Step Remediation Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                    
                    {/* Step 1: Symptoms */}
                    <div style={{
                      padding: 18, borderRadius: 12, background: '#F8F7F2',
                      border: '1px solid #E5E2D8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1E5E3A', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: '#182420' }}>Symptoms & Identification</h4>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#485954', margin: 0, lineHeight: 1.55 }}>
                        {visionResult.description}
                      </p>
                    </div>

                    {/* Step 2: Mechanism & Environmental Triggers */}
                    <div style={{
                      padding: 18, borderRadius: 12, background: '#F8F7F2',
                      border: '1px solid #E5E2D8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#D97706', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: '#182420' }}>Root Cause & Weather Triggers</h4>
                      </div>
                      <p style={{ fontSize: '0.82rem', color: '#485954', margin: 0, lineHeight: 1.55 }}>
                        {visionResult.cause || visionResult.idealConditions || 'Triggered by high humidity and dense canopy moisture.'}
                      </p>
                    </div>

                    {/* Step 3: Immediate Remedies */}
                    <div style={{
                      padding: 18, borderRadius: 12, background: '#F8F7F2',
                      border: '1px solid #E5E2D8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#C85A32', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: '#182420' }}>Treatment Steps & Dosage</h4>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#485954' }}>
                        <strong style={{ color: '#1E5E3A' }}>🌿 Organic Option:</strong>
                        <ul style={{ paddingLeft: 18, margin: '3px 0 8px' }}>
                          {(visionResult.steps?.immediate_organic || ['Spray Neem oil (Azadirachtin 1500ppm) @ 5ml/L water']).map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                        {visionResult.steps?.chemical_options && (
                          <>
                            <strong style={{ color: '#C85A32' }}>🧪 Chemical Option:</strong>
                            <ul style={{ paddingLeft: 18, margin: '3px 0 0' }}>
                              {visionResult.steps.chemical_options.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Step 4: Prevention */}
                    <div style={{
                      padding: 18, borderRadius: 12, background: '#F8F7F2',
                      border: '1px solid #E5E2D8'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1E5E3A', color: '#fff', fontSize: '0.75rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
                        <h4 style={{ fontSize: '0.92rem', fontWeight: 800, margin: 0, color: '#182420' }}>Future Season Prevention</h4>
                      </div>
                      <ul style={{ paddingLeft: 18, margin: 0, fontSize: '0.8rem', color: '#485954', lineHeight: 1.55 }}>
                        {(visionResult.steps?.future_prevention || ['Treat seeds with Trichoderma viride @ 4g/kg before sowing', 'Ensure 45cm row spacing for air circulation']).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
