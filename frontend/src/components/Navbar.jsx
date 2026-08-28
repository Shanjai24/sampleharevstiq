import { useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../App';
import LanguageToggle from './LanguageToggle';
import MapIcon from '@mui/icons-material/Map';
import GrassIcon from '@mui/icons-material/Grass';
import StoreIcon from '@mui/icons-material/Store';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import HistoryIcon from '@mui/icons-material/History';
import WaterDropIcon from '@mui/icons-material/WaterDrop';

const navItems = [
  { path: '/', icon: <MapIcon fontSize="small" />, key: 'map', label: 'Map Analysis' },
  { path: '/dashboard', icon: <GrassIcon fontSize="small" />, key: 'crops', label: 'Dashboard' },
  { path: '/borewell', icon: <WaterDropIcon fontSize="small" />, key: 'borewell', label: 'Groundwater' },
  { path: '/chat', icon: <SmartToyIcon fontSize="small" />, key: 'chat', label: 'AI Advisory' },
  { path: '/market', icon: <StoreIcon fontSize="small" />, key: 'market', label: 'Mandi Market' },
  { path: '/weather', icon: <WbSunnyIcon fontSize="small" />, key: 'weather', label: 'Weather' },
  { path: '/history', icon: <HistoryIcon fontSize="small" />, key: 'history', label: 'Saved Plots' }
];

const STATE_CODES = {
  'Tamil Nadu': 'TN', 'Maharashtra': 'MH', 'Madhya Pradesh': 'MP', 'Gujarat': 'GJ',
  'Uttar Pradesh': 'UP', 'Karnataka': 'KA', 'Andhra Pradesh': 'AP', 'Rajasthan': 'RJ',
  'Punjab': 'PB', 'Telangana': 'TG', 'Kerala': 'KL', 'Haryana': 'HR',
  'West Bengal': 'WB', 'Bihar': 'BR', 'Odisha': 'OR'
};

export default function Navbar() {
  const { farmData, location } = useContext(FarmContext);
  const navigate = useNavigate();
  const currentPath = useLocation().pathname;
  const { t } = useTranslation();

  const district = farmData?.location?.district;
  const stateName = farmData?.location?.state;
  const stateCode = STATE_CODES[stateName] || stateName;

  const locString = district 
    ? `${district}, ${stateCode}`
    : location 
      ? `${location.lat?.toFixed(2)}, ${location.lng?.toFixed(2)}`
      : null;

  const fullLocString = district ? `${district}, ${stateName}` : locString;

  return (
    <header style={{
      height: 64,
      background: '#FFFFFF',
      borderBottom: '1px solid #E5E2D8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 1100,
      boxShadow: 'var(--shadow-subtle)'
    }}>
      {/* Brand logo & location badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div 
          onClick={() => navigate('/')} 
          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'linear-gradient(135deg, #1E5E3A, #2E7D4E)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.25rem',
            boxShadow: '0 2px 8px rgba(30, 94, 58, 0.25)'
          }}>
            🌱
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, lineHeight: 1.1, whiteSpace: 'nowrap', color: '#182420' }}>
              AgroPredict
            </h1>
            <span style={{ fontSize: '0.64rem', color: '#748782', letterSpacing: '0.02em', fontWeight: 700, whiteSpace: 'nowrap' }}>
              Agricultural Intelligence Platform
            </span>
          </div>
        </div>

        {/* Location Indicator Pill */}
        {locString && (
          <div
            title={fullLocString}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: '#EBF5ED',
              border: '1px solid #C6E4CF',
              padding: '4px 12px', borderRadius: 20,
              fontSize: '0.74rem', color: '#1E5E3A', fontWeight: 800,
              whiteSpace: 'nowrap', maxWidth: 220, cursor: 'default'
            }}
          >
            <span>📍</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{locString}</span>
          </div>
        )}
      </div>

      {/* Desktop Navigation Links */}
      <nav className="hidden-mobile nav-scroll-container" style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        flexWrap: 'nowrap',
        overflowX: 'auto',
        maxWidth: '100%',
        padding: '2px 0'
      }}>
        {navItems.map(item => {
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          return (
            <Link
              key={item.key}
              to={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 13px',
                borderRadius: 9,
                textDecoration: 'none',
                fontSize: '0.84rem',
                fontWeight: isActive ? 800 : 600,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s ease',
                background: isActive ? '#EBF5ED' : 'transparent',
                color: isActive ? '#1E5E3A' : '#485954',
                border: isActive ? '1px solid #C6E4CF' : '1px solid transparent'
              }}
            >
              {item.icon}
              <span style={{ whiteSpace: 'nowrap' }}>{t(`nav.${item.key}`) || item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="hidden-mobile" style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: '#EBF5ED',
          border: '1px solid #C6E4CF',
          padding: '4px 11px', borderRadius: 20,
          fontSize: '0.7rem', color: '#1E5E3A', fontWeight: 800
        }}>
          <span className="badge-live-dot" style={{ width: 6, height: 6 }} />
          <span>{t('common.engineActive', 'Telemetry Live')}</span>
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}
