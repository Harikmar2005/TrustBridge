import React from 'react';
import { ShieldCheck, ShieldAlert, Radio, Globe, UserCheck, AlertTriangle, PlayCircle, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useDispute } from '../context/DisputeContext';
import { LanguageCode, UserRole } from '../types';
import { SUPPORTED_LANGUAGES, t } from '../lib/i18n';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  showDemoStepper: boolean;
  setShowDemoStepper: (show: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  showDemoStepper,
  setShowDemoStepper,
}) => {
  const { currentUser, allUsers, switchUser, switchRole, updateLanguage, nexconnConnected, nexconnDetail } = useAuth();
  const { fraudAlerts, disputes, resetDemoScenario } = useDispute();

  const lang = currentUser.preferredLanguage;
  const openDisputesCount = disputes.filter((d) => d.status !== 'RESOLVED').length;
  const criticalAlertsCount = fraudAlerts.filter((a) => a.severity === 'CRITICAL' && a.reviewStatus === 'NEW').length;

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <button
              onClick={() => setCurrentTab('landing')}
              className="flex items-center gap-2.5 text-left group focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-slate-900 tracking-tight text-lg">TRUSTBRIDGE</span>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 text-blue-700 rounded-md border border-blue-200">
                    2026
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium">{t('brandTagline', lang)}</p>
              </div>
            </button>

            {/* Nexconn Real-time Status Indicator with Provenance */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full border border-slate-200 text-xs">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    nexconnConnected
                      ? 'bg-emerald-400'
                      : nexconnDetail.state === 'CREDENTIALS_REQUIRED'
                      ? 'bg-amber-400'
                      : 'bg-slate-400'
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    nexconnConnected
                      ? 'bg-emerald-500'
                      : nexconnDetail.state === 'CREDENTIALS_REQUIRED'
                      ? 'bg-amber-500'
                      : 'bg-slate-500'
                  }`}
                />
              </span>
              <span className="font-semibold text-slate-700">Nexconn Chat SDK</span>
              <span className="text-slate-400">|</span>
              <span
                className={`font-medium ${
                  nexconnConnected
                    ? 'text-emerald-700'
                    : nexconnDetail.state === 'CREDENTIALS_REQUIRED'
                    ? 'text-amber-700'
                    : 'text-slate-600'
                }`}
                title={nexconnDetail.statusText}
              >
                {nexconnConnected
                  ? 'Connected (TLS)'
                  : nexconnDetail.state === 'CREDENTIALS_REQUIRED'
                  ? 'Creds Required (NEXCONN_APP_KEY)'
                  : nexconnDetail.statusText}
              </span>
            </div>
          </div>

          {/* Navigation Views */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setCurrentTab('buyer')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'buyer'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {t('buyerPortal', lang)}
            </button>
            <button
              onClick={() => setCurrentTab('seller')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                currentTab === 'seller'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {t('sellerPortal', lang)}
            </button>
            <button
              onClick={() => setCurrentTab('support')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                currentTab === 'support'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {t('supportAgent', lang)}
              {openDisputesCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold bg-amber-500 text-white rounded-full">
                  {openDisputesCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
                currentTab === 'admin'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {t('adminDashboard', lang)}
              {criticalAlertsCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 text-[10px] font-bold bg-red-600 text-white rounded-full">
                  {criticalAlertsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setCurrentTab('security')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                currentTab === 'security'
                  ? 'bg-gradient-to-r from-blue-700 to-indigo-700 text-white shadow-xs'
                  : 'text-slate-700 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-blue-500" />
              <span>AI Security Center</span>
            </button>
          </nav>

          {/* Right Controls: Language, Role Switcher, Demo Stepper */}
          <div className="flex items-center gap-3">
            {/* Preferred Language Picker: English 🇬🇧, Tamil 🇮🇳, Hindi 🇮🇳 */}
            <div className="relative flex items-center">
              <Globe className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 pointer-events-none" />
              <select
                aria-label="Select preferred language"
                value={currentUser.preferredLanguage}
                onChange={(e) => updateLanguage(e.target.value as LanguageCode)}
                className="pl-8 pr-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer shadow-xs"
              >
                <option value="en">English 🇬🇧</option>
                <option value="ta">தமிழ் (Tamil) 🇮🇳</option>
                <option value="hi">हिन्दी (Hindi) 🇮🇳</option>
              </select>
            </div>

            {/* Quick Demo Stepper Trigger */}
            <button
              onClick={() => setShowDemoStepper(!showDemoStepper)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                showDemoStepper
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{t('demoWalkthrough', lang)}</span>
            </button>

            {/* User & Role Switcher */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="relative group">
                <button
                  type="button"
                  className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <img
                    src={currentUser.avatar}
                    alt={currentUser.name}
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-blue-500/30"
                  />
                  <div className="hidden xl:block text-left">
                    <p className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</p>
                    <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{currentUser.role}</p>
                  </div>
                </button>

                {/* Dropdown to switch users directly */}
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 hidden group-hover:block hover:block z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Switch Persona</p>
                  </div>
                  {allUsers.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u.id);
                        setCurrentTab(u.role);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center gap-2.5 hover:bg-slate-50 transition-colors ${
                        currentUser.id === u.id ? 'bg-blue-50/60 font-semibold' : ''
                      }`}
                    >
                      <img src={u.avatar} alt={u.name} className="w-7 h-7 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-slate-900 truncate">{u.name}</p>
                        <p className="text-[10px] text-slate-500 capitalize">
                          {u.role} &bull; {u.preferredLanguage.toUpperCase()}
                        </p>
                      </div>
                      {currentUser.id === u.id && <span className="w-2 h-2 rounded-full bg-blue-600" />}
                    </button>
                  ))}
                  <div className="p-2 border-t border-slate-100">
                    <button
                      onClick={resetDemoScenario}
                      className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset Demo Database
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
