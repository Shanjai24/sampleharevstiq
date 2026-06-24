import { useTranslation } from 'react-i18next';

const langs = [
  { code: 'en', label: 'EN', flag: '🇬🇧' },
  { code: 'hi', label: 'हि', flag: '🇮🇳' },
  { code: 'ta', label: 'த', flag: '🇮🇳' }
];

export default function LanguageToggle() {
  const { i18n } = useTranslation();

  return (
    <div style={{
      position: 'fixed', top: 12, right: 12, zIndex: 1100,
      display: 'flex', gap: 4,
      background: 'rgba(10, 15, 13, 0.9)',
      backdropFilter: 'blur(12px)',
      borderRadius: 20,
      padding: '3px',
      border: '1px solid rgba(34, 197, 94, 0.2)'
    }}>
      {langs.map(lang => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          style={{
            padding: '6px 10px',
            borderRadius: 16,
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.7rem',
            fontWeight: 600,
            transition: 'all 0.2s ease',
            background: i18n.language === lang.code ? '#16a34a' : 'transparent',
            color: i18n.language === lang.code ? '#fff' : '#81c784'
          }}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
}
