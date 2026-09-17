import React, { useState, useEffect } from 'react';
import { Package, Cloud, CloudOff, RefreshCw, Settings, LogOut, Briefcase, User } from 'lucide-react';
import { androwaySyncService } from '../services/androwaySyncService';
import { SettingsModal } from './SettingsModal';
import { PWAInstallButton } from './PWAInstallButton';

interface HeaderProps {
  title: string;
  onLogout: () => void;
  subtitle?: string;
  showSyncBadge?: boolean;
  userRole?: 'client' | 'vendeur' | null;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onLogout,
  subtitle,
  showSyncBadge = true,
  userRole,
}) => {
  const [pendingCount, setPendingCount] = useState(androwaySyncService.getPendingCount());
  const [isSyncing, setIsSyncing] = useState(androwaySyncService.getIsSyncing());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const unsub = androwaySyncService.subscribe((_queue, syncing) => {
      setPendingCount(androwaySyncService.getPendingCount());
      setIsSyncing(syncing);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsub();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSyncClick = async () => {
    await androwaySyncService.syncAllPending();
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/95 px-4 py-3 shadow-xs backdrop-blur-xs sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-xs">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 sm:text-xl">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          <PWAInstallButton />

          {userRole && (
            <div
              className={`hidden sm:inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                userRole === 'vendeur'
                  ? 'bg-amber-50 text-amber-800 border border-amber-200'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}
            >
              {userRole === 'vendeur' ? (
                <>
                  <Briefcase className="h-3.5 w-3.5 text-amber-600" />
                  <span>Commercial / Vendeur</span>
                </>
              ) : (
                <>
                  <User className="h-3.5 w-3.5 text-blue-600" />
                  <span>Client</span>
                </>
              )}
            </div>
          )}

          {showSyncBadge && (
            <button
              onClick={handleSyncClick}
              title="Synchronisation hors-ligne"
              className="relative inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100"
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              ) : isOnline ? (
                <Cloud className="h-4 w-4 text-teal-600" />
              ) : (
                <CloudOff className="h-4 w-4 text-amber-600" />
              )}
              <span className="hidden sm:inline">
                {isSyncing ? 'Sync en cours...' : isOnline ? 'En ligne' : 'Hors-ligne'}
              </span>
              {pendingCount > 0 && (
                <span className="ml-0.5 rounded-full bg-amber-500 px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {pendingCount}
                </span>
              )}
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Paramètres de l'API"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <Settings className="h-5 w-5" />
          </button>

          <button
            onClick={onLogout}
            title="Se déconnecter"
            className="flex items-center gap-1 rounded-xl p-2 text-red-500 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden text-xs font-medium md:inline">Quitter</span>
          </button>
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  );
};
