import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const langs = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिंदी', short: 'HI' },
  { code: 'ta', label: 'தமிழ்', short: 'TA' }
];

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentLangCode = (i18n.language || 'en').split('-')[0].toLowerCase();
  const currentLang = langs.find(l => l.code === currentLangCode) || langs[0];

  const handleSelectLang = (code) => {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem('i18nextLng', code);
    } catch { /* localStorage unavailable */ }
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          backgroundColor: '#10251A',
          borderRadius: '9999px',
          padding: '3px 12px 3px 4px',
          border: 'none',
          cursor: 'pointer',
          outline: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
          transition: 'background-color 0.15s ease'
        }}
        aria-label="Select language"
      >
        <span style={{
          backgroundColor: '#176B3B',
          color: '#FFFFFF',
          borderRadius: '9999px',
          padding: '3px 10px',
          fontSize: '0.8rem',
          fontWeight: 800,
          letterSpacing: '0.02em',
          lineHeight: 1.2
        }}>
          {currentLang.short}
        </span>
        <svg
          style={{
            width: '11px',
            height: '11px',
            color: '#FFFFFF',
            transform: isOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s ease',
            flexShrink: 0
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: 'calc(100% + 6px)',
          backgroundColor: '#10251A',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '14px',
          padding: '4px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          zIndex: 1200,
          minWidth: '120px',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          {langs.map(l => {
            const isSelected = l.code === currentLang.code;
            return (
              <button
                key={l.code}
                type="button"
                onClick={() => handleSelectLang(l.code)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isSelected ? 'rgba(23, 107, 59, 0.4)' : 'transparent',
                  color: isSelected ? '#FFFFFF' : '#94A3B8',
                  fontSize: '0.8rem',
                  fontWeight: isSelected ? 700 : 500,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s ease'
                }}
              >
                <span>{l.label}</span>
                <span style={{ fontSize: '0.72rem', opacity: 0.8, fontWeight: 700 }}>{l.short}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
