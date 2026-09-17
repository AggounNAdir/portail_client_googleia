import React, { useState } from 'react';
import {
  Package,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  Server,
  Briefcase,
  Sparkles,
  Info,
} from 'lucide-react';
import { authService } from '../services/authService';
import { vendeurAuthService } from '../services/vendeurAuthService';
import { apiClient } from '../services/apiClient';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { SettingsModal } from '../components/SettingsModal';

export type UserRole = 'client' | 'vendeur';

interface LoginPageProps {
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [authMode, setAuthMode] = useState<UserRole>('client');
  const [identifiant, setIdentifiant] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const handleSwitchMode = (mode: UserRole) => {
    setAuthMode(mode);
    setErrorMessage(null);
    setIdentifiant('');
    setPassword('');
  };

  const isVendeurLikeCode =
    authMode === 'client' &&
    (identifiant.toUpperCase().startsWith('VND') ||
      identifiant.toUpperCase().startsWith('V-') ||
      identifiant.toUpperCase().startsWith('COMM') ||
      identifiant.toUpperCase().startsWith('VENDEUR'));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifiant.trim();

    if (!cleanId) {
      setErrorMessage(
        authMode === 'client'
          ? 'Veuillez saisir votre code client'
          : 'Veuillez saisir votre code vendeur'
      );
      return;
    }
    if (!password) {
      setErrorMessage('Veuillez saisir votre mot de passe');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (authMode === 'vendeur') {
        // Authentification VENDEUR / COMMERCIAL -> POST /auth/login-vendeur
        await vendeurAuthService.login(cleanId, password);
        onLoginSuccess('vendeur');
      } else {
        // Authentification CLIENT -> POST /auth/login
        await authService.login(cleanId, password);
        onLoginSuccess('client');
      }
    } catch (err: any) {
      setErrorMessage(
        err.message ||
          (authMode === 'vendeur'
            ? 'Code vendeur ou mot de passe incorrect'
            : 'Code client ou mot de passe incorrect')
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setErrorMessage(null);
    if (authMode === 'vendeur') {
      vendeurAuthService.loginAsDemo(identifiant || 'VND-001');
      onLoginSuccess('vendeur');
    } else {
      authService.loginAsDemo(identifiant || 'CLT-0001');
      onLoginSuccess('client');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4 sm:p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-10 relative">
        <div className="absolute top-4 right-4">
          <PWAInstallButton />
        </div>

        <div className="text-center">
          <div
            className={`mx-auto flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lg transition-colors ${
              authMode === 'vendeur'
                ? 'bg-amber-600 shadow-amber-500/20'
                : 'bg-blue-600 shadow-blue-500/20'
            }`}
          >
            {authMode === 'vendeur' ? (
              <Briefcase className="h-8 w-8" />
            ) : (
              <Package className="h-9 w-9" />
            )}
          </div>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {authMode === 'vendeur' ? 'Espace Vendeur' : 'Portail Client'}
          </h1>
          <p className="mt-1 text-xs text-slate-500 sm:text-sm">
            {authMode === 'vendeur'
              ? 'Silwane Androway • Tournée terrain & Caisse POS'
              : 'Consultez vos tarifs, passez commande et suivez vos factures'}
          </p>
        </div>

        {/* Sélecteur de rôle Client / Vendeur */}
        <div className="mt-6 flex rounded-2xl bg-slate-100 p-1 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => handleSwitchMode('client')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 transition-all ${
              authMode === 'client'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'hover:text-slate-900 text-slate-500'
            }`}
          >
            <User className="h-3.5 w-3.5" />
            <span>Portail Client</span>
          </button>
          <button
            type="button"
            onClick={() => handleSwitchMode('vendeur')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 transition-all ${
              authMode === 'vendeur'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'hover:text-slate-900 text-slate-500'
            }`}
          >
            <Briefcase className="h-3.5 w-3.5" />
            <span>Commercial / Vendeur</span>
          </button>
        </div>

        {/* Alerte détection code vendeur saisi par erreur dans l'onglet Client */}
        {isVendeurLikeCode && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <span>Vous semblez utiliser un identifiant vendeur. </span>
              <button
                type="button"
                onClick={() => handleSwitchMode('vendeur')}
                className="font-bold underline hover:text-amber-950"
              >
                Basculez sur l'onglet Vendeur ici
              </button>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed">{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {authMode === 'vendeur' ? 'Code Vendeur (Silwane)' : 'Code Client'}
            </label>
            <div className="relative">
              {authMode === 'vendeur' ? (
                <Briefcase className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              ) : (
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              )}
              <input
                type="text"
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                placeholder={authMode === 'vendeur' ? 'Ex: VND-001 ou COMMERCIAL-1' : 'Ex: CLT-0001'}
                required
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-3 text-sm transition-colors focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full rounded-xl border border-slate-300 py-3 pl-10 pr-10 text-sm transition-colors focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold text-white shadow-md transition-all disabled:opacity-70 ${
              authMode === 'vendeur'
                ? 'bg-amber-600 shadow-amber-600/20 hover:bg-amber-700'
                : 'bg-blue-600 shadow-blue-600/20 hover:bg-blue-700'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              <>
                Se connecter {authMode === 'vendeur' ? 'comme Vendeur' : 'comme Client'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* Option Connexion Hors-ligne / Démo */}
        <div className="mt-4">
          <button
            type="button"
            onClick={handleDemoLogin}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-500" />
            <span>Tester en mode Démo / Hors-ligne ({authMode === 'vendeur' ? 'Vendeur' : 'Client'})</span>
          </button>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition"
          >
            <Server className="h-3.5 w-3.5 text-blue-600" />
            <span>Serveur API :</span>
            <span className="font-mono text-[11px] text-blue-700">{apiClient.getBaseUrl()}</span>
          </button>
          <p className="text-[11px] text-slate-400 text-center">
            {authMode === 'vendeur' ? (
              <>
                Authentification Vendeur / Commercial • Route API : <span className="font-mono font-semibold text-slate-600">/auth/login-vendeur</span>
              </>
            ) : (
              <>
                Authentification Client • Route API : <span className="font-mono font-semibold text-slate-600">/auth/login</span>
              </>
            )}
          </p>
        </div>

        <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
      </div>
    </div>
  );
};
