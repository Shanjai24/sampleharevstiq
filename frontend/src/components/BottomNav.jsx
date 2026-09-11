import { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../context/FarmContext';
import GrassIcon from '@mui/icons-material/Grass';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import StoreIcon from '@mui/icons-material/Store';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import HistoryIcon from '@mui/icons-material/History';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';

// The 4 always-visible primary tabs
const primaryTabs = [
  { path: '/dashboard', icon: <GrassIcon fontSize="small" />, key: 'crops', label: 'Dashboard' },
  { path: '/tasks',     icon: <CalendarMonthIcon fontSize="small" />, key: 'tasks', label: 'Tasks' },
  { path: '/chat',      icon: <SmartToyIcon fontSize="small" />, key: 'chat', label: 'AI Chat' },
  { path: '/ledger',    icon: <ReceiptLongIcon fontSize="small" />, key: 'ledger', label: 'Ledger' },
];

// Pages in the "More" bottom sheet
const moreTabs = [
  { path: '/market',        icon: <StoreIcon />,           label: 'Mandi Market' },
  { path: '/weather',       icon: <WbSunnyIcon />,         label: 'Weather' },
  { path: '/history',       icon: <HistoryIcon />,         label: 'History' },
  { path: '/schemes-loans', icon: <AccountBalanceIcon />,  label: 'Schemes & Loans' },
  { path: '/sell-for-profit', icon: <MonetizationOnIcon />, label: 'Sell For Profit' },
];

// Paths that count as "More" active (so the More tab highlights)
const morePaths = moreTabs.map(t => t.path);

export default function BottomNav() {
  const { sessionAnalyzed } = useContext(FarmContext) || {};
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetRef = useRef(null);

  // Close sheet on route change
  useEffect(() => { setSheetOpen(false); }, [location.pathname]);

  // Close sheet when clicking outside
  useEffect(() => {
    if (!sheetOpen) return;
    const handle = (e) => {
      if (sheetRef.current && !sheetRef.current.contains(e.target)) {
        setSheetOpen(false);
      }
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [sheetOpen]);

  if (location.pathname === '/' && !sessionAnalyzed) return null;

  const isMoreActive = morePaths.some(p => location.pathname === p || location.pathname.startsWith(p));

  return (
    <>
      {/* ── Backdrop ── */}
      {sheetOpen && (
        <div
          onClick={() => setSheetOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 998,
            background: 'rgba(0,0,0,0.38)',
            backdropFilter: 'blur(2px)',
            animation: 'fadeInBackdrop 0.18s ease'
          }}
        />
      )}

      {/* ── More Sheet ── */}
      <div
        ref={sheetRef}
        style={{
          position: 'fixed', left: 0, right: 0, bottom: sheetOpen ? 64 : -320,
          zIndex: 999,
          background: '#fff',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          boxShadow: '0 -8px 32px rgba(24,36,32,0.13)',
          padding: '12px 8px 8px',
          transition: 'bottom 0.28s cubic-bezier(0.34,1.1,0.64,1)',
          border: '1px solid #e5e7eb',
        }}
      >
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 10 }}>
          <div style={{ width: 36, height: 4, borderRadius: 9999, background: '#d1d5db' }} />
        </div>

        <p style={{ margin: '0 0 10px 12px', fontSize: '0.7rem', fontWeight: 800, letterSpacing: '0.06em', color: '#6b7280', textTransform: 'uppercase' }}>
          More pages
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
          {moreTabs.map(item => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path);
            return (
              <button
                key={item.path}
                id={`more-tab-${item.path.replace(/\//g, '').replace(/-/g, '_')}`}
                type="button"
                onClick={() => { navigate(item.path); setSheetOpen(false); }}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 5, padding: '10px 4px', borderRadius: 14, border: 'none',
                  background: isActive ? '#EAF5ED' : '#f9fafb',
                  color: isActive ? '#1E5E3A' : '#4b5563',
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.68rem', cursor: 'pointer',
                  boxShadow: isActive ? '0 1px 6px rgba(30,94,58,0.10)' : 'none',
                  transition: 'all 0.14s ease',
                }}
              >
                <span style={{ fontSize: 22, display: 'flex' }}>{item.icon}</span>
                <span style={{ lineHeight: 1.2, textAlign: 'center' }}>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Primary Bottom Bar ── */}
      <div
        className="mobile-bottom-nav"
        style={{
          position: 'fixed', right: 0, bottom: 0, left: 0, zIndex: 1000,
          display: 'flex', height: 64, alignItems: 'stretch',
          borderTop: '1px solid #e5e7eb',
          background: '#fff',
          boxShadow: '0 -4px 16px rgba(24,36,32,0.05)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {primaryTabs.map(item => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <button
              key={item.key}
              id={`bottom-tab-${item.key}`}
              type="button"
              onClick={() => { setSheetOpen(false); navigate(item.path); }}
              style={{
                flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                gap: 3, border: 'none', background: 'transparent', cursor: 'pointer',
                color: isActive ? '#1E5E3A' : '#9ca3af',
                transition: 'color 0.14s ease',
                position: 'relative',
              }}
            >
              {isActive && (
                <span style={{
                  position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                  width: 28, height: 3, borderRadius: '0 0 4px 4px', background: '#2E6F40'
                }} />
              )}
              <span style={{ transform: isActive ? 'scale(1.15)' : 'scale(1)', transition: 'transform 0.14s ease', display: 'flex' }}>
                {item.icon}
              </span>
              <span style={{ fontSize: '0.64rem', fontWeight: isActive ? 800 : 600, lineHeight: 1 }}>
                {t(`nav.${item.key}`) || item.label}
              </span>
            </button>
          );
        })}

        {/* More tab */}
        <button
          id="bottom-tab-more"
          type="button"
          onClick={() => setSheetOpen(s => !s)}
          style={{
            flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: 3, border: 'none', background: 'transparent', cursor: 'pointer',
            color: isMoreActive || sheetOpen ? '#1E5E3A' : '#9ca3af',
            transition: 'color 0.14s ease',
            position: 'relative',
          }}
        >
          {(isMoreActive || sheetOpen) && (
            <span style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 28, height: 3, borderRadius: '0 0 4px 4px', background: '#2E6F40'
            }} />
          )}
          <span style={{
            transform: sheetOpen ? 'rotate(45deg) scale(1.15)' : 'scale(1)',
            transition: 'transform 0.2s cubic-bezier(0.34,1.1,0.64,1)',
            display: 'flex'
          }}>
            <MoreHorizIcon fontSize="small" />
          </span>
          <span style={{ fontSize: '0.64rem', fontWeight: isMoreActive || sheetOpen ? 800 : 600, lineHeight: 1 }}>
            More
          </span>
        </button>
      </div>

      <style>{`
        @keyframes fadeInBackdrop { from { opacity: 0 } to { opacity: 1 } }
      `}</style>
    </>
  );
}
