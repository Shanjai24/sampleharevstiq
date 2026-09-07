import { useContext } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FarmContext } from '../context/FarmContext';
import LanguageToggle from './LanguageToggle';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import HistoryIcon from '@mui/icons-material/History';
import MapIcon from '@mui/icons-material/Map';
import GrassIcon from '@mui/icons-material/Grass';
import StoreIcon from '@mui/icons-material/Store';
import WbSunnyIcon from '@mui/icons-material/WbSunny';
import SmartToyIcon from '@mui/icons-material/SmartToy';

const navItems = [
  { path: '/', icon: <MapIcon fontSize="small" />, key: 'map', label: 'Map Analysis' },
  { path: '/dashboard', icon: <GrassIcon fontSize="small" />, key: 'crops', label: 'Dashboard' },
  { path: '/chat', icon: <SmartToyIcon fontSize="small" />, key: 'chat', label: 'AI Advisory' },
  { path: '/market', icon: <StoreIcon fontSize="small" />, key: 'market', label: 'Mandi Market' },
  { path: '/sell-for-profit', icon: <MonetizationOnIcon fontSize="small" />, key: 'sell_profit', label: 'Sell For Profit' },
  { path: '/schemes-loans', icon: <AccountBalanceIcon fontSize="small" />, key: 'schemes', label: 'Schemes & Loans' },
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
  const { farmData, location, sessionAnalyzed } = useContext(FarmContext);
  const navigate = useNavigate();
  const currentPath = useLocation().pathname;
  const { t } = useTranslation();

  const district = farmData?.location?.district;
  const stateName = farmData?.location?.state;
  const stateCode = STATE_CODES[stateName] || stateName;

  // Only display location pill if an analysis has been executed or user is navigating farm details
  const showLocPill = sessionAnalyzed || currentPath !== '/';

  const locString = (showLocPill && district)
    ? `${district}, ${stateCode}`
    : (showLocPill && farmData?.location?.state)
      ? farmData.location.state
      : (showLocPill && location)
        ? 'Selected Plot'
        : null;

  const fullLocString = district ? `${district}, ${stateName}` : locString;

  return (
    <header className="app-navbar sticky top-0 z-[1100] flex h-16 items-center justify-between border-b border-border bg-surface px-6 shadow-subtle">
      <div className="navbar-brand flex shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0"
        >
          <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[11px] bg-gradient-to-br from-primary to-primary-light text-xl shadow-[0_2px_8px_rgba(30,94,58,0.25)]">
            🌱
          </div>
          <div>
            <h1 className="m-0 whitespace-nowrap text-xl font-extrabold leading-tight text-text-primary">
              AgroPredict
            </h1>
            <span className="whitespace-nowrap text-[0.64rem] font-bold tracking-wide text-text-muted">
              Agricultural Intelligence Platform
            </span>
          </div>
        </button>

        {locString && (
          <div
            title={fullLocString}
            className="navbar-location flex cursor-default items-center gap-1.5 whitespace-nowrap rounded-full border border-primary-border bg-primary-soft px-3 py-1 text-xs font-extrabold text-primary"
          >
            <span>📍</span>
            <span className="overflow-hidden text-ellipsis whitespace-nowrap">{locString}</span>
          </div>
        )}
      </div>

      <nav className="navbar-links hidden-mobile nav-scroll-container flex max-w-full flex-nowrap items-center gap-0.5 overflow-x-auto py-0.5">
        {navItems.map(item => {
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          return (
            <Link
              key={item.key}
              to={item.path}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[0.82rem] no-underline transition-all duration-150 ${
                isActive
                  ? 'border border-primary-border bg-primary-soft font-extrabold text-primary'
                  : 'border border-transparent font-semibold text-text-secondary'
              }`}
            >
              {item.icon}
              <span className="whitespace-nowrap">{t(`nav.${item.key}`) || item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="navbar-actions flex items-center gap-3">
        <div className="hidden-mobile flex items-center gap-1.5 rounded-full border border-primary-border bg-primary-soft px-2.5 py-1 text-[0.7rem] font-extrabold text-primary">
          <span className="badge-live-dot h-1.5 w-1.5" />
          <span>{t('common.engineActive', 'Telemetry Live')}</span>
        </div>
        <LanguageToggle />
      </div>
    </header>
  );
}
