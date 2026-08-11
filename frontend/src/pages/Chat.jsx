import { useState, useRef, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import { sendChat, analyzeVision } from '../services/api';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';

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
  const { t } = useTranslation();
  
  // Tab state: 'chat' | 'vision'
  const [activeTab, setActiveTab] = useState('chat');

  // Chat State
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: 'Namaste! 🙏 I\'m AgroPredict AI, your dedicated crop intelligence assistant.\n\nI can help you with:\n• Crop disease diagnosis & treatment steps\n• Soil NPK & seasonal rotation advice\n• Groundwater safety & irrigation planning\n• Mandi market prices & profit optimization\n\nHow can I help your farm today?',
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
      const response = await sendChat(msg, farmData);
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
      setMessages(prev => [...prev, {
        role: 'ai',
        text: `⚠️ **Notice:** Unable to connect to the advisory server. Please check your internet connection or try again shortly.`,
        sources: [],
        mode: 'error-notice',
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
      setVisionError('Unable to analyze photo. Please try a clearer photo or describe the issue in chat.');
    }
    setVisionLoading(false);
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 120px)', maxHeight: '760px' }}>
      
      {/* Top Header & Tab Switcher Bar */}
      <div className="glass-card fade-in" style={{
        padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, flexWrap: 'wrap', gap: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg, #2E6F40, #3D8C52)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(46, 111, 64, 0.2)'
          }}>
            <SmartToyIcon sx={{ color: '#ffffff', fontSize: 20 }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: '#1C2826' }}>
              AgroPredict AI Advisory & Photo Diagnosis
            </h2>
            <p style={{ fontSize: '0.72rem', color: '#788A85', margin: 0 }}>
              Ask agronomist questions or upload plant photos for instant diagnosis
            </p>
          </div>
        </div>

        {/* Tab Toggle Switch */}
        <div style={{
          display: 'flex', background: '#F4F3EE', padding: 3, borderRadius: 10,
          border: '1px solid #E6E4DC'
        }}>
          <button
            onClick={() => setActiveTab('chat')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: 'none',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              background: activeTab === 'chat' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'chat' ? '#2E6F40' : '#4A5D58',
              boxShadow: activeTab === 'chat' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <ChatBubbleOutlineIcon sx={{ fontSize: 16 }} />
            <span>Ask Advisory Chat</span>
          </button>

          <button
            onClick={() => setActiveTab('vision')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 8, border: 'none',
              fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
              background: activeTab === 'vision' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'vision' ? '#C85A32' : '#4A5D58',
              boxShadow: activeTab === 'vision' ? '0 2px 6px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.15s ease'
            }}
          >
            <CameraAltIcon sx={{ fontSize: 16 }} />
            <span>Scan Crop Photo</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'chat' ? (
        /* TAB 1: Chat Advisory */
        <div className="glass-card" style={{
          flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden'
        }}>
          {/* Messages Scroll Area */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '16px', display: 'flex',
            flexDirection: 'column', gap: 14
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10,
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start'
              }} className="fade-in">
                <div style={{
                  width: 32, height: 32, borderRadius: 8, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  background: msg.role === 'user'
                    ? '#C85A32'
                    : '#2E6F40'
                }}>
                  {msg.role === 'user'
                    ? <PersonIcon sx={{ fontSize: 18, color: '#fff' }} />
                    : <SmartToyIcon sx={{ fontSize: 18, color: '#fff' }} />
                  }
                </div>

                <div style={{
                  maxWidth: '80%', padding: '12px 16px', borderRadius: 12,
                  fontSize: '0.86rem', lineHeight: 1.55, whiteSpace: 'pre-wrap',
                  background: msg.role === 'user' ? '#FDF3F0' : '#FAF9F5',
                  border: msg.role === 'user' ? '1px solid #F8D2C6' : '1px solid #E6E4DC',
                  color: '#1C2826',
                  borderTopLeftRadius: msg.role === 'ai' ? 2 : 12,
                  borderTopRightRadius: msg.role === 'user' ? 2 : 12
                }}>
                  {msg.text}

                  {msg.sources && msg.sources.length > 0 && (
                    <div style={{
                      marginTop: 8, paddingTop: 6, borderTop: '1px solid #E6E4DC',
                      fontSize: '0.7rem', color: '#788A85'
                    }}>
                      📚 <strong>Sources:</strong> {msg.sources.map(s => s.source || s.topic || s.scheme || s.crop || 'Agronomist KB').filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }} className="fade-in">
                <div style={{
                  width: 32, height: 32, borderRadius: 8, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  background: '#2E6F40'
                }}>
                  <SmartToyIcon sx={{ fontSize: 18, color: '#fff' }} />
                </div>
                <div style={{
                  padding: '10px 14px', borderRadius: 12, borderTopLeftRadius: 2,
                  background: '#FAF9F5', border: '1px solid #E6E4DC',
                  display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <CircularProgress size={14} sx={{ color: '#2E6F40' }} />
                  <span style={{ fontSize: '0.78rem', color: '#4A5D58' }}>Consulting AgroPredict knowledge base...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {messages.length <= 2 && (
            <div style={{
              padding: '8px 12px', display: 'flex', flexWrap: 'wrap', gap: 6,
              borderTop: '1px solid #E6E4DC', background: '#FAF9F5'
            }}>
              {QUICK_QUESTIONS.map(q => (
                <button key={q.key} onClick={() => handleSend(q.text)} style={{
                  padding: '5px 12px', borderRadius: 16, border: '1px solid #C8E6C9',
                  background: '#EBF4ED', color: '#2E6F40', fontSize: '0.75rem',
                  cursor: 'pointer', whiteSpace: 'nowrap', fontWeight: 600, transition: 'all 0.15s'
                }}>
                  {q.emoji} {q.text}
                </button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div style={{
            padding: 12, display: 'flex', gap: 10, alignItems: 'center',
            borderTop: '1px solid #E6E4DC', background: '#FFFFFF'
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder') || 'Ask about crops, soil NPK, diseases, schemes, market rates...'}
              rows={1}
              style={{
                flex: 1, resize: 'none', padding: '10px 14px', borderRadius: 8,
                background: '#FAF9F5', border: '1px solid #E6E4DC',
                color: '#1C2826', fontSize: '0.85rem', outline: 'none',
                fontFamily: 'inherit', minHeight: 40, maxHeight: 100
              }}
            />
            <IconButton
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              sx={{
                background: '#C85A32',
                color: '#fff', width: 40, height: 40, borderRadius: 2,
                '&:hover': { background: '#A04222' },
                '&.Mui-disabled': { background: '#E6E4DC', color: '#788A85' }
              }}
            >
              <SendIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </div>
        </div>
      ) : (
        /* TAB 2: Photo Crop & Disease Vision Scan */
        <div className="glass-card" style={{
          flex: 1, overflowY: 'auto', padding: 20, display: 'flex',
          flexDirection: 'column', gap: 16
        }}>
          {/* Upload Zone */}
          <div style={{
            border: '2px dashed #CECBC0', borderRadius: 12,
            padding: 24, textAlign: 'center', background: '#FAF9F5',
            cursor: 'pointer', transition: 'all 0.2s'
          }} onClick={() => fileInputRef.current?.click()}>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handleImageSelect}
            />

            {imagePreview ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <img
                  src={imagePreview}
                  alt="Crop preview"
                  style={{
                    maxHeight: 180, maxWidth: '100%', borderRadius: 8,
                    objectFit: 'contain', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <span style={{ fontSize: '0.78rem', color: '#2E6F40', fontWeight: 700 }}>
                  📷 Photo selected ({selectedImage?.name}) — Click to change
                </span>
              </div>
            ) : (
              <div>
                <div style={{
                  width: 50, height: 50, borderRadius: '50%', background: '#EBF4ED',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <CameraAltIcon sx={{ color: '#2E6F40', fontSize: 26 }} />
                </div>
                <h3 style={{ fontSize: '0.98rem', fontWeight: 800, margin: '0 0 4px', color: '#1C2826' }}>
                  Upload Crop or Leaf Photo
                </h3>
                <p style={{ fontSize: '0.78rem', color: '#788A85', margin: 0 }}>
                  Supports JPG, PNG, WEBP up to 10MB. Take a clear close-up photo of foliage symptoms.
                </p>
              </div>
            )}
          </div>

          {/* Action Bar */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Optional crop hint (e.g. Tomato, Paddy, Maize)..."
              value={cropHint}
              onChange={e => setCropHint(e.target.value)}
              style={{
                flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 8,
                border: '1px solid #E6E4DC', background: '#FFFFFF',
                fontSize: '0.84rem', color: '#1C2826', outline: 'none'
              }}
            />
            <button
              onClick={handleAnalyzePhoto}
              disabled={!imagePreview || visionLoading}
              className="btn-accent"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                opacity: (!imagePreview || visionLoading) ? 0.6 : 1
              }}
            >
              {visionLoading ? (
                <>
                  <CircularProgress size={16} sx={{ color: '#fff' }} />
                  <span>Analyzing AI Vision...</span>
                </>
              ) : (
                <>
                  <span>🔍 Analyze Plant Health</span>
                </>
              )}
            </button>
          </div>

          {visionError && (
            <div style={{
              padding: '12px 16px', borderRadius: 8, background: '#FDF3F0',
              border: '1px solid #F8D2C6', color: '#C85A32', fontSize: '0.84rem'
            }}>
              ⚠️ {visionError}
            </div>
          )}

          {/* Vision Diagnosis Results Step Cards */}
          {visionResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }} className="fade-in">
              
              {visionResult.type === 'unclear_photo' ? (
                <div style={{
                  padding: 18, borderRadius: 10, background: '#FFF8E7',
                  border: '1px solid #FCE4B6', color: '#D97706'
                }}>
                  <h4 style={{ fontWeight: 800, fontSize: '0.95rem', margin: '0 0 6px' }}>
                    🔍 Unclear Photo Guidance
                  </h4>
                  <p style={{ fontSize: '0.82rem', margin: 0, lineHeight: 1.5 }}>
                    {visionResult.message || 'We could not confidently identify a crop or leaf disease from this photo. Please try uploading a sharp, well-lit photo of the leaf or plant, or describe your symptoms directly in the Advisory Chat.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Diagnosis Summary Header */}
                  <div style={{
                    padding: 16, borderRadius: 10, background: '#EBF4ED',
                    border: '1px solid #C8E6C9', display: 'flex',
                    justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10
                  }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#2E6F40', textTransform: 'uppercase' }}>
                        {visionResult.type === 'crop_identification' ? '🌱 Crop Identified' : '🍂 Disease / Pest Diagnosis'}
                      </span>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '2px 0', color: '#1C2826' }}>
                        {visionResult.title || 'Plant Diagnosis Result'}
                      </h3>
                      {visionResult.crop && (
                        <span style={{ fontSize: '0.78rem', color: '#4A5D58' }}>
                          Crop Host: <strong>{visionResult.crop}</strong> {visionResult.growthStage ? `• ${visionResult.growthStage}` : ''}
                        </span>
                      )}
                    </div>
                    <span style={{
                      background: '#FFFFFF', border: '1px solid #C8E6C9',
                      padding: '4px 12px', borderRadius: 20, fontSize: '0.78rem',
                      fontWeight: 800, color: '#2E6F40'
                    }}>
                      {Math.round((visionResult.confidence || 0.85) * 100)}% Confidence
                    </span>
                  </div>

                  {/* 4 Step Cards Reuse Pattern */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                    
                    {/* Step 1: Explanation */}
                    <div style={{
                      padding: 14, borderRadius: 10, background: '#FFFFFF',
                      border: '1px solid #E6E4DC'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#2E6F40', color: '#fff', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0, color: '#1C2826' }}>Symptoms & Explanation</h4>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#4A5D58', margin: 0, lineHeight: 1.5 }}>
                        {visionResult.description}
                      </p>
                    </div>

                    {/* Step 2: Cause & Environmental Triggers */}
                    <div style={{
                      padding: 14, borderRadius: 10, background: '#FFFFFF',
                      border: '1px solid #E6E4DC'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#D97706', color: '#fff', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>2</span>
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0, color: '#1C2826' }}>Cause & Spread Mechanism</h4>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: '#4A5D58', margin: 0, lineHeight: 1.5 }}>
                        {visionResult.cause || visionResult.idealConditions || 'Triggered by environmental micro-climate conditions.'}
                      </p>
                    </div>

                    {/* Step 3: Immediate Organic & Chemical Options */}
                    <div style={{
                      padding: 14, borderRadius: 10, background: '#FFFFFF',
                      border: '1px solid #E6E4DC'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#C85A32', color: '#fff', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>3</span>
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0, color: '#1C2826' }}>Immediate Treatment Steps</h4>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#4A5D58' }}>
                        <strong style={{ color: '#2E6F40' }}>🌿 Organic Options:</strong>
                        <ul style={{ paddingLeft: 16, margin: '2px 0 6px' }}>
                          {(visionResult.steps?.immediate_organic || ['Apply Neem oil 5ml/L']).map((s, idx) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                        {visionResult.steps?.chemical_options && (
                          <>
                            <strong style={{ color: '#C85A32' }}>🧪 Chemical Options:</strong>
                            <ul style={{ paddingLeft: 16, margin: '2px 0 0' }}>
                              {visionResult.steps.chemical_options.map((s, idx) => (
                                <li key={idx}>{s}</li>
                              ))}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Step 4: Future Season Prevention */}
                    <div style={{
                      padding: 14, borderRadius: 10, background: '#FFFFFF',
                      border: '1px solid #E6E4DC'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={{ width: 22, height: 22, borderRadius: '50%', background: '#2E6F40', color: '#fff', fontSize: '0.7rem', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>4</span>
                        <h4 style={{ fontSize: '0.88rem', fontWeight: 800, margin: 0, color: '#1C2826' }}>Future Season Prevention</h4>
                      </div>
                      <ul style={{ paddingLeft: 16, margin: 0, fontSize: '0.78rem', color: '#4A5D58' }}>
                        {(visionResult.steps?.future_prevention || ['Practice crop rotation and certified seed treatment']).map((s, idx) => (
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
