import { useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../context/FarmContext';
import LanguageToggle from './LanguageToggle';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import MapIcon from '@mui/icons-material/Map';
import GrassIcon from '@mui/icons-material/Grass';
import StoreIcon from '@mui/icons-material/Store';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HistoryIcon from '@mui/icons-material/History';

const navItems = [
  { path: '/', icon: <MapIcon sx={{ fontSize: 17 }} />, key: 'map', label: 'Map Analysis' },
  { path: '/dashboard', icon: <GrassIcon sx={{ fontSize: 17 }} />, key: 'crops', label: 'Dashboard' },
  { path: '/tasks', icon: <CalendarMonthIcon sx={{ fontSize: 17 }} />, key: 'tasks', label: 'Tasks' },
  { path: '/ledger', icon: <ReceiptLongIcon sx={{ fontSize: 17 }} />, key: 'ledger', label: 'Farm Ledger' },
  { path: '/chat', icon: <SmartToyIcon sx={{ fontSize: 17 }} />, key: 'chat', label: 'AI Advisory' },
  { path: '/market', icon: <StoreIcon sx={{ fontSize: 17 }} />, key: 'market', label: 'Mandi Market' },
  { path: '/sell-for-profit', icon: <MonetizationOnIcon sx={{ fontSize: 17 }} />, key: 'sell_profit', label: 'Sell For Profit' },
  { path: '/schemes-loans', icon: <AccountBalanceIcon sx={{ fontSize: 17 }} />, key: 'schemes', label: 'Schemes & Loans' },
  { path: '/weather', icon: <WbSunnyIcon sx={{ fontSize: 17 }} />, key: 'weather', label: 'Weather' },
  { path: '/history', icon: <HistoryIcon sx={{ fontSize: 17 }} />, key: 'history', label: 'History' }
];

const STATE_CODES = {
  'Tamil Nadu': 'TN', 'Maharashtra': 'MH', 'Madhya Pradesh': 'MP', 'Gujarat': 'GJ',
  'Uttar Pradesh': 'UP', 'Karnataka': 'KA', 'Andhra Pradesh': 'AP', 'Rajasthan': 'RJ',
  'Punjab': 'PB', 'Telangana': 'TG', 'Kerala': 'KL', 'Haryana': 'HR',
  'West Bengal': 'WB', 'Bihar': 'BR', 'Odisha': 'OR'
};

export default function Navbar() {
  const { farmData, location, sessionAnalyzed } = useContext(FarmContext);
  const navigate = useNavigate();
  const currentPath = useLocation().pathname;
  const { t } = useTranslation();

  const district = farmData?.location?.district;
  const stateName = farmData?.location?.state;
  const stateCode = STATE_CODES[stateName] || stateName;

  const showLocPill = sessionAnalyzed || currentPath !== '/';

  const locString = (showLocPill && district)
    ? `${district}, ${stateCode}`
    : (showLocPill && farmData?.location?.state)
      ? farmData.location.state
      : (showLocPill && location)
        ? 'Selected Plot'
        : null;

  const fullLocString = district ? `${district}, ${stateName}` : locString;
  const showNav = sessionAnalyzed || currentPath !== '/';

  return (
    <header className="sticky top-0 z-[1100] flex h-16 w-full items-center justify-between border-b border-border bg-surface px-5 sm:px-6 lg:px-8 shadow-subtle">
      
      {/* ── Left: AgroPredict Brand + Location Badge with Space ── */}
      <div className="flex shrink-0 items-center gap-3.5 lg:gap-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex shrink-0 cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-gradient-to-br from-primary to-primary-light text-lg shadow-[0_2px_8px_rgba(30,94,58,0.25)]">
            🌱
          </div>
          <div className="hidden sm:block">
            <h1 className="m-0 whitespace-nowrap text-lg font-extrabold leading-tight text-text-primary">
              AgroPredict
            </h1>
            <span className="block whitespace-nowrap text-[0.62rem] font-bold tracking-wide text-text-muted">
              Agricultural Intelligence Platform
            </span>
          </div>
        </button>

        {/* Location badge with comfortable radius & padding covering text */}
        {showNav && locString && (
          <div
            title={fullLocString}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '5px 14px',
              borderRadius: '9999px',
              backgroundColor: '#EAF5ED',
              border: '1.5px solid #C6E4CF',
              color: '#1E5E3A',
              fontSize: '0.78rem',
              fontWeight: 800,
              whiteSpace: 'nowrap',
              boxShadow: '0 1px 3px rgba(30,94,58,0.06)',
              flexShrink: 0
            }}
          >
            <span style={{ fontSize: '0.85rem' }}>📍</span>
            <span>{locString}</span>
          </div>
        )}
      </div>

      {/* ── Center: Safe Container for Nav with NO Overlap ── */}
      {showNav && (
        <div className="hidden-mobile flex flex-1 items-center justify-center min-w-0 px-2 lg:px-4">
          <nav
            className="flex items-center gap-1.5 lg:gap-2 max-w-full overflow-x-auto py-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {navItems.filter(item => item.key !== 'map').map(item => {
              const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    textDecoration: 'none',
                    fontSize: '0.8rem',
                    lineHeight: '1.2',
                    borderRadius: '9999px',
                    padding: isActive ? '6px 14px' : '6px 10px',
                    backgroundColor: isActive ? '#EAF5ED' : 'transparent',
                    border: isActive ? '1.5px solid #C6E4CF' : '1.5px solid transparent',
                    color: isActive ? '#1E5E3A' : '#4B5563',
                    fontWeight: isActive ? 800 : 600,
                    transition: 'all 0.15s ease',
                    boxShadow: isActive ? '0 1px 4px rgba(30,94,58,0.08)' : 'none'
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = '#F3F4F6';
                      e.currentTarget.style.color = '#182420';
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#4B5563';
                    }
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {item.icon}
                  </span>
                  <span>{t(`nav.${item.key}`) || item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      {/* ── Right: Telemetry Live Button & Language Section with Space from Right Edge ── */}
      <div className="flex shrink-0 items-center gap-3">
        <div
          className="hidden-mobile"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '7px',
            backgroundColor: '#EAF5ED',
            borderRadius: '9999px',
            padding: '5px 12px 5px 8px',
            whiteSpace: 'nowrap',
            border: '1.5px solid #C6E4CF',
            boxShadow: '0 1px 3px rgba(30,94,58,0.06)',
            flexShrink: 0
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '14px',
              height: '14px',
              borderRadius: '50%',
              backgroundColor: 'rgba(30, 94, 58, 0.2)'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#1E5E3A'
              }}
            />
          </span>
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: '#1E5E3A',
              letterSpacing: '-0.01em'
            }}
          >
            {t('common.engineActive', 'Telemetry Live')}
          </span>
        </div>
        <LanguageToggle />
      </div>

    </header>
  );
}