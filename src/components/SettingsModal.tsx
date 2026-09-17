import React, { useState } from 'react';
import { Settings, Server, Check, X, RefreshCw, Activity, AlertTriangle } from 'lucide-react';
import { apiClient, DEFAULT_API_BASE_URL } from '../services/apiClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [url, setUrl] = useState(apiClient.getBaseUrl());
  const [savedMessage, setSavedMessage] = useState(false);
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'failed'>('idle');
  const [testError, setTestError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestError(null);
    try {
      const cleanUrl = url.trim().replace(/\/+$/, '');
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      
      const res = await fetch(`${cleanUrl}/docs`, {
        method: 'GET',
        signal: controller.signal,
        mode: 'no-cors', // Permet de tester si le serveur répond sur le port
      });
      clearTimeout(timeout);
      setTestStatus('success');
    } catch (err: any) {
      setTestStatus('failed');
      setTestError(err.name === 'AbortError' ? 'Délai d\'attente dépassé (4s)' : 'Impossible de contacter le serveur. Vérifiez l\'IP, le port et le pare-feu.');
    }
  };

  const handleSave = () => {
    apiClient.setBaseUrl(url);
    setSavedMessage(true);
    setTimeout(() => {
      setSavedMessage(false);
      onClose();
    }, 800);
  };

  const handleReset = () => {
    setUrl(DEFAULT_API_BASE_URL);
    setTestStatus('idle');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-slate-800">
            <Settings className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold">Paramètres de Connexion API</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-slate-600">
              Adresse IP / URL Serveur FastAPI
            </label>
            <div className="relative">
              <Server className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setTestStatus('idle');
                }}
                placeholder="ex: http://192.168.1.70:8000"
                className="w-full rounded-xl border border-slate-300 py-2.5 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
              />
            </div>
            
            <div className="mt-2 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={testStatus === 'testing'}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                <Activity className={`h-3.5 w-3.5 ${testStatus === 'testing' ? 'animate-spin text-blue-600' : 'text-slate-500'}`} />
                {testStatus === 'testing' ? 'Test en cours...' : 'Tester la connexion'}
              </button>
              
              {testStatus === 'success' && (
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-600">
                  <Check className="h-4 w-4" /> Serveur accessible !
                </span>
              )}
              {testStatus === 'failed' && (
                <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                  <AlertTriangle className="h-4 w-4" /> Échec connexion
                </span>
              )}
            </div>

            {testError && (
              <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
                {testError}
              </p>
            )}
            
            <p className="mt-2 text-xs text-slate-500">
              Exemples : <br />
              • Sur le même PC : <code className="font-mono text-blue-600">http://localhost:8000</code><br />
              • Depuis votre téléphone : <code className="font-mono text-blue-600">http://192.168.1.XX:8000</code>
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Important :</span> Assurez-vous que FastAPI a le middleware <strong>CORSMiddleware</strong> activé pour autoriser les requêtes web.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Par défaut
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
            >
              {savedMessage ? (
                <>
                  <Check className="h-4 w-4" /> Enregistré
                </>
              ) : (
                'Enregistrer'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
