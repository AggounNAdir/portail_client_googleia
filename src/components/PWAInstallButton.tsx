import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA on the device, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow with automatic beforeinstallprompt
  if (isInstallable) {
    return (
      <button
        id="btn-pwa-install"
        onClick={install}
        className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
        title="Installer l'application sur votre téléphone ou PC"
      >
        <Download className="h-4 w-4" />
        <span className="text-[11px] font-bold sm:text-xs">Installer</span>
      </button>
    );
  }

  // iOS Safari flow (guided prompt)
  if (isIOS) {
    return (
      <>
        <button
          id="btn-pwa-install-ios"
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
          title="Installer sur iPhone / iPad"
        >
          <Smartphone className="h-4 w-4" />
          <span className="text-[11px] font-bold sm:text-xs">Installer</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                    <Smartphone className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Installer sur iPhone / iPad</h3>
                </div>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 space-y-3 text-sm text-slate-600">
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                    1
                  </span>
                  <p>
                    Touchez le bouton <strong>Partager</strong> en bas de Safari (icône de carré avec une flèche vers le haut).
                  </p>
                </div>
                <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                    2
                  </span>
                  <p>
                    Faites défiler vers le bas et sélectionnez <strong>Sur l'écran d'accueil</strong>.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
              >
                J'ai compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Bouton par défaut affichant la modale d'aide mobile si le prompt natif n'est pas encore prêt
  return (
    <>
      <button
        id="btn-pwa-install-generic"
        onClick={() => setShowIOSGuide(true)}
        className="flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100"
        title="Installer l'application sur votre appareil"
      >
        <Smartphone className="h-4 w-4" />
        <span className="text-[11px] font-bold sm:text-xs">Installer</span>
      </button>

      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                  <Smartphone className="h-4 w-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Installer sur votre téléphone</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <p className="text-xs text-slate-500">
                Cette application est une <strong>Progressive Web App (PWA)</strong> : elle s'installe directement depuis votre navigateur sans passer par le Play Store ou l'App Store, et fonctionne en plein écran hors-ligne.
              </p>
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                  Android
                </span>
                <p>
                  Ouvrez le menu de Chrome (les 3 points en haut à droite) et choisissez <strong>Installer l'application</strong> ou <strong>Ajouter à l'écran d'accueil</strong>.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700 text-xs">
                  iPhone
                </span>
                <p>
                  Dans Safari, touchez le bouton <strong>Partager</strong> puis <strong>Sur l'écran d'accueil</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-blue-600 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
};
