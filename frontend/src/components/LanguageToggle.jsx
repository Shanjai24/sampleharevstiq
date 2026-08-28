import { useTranslation } from 'react-i18next';

const langs = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'hi', label: 'हिंदी', short: 'हि' },
  { code: 'ta', label: 'தமிழ்', short: 'த' }
];

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  const currentLang = (i18n.language || 'en').split('-')[0].toLowerCase();

  const handleSelectLang = (code) => {
    i18n.changeLanguage(code);
    try {
      localStorage.setItem('i18nextLng', code);
    } catch (e) {}
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 3,
      background: 'rgba(14, 23, 19, 0.85)',
      backdropFilter: 'blur(12px)',
      borderRadius: 20,
      padding: '3px',
      border: '1px solid rgba(46, 111, 64, 0.2)'
    }}>
      {langs.map(lang => {
        const isActive = currentLang === lang.code;
        return (
          <button
            key={lang.code}
            onClick={() => handleSelectLang(lang.code)}
            title={lang.label}
            style={{
              padding: '4px 10px',
              borderRadius: 16,
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: 700,
              transition: 'all 0.2s ease',
              background: isActive ? 'linear-gradient(135deg, #2E6F40, #1E4A2A)' : 'transparent',
              color: isActive ? '#ffffff' : '#788A85',
              boxShadow: isActive ? '0 2px 8px rgba(46, 111, 64, 0.3)' : 'none'
            }}
          >
            {lang.short}
          </button>
        );
      })}
    </div>
  );
}
