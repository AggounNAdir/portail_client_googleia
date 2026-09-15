import React, { useState, useEffect } from 'react';
import { Wallet, FileText, CheckCircle, Clock, RefreshCw, Layers } from 'lucide-react';
import { Facture, Versement, BonVente } from '../types';
import { clientService } from '../services/clientService';

type TabType = 'factures' | 'reglements' | 'ventes';

export const FinancesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('factures');
  const [factures, setFactures] = useState<Facture[]>([]);
  const [versements, setVersements] = useState<Versement[]>([]);
  const [ventes, setVentes] = useState<BonVente[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [f, r, v] = await Promise.all([
        clientService.getFactures(),
        clientService.getVersements(),
        clientService.getVentes(),
      ]);
      setFactures(f);
      setVersements(r);
      setVentes(v);
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-6 pb-20 md:pb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
            Finances & Règlements
          </h2>
          <p className="text-xs text-slate-500">
            Consultation de vos factures, versements et bons de vente
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-slate-200 pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('factures')}
          className={`rounded-xl px-4 py-2 transition-all ${
            activeTab === 'factures'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Factures ({factures.length})
        </button>
        <button
          onClick={() => setActiveTab('reglements')}
          className={`rounded-xl px-4 py-2 transition-all ${
            activeTab === 'reglements'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Règlements ({versements.length})
        </button>
        <button
          onClick={() => setActiveTab('ventes')}
          className={`rounded-xl px-4 py-2 transition-all ${
            activeTab === 'ventes'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Bons de Vente ({ventes.length})
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
          <p className="mt-3 text-sm font-medium">Chargement des écritures financières...</p>
        </div>
      ) : activeTab === 'factures' ? (
        <div className="space-y-3">
          {factures.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
              Aucune facture répertoriée
            </div>
          ) : (
            factures.map((fac) => (
              <div
                key={fac.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-800">
                      {fac.numero}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        fac.statut === 'Réglée'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {fac.statut || 'En attente'}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-slate-400">Émise le {fac.dateFacture}</div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-black text-slate-900">
                    {(fac.totalTTC ?? 0).toFixed(2)} € <span className="text-xs font-normal text-slate-500">TTC</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    HT: {(fac.totalHT ?? 0).toFixed(2)} € • TVA: {(fac.totalTVA ?? 0).toFixed(2)} €
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : activeTab === 'reglements' ? (
        <div className="space-y-3">
          {versements.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
              Aucun versement enregistré
            </div>
          ) : (
            versements.map((vers) => (
              <div
                key={vers.id}
                className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center"
              >
                <div>
                  <div className="font-mono text-xs font-bold text-slate-800">
                    {vers.numero}
                  </div>
                  <div className="mt-1 text-xs text-slate-600">
                    Mode : <span className="font-semibold">{vers.mode}</span>
                    {vers.reference && (
                      <span className="text-slate-400"> ({vers.reference})</span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-400">Reçu le {vers.dateVers}</div>
                </div>

                <div className="text-right">
                  <div className="text-base font-black text-teal-600">
                    +{(vers.montant ?? 0).toFixed(2)} €
                  </div>
                  <div className="text-[10px] font-bold text-teal-800">Validé</div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {ventes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 text-xs">
              Aucun bon de vente
            </div>
          ) : (
            ventes.map((bv) => (
              <div
                key={bv.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="font-mono text-xs font-bold text-slate-800">
                    {bv.numero}
                  </div>
                  <div className="text-sm font-black text-slate-900">
                    {(bv.total ?? 0).toFixed(2)} €
                  </div>
                </div>
                <div className="text-[11px] text-slate-400">Date : {bv.dateBon}</div>
                <div className="mt-2 text-xs text-slate-600">
                  {(bv.lignes || []).map((l) => (
                    <div key={l.id} className="flex justify-between py-0.5">
                      <span>• {l.designation} (x{l.quantite})</span>
                      <span className="font-medium">{(l.montant ?? 0).toFixed(2)} €</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
